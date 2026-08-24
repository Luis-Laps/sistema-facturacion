const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

// ==========================================
// LISTAR CLIENTES
// ==========================================

router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
  SELECT
    id,
    nombre,
    telefono,
    email,
    direccion,
    empresa_id
  FROM clientes
  WHERE empresa_id = $1
  AND activo = TRUE
  ORDER BY id DESC
  `,
      [req.usuario.empresa_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener clientes",
    });
  }
});

// ==========================================
// CREAR CLIENTE
// ==========================================

router.post("/", validarToken, async (req, res) => {
  try {
    const { nombre, telefono, email, direccion } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre del cliente es obligatorio.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO clientes
      (
        nombre,
        telefono,
        email,
        direccion,
        empresa_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        nombre,
        telefono,
        email,
        direccion,
        empresa_id
      `,
      [
        nombre.trim(),
        telefono || "",
        email || "",
        direccion || "",
        req.usuario.empresa_id,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al crear cliente",
    });
  }
});

// ==========================================
// ACTUALIZAR CLIENTE
// ==========================================

router.put("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { nombre, telefono, email, direccion } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre del cliente es obligatorio.",
      });
    }

    const result = await pool.query(
      `
      UPDATE clientes
      SET
        nombre = $1,
        telefono = $2,
        email = $3,
        direccion = $4
      WHERE
        id = $5
        AND empresa_id = $6
      RETURNING
        id,
        nombre,
        telefono,
        email,
        direccion,
        empresa_id
      `,
      [
        nombre.trim(),
        telefono || "",
        email || "",
        direccion || "",
        id,
        req.usuario.empresa_id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Cliente no encontrado.",
      });
    }

    res.json({
      mensaje: "Cliente actualizado correctamente.",
      cliente: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al actualizar cliente",
    });
  }
});

// ==========================================
// ELIMINAR CLIENTE
// ==========================================

router.delete("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE clientes
      SET activo = FALSE
      WHERE id = $1
      AND empresa_id = $2
      AND activo = TRUE
      RETURNING id
      `,
      [id, req.usuario.empresa_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Cliente no encontrado.",
      });
    }

    res.json({
      mensaje: "Cliente eliminado correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);

    res.status(500).json({
      mensaje: "Error al eliminar cliente",
    });
  }
});

module.exports = router;
