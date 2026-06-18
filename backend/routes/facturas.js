const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

// CREAR FACTURA
router.post("/", validarToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { cliente_id, productos } = req.body;

    let total = 0;

    for (const item of productos) {
      const producto = await client.query(
        `
        SELECT *
        FROM productos
        WHERE id = $1
        `,
        [item.producto_id],
      );

      if (producto.rows.length === 0) {
        throw new Error("Producto no encontrado");
      }

      const precio = Number(producto.rows[0].precio);

      total += precio * Number(item.cantidad);
    }

    const facturaResult = await client.query(
      `
      INSERT INTO facturas
      (
        cliente_id,
        fecha,
        total
      )
      VALUES
      (
        $1,
        NOW(),
        $2
      )
      RETURNING id
      `,
      [cliente_id, total],
    );

    const facturaId = facturaResult.rows[0].id;

    for (const item of productos) {
      const producto = await client.query(
        `
        SELECT *
        FROM productos
        WHERE id = $1
        `,
        [item.producto_id],
      );

      const precio = producto.rows[0].precio;

      await client.query(
        `
        INSERT INTO factura_detalle
        (
          factura_id,
          producto_id,
          cantidad,
          precio
        )
        VALUES ($1,$2,$3,$4)
        `,
        [facturaId, item.producto_id, item.cantidad, precio],
      );

      await client.query(
        `
        UPDATE productos
        SET stock = stock - $1
        WHERE id = $2
        `,
        [item.cantidad, item.producto_id],
      );
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
        p.nombre,
        fd.cantidad,
        fd.precio,
        (fd.cantidad * fd.precio) AS subtotal
      FROM factura_detalle fd
      INNER JOIN productos p
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
