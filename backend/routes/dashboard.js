const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

router.get("/", validarToken, async (req, res) => {
  try {
    const { periodo = "dia" } = req.query;

    let filtroFecha = "";

    switch (periodo) {
      case "dia":
        filtroFecha = "DATE(fecha) = CURRENT_DATE";
        break;

      case "semana":
        filtroFecha = "fecha >= CURRENT_DATE - INTERVAL '7 days'";
        break;

      case "mes":
        filtroFecha =
          "DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)";
        break;

      case "anio":
        filtroFecha =
          "DATE_TRUNC('year', fecha) = DATE_TRUNC('year', CURRENT_DATE)";
        break;

      default:
        filtroFecha = "DATE(fecha) = CURRENT_DATE";
    }

    const productos = await pool.query(`SELECT COUNT(*) total FROM productos`);

    const clientes = await pool.query(`SELECT COUNT(*) total FROM clientes`);

    const facturas = await pool.query(`
      SELECT COUNT(*) total
      FROM facturas
      WHERE ${filtroFecha}
    `);

    const ventas = await pool.query(`
      SELECT COALESCE(SUM(total),0) total
      FROM facturas
      WHERE ${filtroFecha}
    `);

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
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al cargar dashboard",
    });
  }
});

module.exports = router;
