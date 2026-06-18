const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

// OBTENER CONFIGURACIÓN
router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM configuracion_empresa
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({
        nombre: "",
        telefono: "",
        direccion: "",
        correo: "",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener configuración",
    });
  }
});

// GUARDAR CONFIGURACIÓN
router.put("/", validarToken, async (req, res) => {
  try {
    const { nombre, telefono, direccion, correo } = req.body;

    const existe = await pool.query(`
      SELECT id
      FROM configuracion_empresa
      LIMIT 1
    `);

    if (existe.rows.length === 0) {
      await pool.query(
        `
        INSERT INTO configuracion_empresa
        (
          nombre,
          telefono,
          direccion,
          correo
        )
        VALUES ($1,$2,$3,$4)
        `,
        [nombre, telefono, direccion, correo],
      );
    } else {
      await pool.query(
        `
        UPDATE configuracion_empresa
        SET
          nombre = $1,
          telefono = $2,
          direccion = $3,
          correo = $4
        WHERE id = $5
        `,
        [nombre, telefono, direccion, correo, existe.rows[0].id],
      );
    }

    res.json({
      mensaje: "Configuración guardada",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al guardar configuración",
    });
  }
});

module.exports = router;
