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
        slogan,
        rnc,
        telefono,
        direccion,
        correo,
        logo_url,
        color_principal,
        tipo,
        propina_ley,
        itbis_ley,
        manejo_mesas,
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
    console.error("Error al obtener configuración:", error);

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
      slogan,
      rnc,
      telefono,
      direccion,
      correo,
      logo_url,
      color_principal,
      propina_ley,
      itbis_ley,
    } = req.body;

    // ==========================================
    // VALIDAR NOMBRE
    // ==========================================

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre de la empresa es obligatorio.",
      });
    }

    // ==========================================
    // ACTUALIZAR EMPRESA
    // ==========================================

    const result = await pool.query(
      `
      UPDATE empresas
      SET
        nombre = $1,
        slogan = $2,
        rnc = $3,
        telefono = $4,
        direccion = $5,
        correo = $6,
        logo_url = $7,
        color_principal = $8,
        propina_ley = $9,
        itbis_ley = $10
      WHERE id = $11
      RETURNING
        id,
        nombre,
        slogan,
        rnc,
        telefono,
        direccion,
        correo,
        logo_url,
        color_principal,
        tipo,
        propina_ley,
        itbis_ley,
        manejo_mesas,
        activo,
        fecha_vencimiento
      `,
      [
        nombre.trim(),
        slogan ? slogan.trim() : null,
        rnc || null,
        telefono || null,
        direccion || null,
        correo || null,
        logo_url || null,
        color_principal || "#198754",
        propina_ley === true,
        itbis_ley === true,
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
    console.error("Error al guardar configuración:", error);

    res.status(500).json({
      mensaje: "Error al guardar configuración",
    });
  }
});

module.exports = router;
