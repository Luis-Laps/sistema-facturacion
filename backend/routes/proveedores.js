const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

// ==========================================
// VALIDAR EMPRESA FERRETERÍA
// ==========================================

const validarFerreteria = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT tipo
      FROM empresas
      WHERE id = $1
      `,
      [req.usuario.empresa_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada.",
      });
    }

    if (result.rows[0].tipo !== "FERRETERIA") {
      return res.status(403).json({
        mensaje: "Este módulo solo está disponible para empresas ferretería.",
      });
    }

    next();
  } catch (error) {
    console.error("Error al validar empresa ferretería:", error);

    res.status(500).json({
      mensaje: "Error al validar la empresa.",
    });
  }
};

// ==========================================
// LISTAR PROVEEDORES
// ==========================================

router.get("/", validarToken, validarFerreteria, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          id,
          empresa_id,
          nombre,
          rnc,
          telefono,
          correo,
          direccion,
          contacto,
          notas,
          activo,
          created_at,
          updated_at
        FROM proveedores
        WHERE
          empresa_id = $1
          AND activo = TRUE
        ORDER BY nombre ASC
        `,
      [req.usuario.empresa_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar proveedores:", error);

    res.status(500).json({
      mensaje: "Error al obtener los proveedores.",
    });
  }
});

// ==========================================
// CREAR PROVEEDOR
// ==========================================

router.post("/", validarToken, validarFerreteria, async (req, res) => {
  try {
    const { nombre, rnc, telefono, correo, direccion, contacto, notas } =
      req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre del proveedor es obligatorio.",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO proveedores (
          empresa_id,
          nombre,
          rnc,
          telefono,
          correo,
          direccion,
          contacto,
          notas
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        )
        RETURNING *
        `,
      [
        req.usuario.empresa_id,
        nombre.trim(),
        rnc?.trim() || null,
        telefono?.trim() || null,
        correo?.trim() || null,
        direccion?.trim() || null,
        contacto?.trim() || null,
        notas?.trim() || null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear proveedor:", error);

    res.status(500).json({
      mensaje: "Error al crear el proveedor.",
    });
  }
});

// ==========================================
// EDITAR PROVEEDOR
// ==========================================

router.put("/:id", validarToken, validarFerreteria, async (req, res) => {
  try {
    const { id } = req.params;

    const { nombre, rnc, telefono, correo, direccion, contacto, notas } =
      req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre del proveedor es obligatorio.",
      });
    }

    const result = await pool.query(
      `
        UPDATE proveedores
        SET
          nombre = $1,
          rnc = $2,
          telefono = $3,
          correo = $4,
          direccion = $5,
          contacto = $6,
          notas = $7,
          updated_at = NOW()
        WHERE
          id = $8
          AND empresa_id = $9
          AND activo = TRUE
        RETURNING *
        `,
      [
        nombre.trim(),
        rnc?.trim() || null,
        telefono?.trim() || null,
        correo?.trim() || null,
        direccion?.trim() || null,
        contacto?.trim() || null,
        notas?.trim() || null,
        id,
        req.usuario.empresa_id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Proveedor no encontrado.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al editar proveedor:", error);

    res.status(500).json({
      mensaje: "Error al editar el proveedor.",
    });
  }
});

// ==========================================
// DESACTIVAR PROVEEDOR
// ==========================================

router.delete("/:id", validarToken, validarFerreteria, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        UPDATE proveedores
        SET
          activo = FALSE,
          updated_at = NOW()
        WHERE
          id = $1
          AND empresa_id = $2
          AND activo = TRUE
        RETURNING id, nombre, activo
        `,
      [id, req.usuario.empresa_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Proveedor no encontrado.",
      });
    }

    res.json({
      mensaje: "Proveedor desactivado correctamente.",
      proveedor: result.rows[0],
    });
  } catch (error) {
    console.error("Error al desactivar proveedor:", error);

    res.status(500).json({
      mensaje: "Error al desactivar el proveedor.",
    });
  }
});

module.exports = router;
