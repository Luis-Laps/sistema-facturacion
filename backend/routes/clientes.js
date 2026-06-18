const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

// LISTAR CLIENTES
router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM clientes
      ORDER BY id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener clientes",
    });
  }
});

// CREAR CLIENTE
router.post("/", validarToken, async (req, res) => {
  try {
    const { nombre, telefono, email, direccion } = req.body;

    const result = await pool.query(
      `
      INSERT INTO clientes
      (
        nombre,
        telefono,
        email,
        direccion
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [nombre, telefono, email, direccion],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al crear cliente",
    });
  }
});

// ACTUALIZAR CLIENTE
router.put("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { nombre, telefono, email, direccion } = req.body;

    await pool.query(
      `
      UPDATE clientes
      SET
        nombre = $1,
        telefono = $2,
        email = $3,
        direccion = $4
      WHERE id = $5
      `,
      [nombre, telefono, email, direccion, id],
    );

    res.json({
      mensaje: "Cliente actualizado",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al actualizar cliente",
    });
  }
});

// ELIMINAR CLIENTE
router.delete("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM clientes
      WHERE id = $1
      `,
      [id],
    );

    res.json({
      mensaje: "Cliente eliminado",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al eliminar cliente",
    });
  }
});

module.exports = router;
