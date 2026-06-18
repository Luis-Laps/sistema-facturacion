const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/login", async (req, res) => {
  try {
    const { usuario, password } = req.body;

    const result = await pool.query(
      `
      SELECT *
      FROM usuarios
      WHERE usuario = $1
      AND activo = true
      `,
      [usuario],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        mensaje: "Usuario o contraseña incorrectos",
      });
    }

    const usuarioDB = result.rows[0];

    const passwordValida = await bcrypt.compare(password, usuarioDB.password);

    if (!passwordValida) {
      return res.status(401).json({
        mensaje: "Usuario o contraseña incorrectos",
      });
    }

    const token = jwt.sign(
      {
        id: usuarioDB.id,
        usuario: usuarioDB.usuario,
        rol: usuarioDB.rol,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      },
    );

    res.json({
      token,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error en login",
    });
  }
});

module.exports = router;
