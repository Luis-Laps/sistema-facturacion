const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

router.get("/", validarToken, async (req, res) => {
  try {
    const hoy = new Date().toISOString().split("T")[0];

    const primerDiaMes = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .split("T")[0];

    const { desde = primerDiaMes, hasta = hoy } = req.query;

    const productos = await pool.query(`SELECT COUNT(*) total FROM productos`);

    const clientes = await pool.query(`SELECT COUNT(*) total FROM clientes`);

    const facturas = await pool.query(
      `
  SELECT COUNT(*) total
  FROM facturas
  WHERE DATE(fecha) BETWEEN $1 AND $2
`,
      [desde, hasta],
    );
    const ventas = await pool.query(
      `
  SELECT COALESCE(SUM(total),0) total
  FROM facturas
  WHERE DATE(fecha) BETWEEN $1 AND $2
`,
      [desde, hasta],
    );

    const ganancias = await pool.query(
      `
  SELECT
    COALESCE(
      SUM(
        (fd.precio - p.costo_compra) * fd.cantidad
        - COALESCE(fd.descuento,0)
      ),
      0
    ) AS total
  FROM factura_detalle fd
  INNER JOIN facturas f
      ON f.id = fd.factura_id
  INNER JOIN productos p
      ON p.id = fd.producto_id
  WHERE DATE(f.fecha) BETWEEN $1 AND $2
`,
      [desde, hasta],
    );
    const ultimasFacturas = await pool.query(`
      SELECT
        f.id,
        f.fecha,
        f.total,
        c.nombre AS cliente
      FROM facturas f
      INNER JOIN clientes c
        ON c.id = f.cliente_id
      ORDER BY f.id DESC
      LIMIT 10
    `);

    res.json({
      productos: Number(productos.rows[0].total),
      clientes: Number(clientes.rows[0].total),
      facturas: Number(facturas.rows[0].total),
      ventas: Number(ventas.rows[0].total),
      ultimasFacturas: ultimasFacturas.rows,
      ganancias: Number(ganancias.rows[0].total),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al cargar dashboard",
    });
  }
});

module.exports = router;
