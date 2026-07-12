const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

// CREAR FACTURA
router.post("/", validarToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { cliente_id, productos, forma_pago = "EFECTIVO" } = req.body;

    const formasPermitidas = ["EFECTIVO", "TARJETA", "TRANSFERENCIA"];

    if (!formasPermitidas.includes(forma_pago)) {
      throw new Error("Forma de pago inválida.");
    }

    // Buscar caja abierta
    const caja = await client.query(
      `
      SELECT id
      FROM cajas
      WHERE usuario_id = $1
      AND estado = 'ABIERTA'
      LIMIT 1
      `,
      [req.usuario.id],
    );

    if (caja.rows.length === 0) {
      throw new Error("Debe abrir una caja antes de facturar.");
    }

    const cajaId = caja.rows[0].id;

    let total = 0;

    for (const item of productos) {
      // ===========================
      // SERVICIO
      // ===========================

      if (item.tipo === "SERVICIO") {
        const precio = Number(item.precio);
        const costo = Number(item.costo || 0);
        const descuento = Number(item.descuento || 0);

        if (Number.isNaN(precio)) throw new Error("Precio inválido.");

        total += precio * Number(item.cantidad) - descuento;

        continue;
      }

      // ===========================
      // PRODUCTO
      // ===========================

      const producto = await client.query(
        `
    SELECT *
    FROM productos
    WHERE id = $1
    `,
        [item.producto_id],
      );

      if (producto.rows.length === 0) throw new Error("Producto no encontrado");

      if (
        producto.rows[0].tipo === "PRODUCTO" &&
        Number(producto.rows[0].stock) < Number(item.cantidad)
      ) {
        throw new Error(`Stock insuficiente para ${producto.rows[0].nombre}`);
      }

      const precio = Number(producto.rows[0].precio_venta);
      const descuento = Number(item.descuento || 0);

      total += precio * Number(item.cantidad) - descuento;
    }

    console.log("================================");
    console.log("Productos:", productos);
    console.log("Total calculado:", total);
    console.log("Tipo de total:", typeof total);
    console.log("¿Es NaN?", Number.isNaN(total));
    console.log("================================");

    if (Number.isNaN(total)) {
      throw new Error("No fue posible calcular el total de la factura.");
    }

    if (total < 0) {
      throw new Error("El total de la factura no puede ser negativo.");
    }

    const facturaResult = await client.query(
      `
      
      INSERT INTO facturas
      (
        cliente_id,
        fecha,
        total,
        caja_id,
        forma_pago
      )
      VALUES
      (
        $1,
        NOW(),
        $2,
        $3,
        $4
      )
      RETURNING id
      `,
      [cliente_id, total, cajaId, forma_pago],
    );

    const facturaId = facturaResult.rows[0].id;

    for (const item of productos) {
      // ====================================
      // SERVICIO
      // ====================================

      if (item.tipo === "SERVICIO") {
        await client.query(
          `
      INSERT INTO factura_detalle
      (
        factura_id,
        producto_id,
        cantidad,
        precio,
        descuento,
        es_servicio,
        descripcion_manual,
        costo_manual
      )
      VALUES
      (
        $1,
        NULL,
        $2,
        $3,
        $4,
        TRUE,
        $5,
        $6
      )
      `,
          [
            facturaId,
            item.cantidad,
            Number(item.precio),
            Number(item.descuento || 0),
            item.descripcion,
            Number(item.costo || 0),
          ],
        );

        continue;
      }

      // ====================================
      // PRODUCTO
      // ====================================

      const producto = await client.query(
        `
    SELECT *
    FROM productos
    WHERE id = $1
    `,
        [item.producto_id],
      );

      const precio = Number(producto.rows[0].precio_venta);

      if (Number.isNaN(precio)) {
        throw new Error(
          `Precio inválido para el producto "${producto.rows[0].nombre}".`,
        );
      }

      await client.query(
        `
    INSERT INTO factura_detalle
    (
      factura_id,
      producto_id,
      cantidad,
      precio,
      descuento
    )
    VALUES ($1,$2,$3,$4,$5)
    `,
        [
          facturaId,
          item.producto_id,
          item.cantidad,
          precio,
          Number(item.descuento || 0),
        ],
      );

      if (producto.rows[0].tipo === "PRODUCTO") {
        await client.query(
          `
      UPDATE productos
      SET stock = stock - $1
      WHERE id = $2
      `,
          [item.cantidad, item.producto_id],
        );
      }
    }

    // Actualizar caja según forma de pago
    switch (forma_pago) {
      case "EFECTIVO":
        await client.query(
          `
          UPDATE cajas
          SET efectivo = efectivo + $1
          WHERE id = $2
          `,
          [total, cajaId],
        );
        break;

      case "TARJETA":
        await client.query(
          `
          UPDATE cajas
          SET tarjeta = tarjeta + $1
          WHERE id = $2
          `,
          [total, cajaId],
        );
        break;

      case "TRANSFERENCIA":
        await client.query(
          `
          UPDATE cajas
          SET transferencia = transferencia + $1
          WHERE id = $2
          `,
          [total, cajaId],
        );
        break;
    }

    await client.query("COMMIT");

    res.status(201).json({
      factura_id: facturaId,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      mensaje: error.message,
    });
  } finally {
    client.release();
  }
});

// OBTENER FACTURAS
router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        f.id,
        f.fecha,
        f.total,
        c.nombre AS cliente
      FROM facturas f
      INNER JOIN clientes c
        ON c.id = f.cliente_id
      ORDER BY f.id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener facturas",
    });
  }
});

router.get("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const facturaResult = await pool.query(
      `
      SELECT
        f.id,
        f.fecha,
        f.total,
        c.nombre AS cliente
      FROM facturas f
      INNER JOIN clientes c
        ON c.id = f.cliente_id
      WHERE f.id = $1
      `,
      [id],
    );

    if (facturaResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Factura no encontrada",
      });
    }

    const detalleResult = await pool.query(
      `
    SELECT
    CASE
        WHEN fd.es_servicio
            THEN fd.descripcion_manual
        ELSE
            p.nombre
    END AS nombre,

    fd.es_servicio,

    fd.cantidad,

    fd.precio,

    fd.descuento,

    fd.costo_manual,

    (
        fd.cantidad * fd.precio
    ) - COALESCE(fd.descuento,0) AS subtotal

FROM factura_detalle fd

LEFT JOIN productos p
    ON p.id = fd.producto_id

WHERE fd.factura_id = $1
      `,
      [id],
    );

    res.json({
      factura: facturaResult.rows[0],
      detalle: detalleResult.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener factura",
    });
  }
});

module.exports = router;
