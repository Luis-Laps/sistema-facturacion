const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

// ==========================================
// CREAR FACTURA
// ==========================================

router.post("/", validarToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      cliente_id,
      productos,
      forma_pago = "EFECTIVO",
      propina_aplicada = false,
      itbis_aplicado = false,
    } = req.body;

    // ==========================================
    // VALIDAR PRODUCTOS
    // ==========================================

    if (!Array.isArray(productos) || productos.length === 0) {
      throw new Error(
        "La factura debe contener al menos un producto o servicio.",
      );
    }

    // ==========================================
    // OBTENER CONFIGURACIÓN DE LA EMPRESA
    // ==========================================

    const empresaResult = await client.query(
      `
      SELECT
        id,
        propina_ley,
        itbis_ley
      FROM empresas
      WHERE id = $1
      `,
      [req.usuario.empresa_id],
    );

    if (empresaResult.rows.length === 0) {
      throw new Error("Empresa no encontrada.");
    }

    const empresa = empresaResult.rows[0];

    // ==========================================
    // VALIDAR PROPINA
    // ==========================================

    let aplicarPropina = false;

    if (propina_aplicada === true) {
      if (empresa.propina_ley !== true) {
        throw new Error(
          "La propina de ley no está habilitada para esta empresa.",
        );
      }

      aplicarPropina = true;
    }

    // ==========================================
    // VALIDAR ITBIS
    // ==========================================

    let aplicarItbis = false;

    if (itbis_aplicado === true) {
      if (empresa.itbis_ley !== true) {
        throw new Error("El ITBIS no está habilitado para esta empresa.");
      }

      aplicarItbis = true;
    }

    // ==========================================
    // VALIDAR CLIENTE
    // ==========================================

    const cliente = await client.query(
      `
      SELECT id
      FROM clientes
      WHERE id = $1
      AND empresa_id = $2
      `,
      [cliente_id, req.usuario.empresa_id],
    );

    if (cliente.rows.length === 0) {
      throw new Error("Cliente no encontrado.");
    }

    // ==========================================
    // VALIDAR FORMA DE PAGO
    // ==========================================

    const formasPermitidas = ["EFECTIVO", "TARJETA", "TRANSFERENCIA"];

    if (!formasPermitidas.includes(forma_pago)) {
      throw new Error("Forma de pago inválida.");
    }

    // ==========================================
    // BUSCAR CAJA ABIERTA
    // ==========================================

    const caja = await client.query(
      `
      SELECT c.id
      FROM cajas c
      WHERE c.usuario_id = $1
      AND c.empresa_id = $2
      AND c.estado = 'ABIERTA'
      LIMIT 1
      `,
      [req.usuario.id, req.usuario.empresa_id],
    );

    if (caja.rows.length === 0) {
      throw new Error("Debe abrir una caja antes de facturar.");
    }

    const cajaId = caja.rows[0].id;

    // ==========================================
    // CALCULAR SUBTOTAL
    // ==========================================

    let subtotal = 0;

    for (const item of productos) {
      // ========================================
      // SERVICIO
      // ========================================

      if (item.tipo === "SERVICIO") {
        const precio = Number(item.precio);
        const costo = Number(item.costo || 0);
        const descuento = Number(item.descuento || 0);
        const cantidad = Number(item.cantidad || 1);

        if (Number.isNaN(precio)) {
          throw new Error("Precio inválido.");
        }

        if (cantidad <= 0) {
          throw new Error("La cantidad debe ser mayor que cero.");
        }

        if (descuento < 0) {
          throw new Error("El descuento no puede ser negativo.");
        }

        const subtotalServicio = precio * cantidad - descuento;

        if (subtotalServicio < 0) {
          throw new Error("El subtotal de un servicio no puede ser negativo.");
        }

        subtotal += subtotalServicio;

        continue;
      }

      // ========================================
      // PRODUCTO
      // ========================================

      const producto = await client.query(
        `
        SELECT *
        FROM productos
        WHERE id = $1
        AND empresa_id = $2
        `,
        [item.producto_id, req.usuario.empresa_id],
      );

      if (producto.rows.length === 0) {
        throw new Error("Producto no encontrado.");
      }

      const productoActual = producto.rows[0];

      const cantidad = Number(item.cantidad);

      if (cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor que cero.");
      }

      if (
        productoActual.tipo === "PRODUCTO" &&
        Number(productoActual.stock) < cantidad
      ) {
        throw new Error(`Stock insuficiente para ${productoActual.nombre}`);
      }

      const precio = Number(productoActual.precio_venta);

      const descuento = Number(item.descuento || 0);

      if (Number.isNaN(precio)) {
        throw new Error(
          `Precio inválido para el producto "${productoActual.nombre}".`,
        );
      }

      if (descuento < 0) {
        throw new Error("El descuento no puede ser negativo.");
      }

      const subtotalProducto = precio * cantidad - descuento;

      if (subtotalProducto < 0) {
        throw new Error(
          `El subtotal del producto "${productoActual.nombre}" no puede ser negativo.`,
        );
      }

      subtotal += subtotalProducto;
    }

    // ==========================================
    // REDONDEAR SUBTOTAL
    // ==========================================

    subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

    // ==========================================
    // CALCULAR PROPINA
    // ==========================================

    let propina = 0;

    if (aplicarPropina) {
      propina = Math.round((subtotal * 0.1 + Number.EPSILON) * 100) / 100;
    }

    // ==========================================
    // CALCULAR ITBIS
    // ==========================================

    let itbis = 0;

    if (aplicarItbis) {
      itbis = Math.round((subtotal * 0.18 + Number.EPSILON) * 100) / 100;
    }

    // ==========================================
    // CALCULAR TOTAL FINAL
    // ==========================================

    const total =
      Math.round((subtotal + itbis + propina + Number.EPSILON) * 100) / 100;
    console.log("================================");
    console.log("Productos:", productos);
    console.log("Subtotal:", subtotal);
    console.log("Propina aplicada:", aplicarPropina);
    console.log("Propina:", propina);
    console.log("Total calculado:", total);
    console.log("================================");

    if (Number.isNaN(total)) {
      throw new Error("No fue posible calcular el total de la factura.");
    }

    if (total < 0) {
      throw new Error("El total de la factura no puede ser negativo.");
    }

    // ==========================================
    // CREAR FACTURA
    // ==========================================

    const facturaResult = await client.query(
      `
      INSERT INTO facturas
      (
        cliente_id,
        fecha,
        total,
        caja_id,
        forma_pago,
        empresa_id,
        usuario_id,
        propina_aplicada,
        propina,
        itbis_aplicado,
        itbis
      )
      VALUES
(
  $1,
  NOW() AT TIME ZONE 'America/Santo_Domingo',
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8,
  $9,
  $10
)
      RETURNING id
      `,
      [
        cliente_id,
        total,
        cajaId,
        forma_pago,
        req.usuario.empresa_id,
        req.usuario.id,
        aplicarPropina,
        propina,
        aplicarItbis,
        itbis,
      ],
    );

    const facturaId = facturaResult.rows[0].id;

    // ==========================================
    // CREAR DETALLE
    // ==========================================

    for (const item of productos) {
      // ========================================
      // SERVICIO
      // ========================================

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

      // ========================================
      // PRODUCTO
      // ========================================

      const producto = await client.query(
        `
        SELECT *
        FROM productos
        WHERE id = $1
        AND empresa_id = $2
        `,
        [item.producto_id, req.usuario.empresa_id],
      );

      if (producto.rows.length === 0) {
        throw new Error("Producto no encontrado.");
      }

      const productoActual = producto.rows[0];

      const precio = Number(productoActual.precio_venta);

      if (Number.isNaN(precio)) {
        throw new Error(
          `Precio inválido para el producto "${productoActual.nombre}".`,
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
        VALUES
        ($1, $2, $3, $4, $5)
        `,
        [
          facturaId,
          item.producto_id,
          item.cantidad,
          precio,
          Number(item.descuento || 0),
        ],
      );

      // ========================================
      // ACTUALIZAR INVENTARIO
      // ========================================

      if (productoActual.tipo === "PRODUCTO") {
        const stockResult = await client.query(
          `
          UPDATE productos
          SET stock = stock - $1
          WHERE id = $2
          AND empresa_id = $3
          AND stock >= $1
          RETURNING id
          `,
          [item.cantidad, item.producto_id, req.usuario.empresa_id],
        );

        if (stockResult.rows.length === 0) {
          throw new Error(`Stock insuficiente para ${productoActual.nombre}`);
        }
      }
    }

    // ==========================================
    // ACTUALIZAR CAJA
    // ==========================================

    switch (forma_pago) {
      case "EFECTIVO":
        await client.query(
          `
          UPDATE cajas
          SET efectivo =
            COALESCE(efectivo, 0) + $1
          WHERE id = $2
          AND empresa_id = $3
          `,
          [total, cajaId, req.usuario.empresa_id],
        );
        break;

      case "TARJETA":
        await client.query(
          `
          UPDATE cajas
          SET tarjeta =
            COALESCE(tarjeta, 0) + $1
          WHERE id = $2
          AND empresa_id = $3
          `,
          [total, cajaId, req.usuario.empresa_id],
        );
        break;

      case "TRANSFERENCIA":
        await client.query(
          `
          UPDATE cajas
          SET transferencia =
            COALESCE(transferencia, 0) + $1
          WHERE id = $2
          AND empresa_id = $3
          `,
          [total, cajaId, req.usuario.empresa_id],
        );
        break;
    }

    // ==========================================
    // CONFIRMAR TRANSACCIÓN
    // ==========================================

    await client.query("COMMIT");

    res.status(201).json({
      factura_id: facturaId,
      subtotal,
      itbis_aplicado: aplicarItbis,
      itbis,
      propina_aplicada: aplicarPropina,
      propina,
      total,
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

// ==========================================
// OBTENER FACTURAS
// ==========================================

router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
      f.id,
      f.fecha,
      f.total,
      f.forma_pago,
      f.propina_aplicada,
      f.propina,
      f.itbis_aplicado,
      f.itbis,
      c.nombre AS cliente
      FROM facturas f
      INNER JOIN clientes c
        ON c.id = f.cliente_id
        AND c.empresa_id = f.empresa_id
      WHERE f.empresa_id = $1
      ORDER BY f.id DESC
      `,
      [req.usuario.empresa_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener facturas",
    });
  }
});

// ==========================================
// OBTENER FACTURA POR ID
// ==========================================

router.get("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const facturaResult = await pool.query(
      `
      SELECT
        f.id,
        f.fecha,
        f.total,
        f.forma_pago,
        f.propina_aplicada,
        f.propina,
        f.itbis_aplicado,
        f.itbis,
        c.nombre AS cliente,
        u.nombre AS usuario_nombre,
        u.usuario AS usuario
      FROM facturas f

      INNER JOIN clientes c
        ON c.id = f.cliente_id
        AND c.empresa_id = f.empresa_id

      LEFT JOIN usuarios u
        ON u.id = f.usuario_id
        AND u.empresa_id = f.empresa_id

      WHERE f.id = $1
      AND f.empresa_id = $2
      `,
      [id, req.usuario.empresa_id],
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
          WHEN fd.es_servicio = TRUE
            THEN fd.descripcion_manual
          ELSE p.nombre
        END AS nombre,

        fd.es_servicio,
        fd.cantidad,
        fd.precio,
        fd.descuento,
        fd.costo_manual,

        (
          fd.cantidad * fd.precio
        ) -
        COALESCE(fd.descuento, 0)
        AS subtotal

      FROM factura_detalle fd

      INNER JOIN facturas f
        ON f.id = fd.factura_id
        AND f.empresa_id = $2

      LEFT JOIN productos p
        ON p.id = fd.producto_id
        AND p.empresa_id = $2

      WHERE fd.factura_id = $1
      `,
      [id, req.usuario.empresa_id],
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

// ==========================================
// ELIMINAR FACTURA
// ==========================================

router.delete("/:id", validarToken, async (req, res) => {
  if (req.usuario.rol !== "ADMIN" && req.usuario.rol !== "SUPER_ADMIN") {
    return res.status(403).json({
      mensaje: "No tienes permisos para eliminar facturas.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    // ========================================
    // BUSCAR FACTURA
    // ========================================

    const factura = await client.query(
      `
      SELECT *
      FROM facturas
      WHERE id = $1
      AND empresa_id = $2
      `,
      [id, req.usuario.empresa_id],
    );

    if (factura.rows.length === 0) {
      throw new Error("La factura no existe.");
    }

    const facturaActual = factura.rows[0];

    // ========================================
    // OBTENER DETALLE
    // ========================================

    const detalle = await client.query(
      `
      SELECT *
      FROM factura_detalle fd
      INNER JOIN facturas f
        ON f.id = fd.factura_id
        AND f.empresa_id = $2
      WHERE fd.factura_id = $1
      `,
      [id, req.usuario.empresa_id],
    );

    // ========================================
    // DEVOLVER INVENTARIO
    // ========================================

    for (const item of detalle.rows) {
      if (item.es_servicio !== true && item.producto_id) {
        await client.query(
          `
          UPDATE productos
          SET stock = stock + $1
          WHERE id = $2
          AND empresa_id = $3
          `,
          [item.cantidad, item.producto_id, req.usuario.empresa_id],
        );
      }
    }

    // ========================================
    // REVERTIR CAJA
    // ========================================

    switch (facturaActual.forma_pago) {
      case "EFECTIVO":
        await client.query(
          `
          UPDATE cajas
          SET efectivo =
            COALESCE(efectivo, 0) - $1
          WHERE id = $2
          AND empresa_id = $3
          `,
          [facturaActual.total, facturaActual.caja_id, req.usuario.empresa_id],
        );
        break;

      case "TARJETA":
        await client.query(
          `
          UPDATE cajas
          SET tarjeta =
            COALESCE(tarjeta, 0) - $1
          WHERE id = $2
          AND empresa_id = $3
          `,
          [facturaActual.total, facturaActual.caja_id, req.usuario.empresa_id],
        );
        break;

      case "TRANSFERENCIA":
        await client.query(
          `
          UPDATE cajas
          SET transferencia =
            COALESCE(transferencia, 0) - $1
          WHERE id = $2
          AND empresa_id = $3
          `,
          [facturaActual.total, facturaActual.caja_id, req.usuario.empresa_id],
        );
        break;
    }

    // ========================================
    // ELIMINAR DETALLE
    // ========================================

    await client.query(
      `
      DELETE FROM factura_detalle
      WHERE factura_id = $1
      `,
      [id],
    );

    // ========================================
    // ELIMINAR FACTURA
    // ========================================

    await client.query(
      `
      DELETE FROM facturas
      WHERE id = $1
      AND empresa_id = $2
      `,
      [id, req.usuario.empresa_id],
    );

    // ========================================
    // CONFIRMAR
    // ========================================

    await client.query("COMMIT");

    res.json({
      mensaje: "Factura eliminada correctamente.",
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

module.exports = router;
