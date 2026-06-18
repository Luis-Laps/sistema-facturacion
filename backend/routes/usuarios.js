const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const bcrypt = require("bcrypt");
const validarToken = require("../middleware/auth");

router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, usuario, rol, activo
      FROM usuarios
      ORDER BY id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener usuarios",
    });
  }
});

router.post("/", validarToken, async (req, res) => {
  try {
    const { nombre, usuario, password, rol } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO usuarios
      (
        nombre,
        usuario,
        password,
        rol,
        activo
      )
      VALUES ($1,$2,$3,$4,true)
      RETURNING id,nombre,usuario,rol
      `,
      [nombre, usuario, passwordHash, rol],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al crear usuario",
    });
  }
});

router.put("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { nombre, usuario, rol } = req.body;

    await pool.query(
      `
      UPDATE usuarios
      SET nombre = $1,
          usuario = $2,
          rol = $3
      WHERE id = $4
      `,
      [nombre, usuario, rol, id],
    );

    res.json({
      mensaje: "Usuario actualizado",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al actualizar usuario",
    });
  }
});

router.delete("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM usuarios
      WHERE id = $1
      `,
      [id],
    );

    res.json({
      mensaje: "Usuario eliminado",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al eliminar usuario",
    });
  }
});

module.exports = router;
