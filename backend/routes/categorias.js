const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

// LISTAR CATEGORÍAS
router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre
      FROM categorias
      ORDER BY nombre
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      mensaje: "Error al obtener las categorías",
    });
  }
});

// CREAR CATEGORÍA
router.post("/", validarToken, async (req, res) => {
  try {
    const { nombre } = req.body;

    const result = await pool.query(
      `
      INSERT INTO categorias (nombre)
      VALUES ($1)
      RETURNING *
      `,
      [nombre],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al crear la categoría",
    });
  }
});

// ACTUALIZAR CATEGORÍA
router.put("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    await pool.query(
      `
      UPDATE categorias
      SET nombre = $1
      WHERE id = $2
      `,
      [nombre, id],
    );

    res.json({
      mensaje: "Categoría actualizada",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al actualizar la categoría",
    });
  }
});

// ELIMINAR CATEGORÍA
router.delete("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que no tenga productos asociados
    const productos = await pool.query(
      `
      SELECT id
      FROM productos
      WHERE categoria_id = $1
      LIMIT 1
      `,
      [id],
    );

    if (productos.rows.length > 0) {
      return res.status(400).json({
        mensaje:
          "No puedes eliminar una categoría que tiene productos asociados.",
      });
    }

    await pool.query(
      `
      DELETE FROM categorias
      WHERE id = $1
      `,
      [id],
    );

    res.json({
      mensaje: "Categoría eliminada",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al eliminar la categoría",
    });
  }
});

module.exports = router;
