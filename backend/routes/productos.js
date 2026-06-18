const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

// LISTAR PRODUCTOS
router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM productos
      ORDER BY id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener productos",
    });
  }
});

// CREAR PRODUCTO
router.post("/", validarToken, async (req, res) => {
  try {
    const { nombre, precio, stock } = req.body;

    const result = await pool.query(
      `
      INSERT INTO productos
      (nombre, precio, stock)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [nombre, precio, stock],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al crear producto",
    });
  }
});

// ACTUALIZAR PRODUCTO
router.put("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { nombre, precio, stock } = req.body;

    await pool.query(
      `
      UPDATE productos
      SET nombre = $1,
          precio = $2,
          stock = $3
      WHERE id = $4
      `,
      [nombre, precio, stock, id],
    );

    res.json({
      mensaje: "Producto actualizado",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al actualizar producto",
    });
  }
});

// ELIMINAR PRODUCTO
router.delete("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM productos
      WHERE id = $1
      `,
      [id],
    );

    res.json({
      mensaje: "Producto eliminado",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al eliminar producto",
    });
  }
});

module.exports = router;
