const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

// ==========================================
// VERIFICAR ADMIN
// ==========================================

const validarAdmin = (req, res, next) => {
  if (req.usuario.rol !== "ADMIN" && req.usuario.rol !== "SUPER_ADMIN") {
    return res.status(403).json({
      mensaje:
        "No tienes permisos para modificar la configuración de la empresa.",
    });
  }

  next();
};

// ==========================================
// OBTENER CONFIGURACIÓN DE LA EMPRESA
// ==========================================

router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        nombre,
        rnc,
        telefono,
        direccion,
        correo,
        logo_url,
        color_principal,
        activo,
        fecha_vencimiento
      FROM empresas
      WHERE id = $1
      `,
      [req.usuario.empresa_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada",
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

// ==========================================
// GUARDAR CONFIGURACIÓN
// SOLO ADMIN
// ==========================================

router.put("/", validarToken, validarAdmin, async (req, res) => {
  try {
    const {
      nombre,
      rnc,
      telefono,
      direccion,
      correo,
      logo_url,
      color_principal,
    } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre de la empresa es obligatorio.",
      });
    }

    const result = await pool.query(
      `
        UPDATE empresas
        SET
          nombre = $1,
          rnc = $2,
          telefono = $3,
          direccion = $4,
          correo = $5,
          logo_url = $6,
          color_principal = $7
        WHERE id = $8
        RETURNING
          id,
          nombre,
          rnc,
          telefono,
          direccion,
          correo,
          logo_url,
          color_principal,
          activo,
          fecha_vencimiento
        `,
      [
        nombre.trim(),
        rnc || null,
        telefono || null,
        direccion || null,
        correo || null,
        logo_url || null,
        color_principal || "#198754",
        req.usuario.empresa_id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada",
      });
    }

    res.json({
      mensaje: "Configuración guardada",
      empresa: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al guardar configuración",
    });
  }
});

module.exports = router;
