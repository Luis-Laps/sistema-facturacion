const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

// ==========================================
// LISTAR CATEGORÍAS
// ==========================================

router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        nombre
      FROM categorias
      WHERE empresa_id = $1
      ORDER BY nombre
      `,
      [req.usuario.empresa_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener las categorías",
    });
  }
});

// ==========================================
// CREAR CATEGORÍA
// ==========================================

router.post("/", validarToken, async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre de la categoría es obligatorio.",
      });
    }

    // Verificar que no exista en esta empresa
    const existe = await pool.query(
      `
      SELECT id
      FROM categorias
      WHERE nombre = $1
      AND empresa_id = $2
      `,
      [nombre.trim(), req.usuario.empresa_id],
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        mensaje: "Ya existe una categoría con ese nombre.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO categorias (
        nombre,
        empresa_id
      )
      VALUES ($1, $2)
      RETURNING *
      `,
      [nombre.trim(), req.usuario.empresa_id],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al crear la categoría",
    });
  }
});

// ==========================================
// ACTUALIZAR CATEGORÍA
// ==========================================

router.put("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre de la categoría es obligatorio.",
      });
    }

    const result = await pool.query(
      `
      UPDATE categorias
      SET nombre = $1
      WHERE id = $2
      AND empresa_id = $3
      RETURNING *
      `,
      [nombre.trim(), id, req.usuario.empresa_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Categoría no encontrada.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al actualizar la categoría",
    });
  }
});

// ==========================================
// ELIMINAR CATEGORÍA
// ==========================================

router.delete("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que no tenga productos asociados
    const productos = await pool.query(
      `
      SELECT id
      FROM productos
      WHERE categoria_id = $1
      AND empresa_id = $2
      LIMIT 1
      `,
      [id, req.usuario.empresa_id],
    );

    if (productos.rows.length > 0) {
      return res.status(400).json({
        mensaje:
          "No puedes eliminar una categoría que tiene productos asociados.",
      });
    }

    const result = await pool.query(
      `
      DELETE FROM categorias
      WHERE id = $1
      AND empresa_id = $2
      RETURNING id
      `,
      [id, req.usuario.empresa_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Categoría no encontrada.",
      });
    }

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
