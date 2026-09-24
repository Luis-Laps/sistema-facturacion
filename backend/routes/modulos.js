const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

// ==========================================
// VALIDAR SUPER ADMIN
// ==========================================

const validarSuperAdmin = (req, res, next) => {
  if (req.usuario.rol !== "SUPER_ADMIN") {
    return res.status(403).json({
      mensaje: "No tienes permisos para gestionar módulos.",
    });
  }

  next();
};

// ==========================================
// LISTAR TODOS LOS MÓDULOS
// ==========================================

router.get("/", validarToken, validarSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT
          id,
          codigo,
          nombre,
          descripcion,
          icono,
          activo
        FROM modulos
        WHERE activo = TRUE
        ORDER BY id ASC
      `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener módulos:", error);

    res.status(500).json({
      mensaje: "Error al obtener módulos.",
    });
  }
});
// ==========================================
// MÓDULOS DE LA EMPRESA DEL USUARIO ACTUAL
// ==========================================

router.get("/mis-modulos", validarToken, async (req, res) => {
  try {
    // SUPER_ADMIN no pertenece a una empresa
    if (req.usuario.rol === "SUPER_ADMIN") {
      return res.json([]);
    }

    if (!req.usuario.empresa_id) {
      return res.json([]);
    }

    const result = await pool.query(
      `
        SELECT
          m.id,
          m.codigo,
          m.nombre,
          m.descripcion,
          m.icono
        FROM empresa_modulos em
        INNER JOIN modulos m
          ON m.id = em.modulo_id
        WHERE
          em.empresa_id = $1
          AND em.activo = TRUE
          AND m.activo = TRUE
        ORDER BY m.id ASC
        `,
      [req.usuario.empresa_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener módulos del usuario:", error);

    res.status(500).json({
      mensaje: "Error al obtener los módulos de la empresa.",
    });
  }
});
// ==========================================
// OBTENER MÓDULOS DE UNA EMPRESA
// ==========================================

router.get(
  "/empresa/:empresaId",
  validarToken,
  validarSuperAdmin,
  async (req, res) => {
    try {
      const empresaId = Number(req.params.empresaId);

      if (!Number.isInteger(empresaId) || empresaId <= 0) {
        return res.status(400).json({
          mensaje: "Empresa inválida.",
        });
      }

      const empresa = await pool.query(
        `
        SELECT id, nombre
        FROM empresas
        WHERE id = $1
        `,
        [empresaId],
      );

      if (empresa.rows.length === 0) {
        return res.status(404).json({
          mensaje: "Empresa no encontrada.",
        });
      }

      const result = await pool.query(
        `
        SELECT
          m.id,
          m.codigo,
          m.nombre,
          m.descripcion,
          m.icono,
          m.activo,
          CASE
            WHEN em.id IS NOT NULL
              AND em.activo = TRUE
            THEN TRUE
            ELSE FALSE
          END AS asignado
        FROM modulos m
        LEFT JOIN empresa_modulos em
          ON em.modulo_id = m.id
          AND em.empresa_id = $1
        WHERE m.activo = TRUE
        ORDER BY m.id ASC
        `,
        [empresaId],
      );

      res.json({
        empresa: empresa.rows[0],
        modulos: result.rows,
      });
    } catch (error) {
      console.error("Error al obtener módulos de empresa:", error);

      res.status(500).json({
        mensaje: "Error al obtener módulos de la empresa.",
      });
    }
  },
);

// ==========================================
// ASIGNAR MÓDULO A EMPRESA
// ==========================================

router.post(
  "/empresa/:empresaId/asignar",
  validarToken,
  validarSuperAdmin,
  async (req, res) => {
    try {
      const empresaId = Number(req.params.empresaId);

      const moduloId = Number(req.body.modulo_id);

      if (!Number.isInteger(empresaId) || empresaId <= 0) {
        return res.status(400).json({
          mensaje: "Empresa inválida.",
        });
      }

      if (!Number.isInteger(moduloId) || moduloId <= 0) {
        return res.status(400).json({
          mensaje: "Módulo inválido.",
        });
      }

      const empresa = await pool.query(
        `
        SELECT id
        FROM empresas
        WHERE id = $1
        `,
        [empresaId],
      );

      if (empresa.rows.length === 0) {
        return res.status(404).json({
          mensaje: "Empresa no encontrada.",
        });
      }

      const modulo = await pool.query(
        `
        SELECT id
        FROM modulos
        WHERE
          id = $1
          AND activo = TRUE
        `,
        [moduloId],
      );

      if (modulo.rows.length === 0) {
        return res.status(404).json({
          mensaje: "Módulo no encontrado.",
        });
      }

      await pool.query(
        `
        INSERT INTO empresa_modulos (
          empresa_id,
          modulo_id,
          activo
        )
        VALUES ($1, $2, TRUE)
        ON CONFLICT (
          empresa_id,
          modulo_id
        )
        DO UPDATE
        SET activo = TRUE
        `,
        [empresaId, moduloId],
      );

      res.json({
        mensaje: "Módulo asignado correctamente.",
      });
    } catch (error) {
      console.error("Error al asignar módulo:", error);

      res.status(500).json({
        mensaje: "Error al asignar módulo.",
      });
    }
  },
);

// ==========================================
// QUITAR MÓDULO DE EMPRESA
// ==========================================

router.delete(
  "/empresa/:empresaId/:moduloId",
  validarToken,
  validarSuperAdmin,
  async (req, res) => {
    try {
      const empresaId = Number(req.params.empresaId);

      const moduloId = Number(req.params.moduloId);

      if (!Number.isInteger(empresaId) || empresaId <= 0) {
        return res.status(400).json({
          mensaje: "Empresa inválida.",
        });
      }

      if (!Number.isInteger(moduloId) || moduloId <= 0) {
        return res.status(400).json({
          mensaje: "Módulo inválido.",
        });
      }

      const result = await pool.query(
        `
        UPDATE empresa_modulos
        SET activo = FALSE
        WHERE
          empresa_id = $1
          AND modulo_id = $2
        RETURNING id
        `,
        [empresaId, moduloId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          mensaje: "El módulo no está asignado a esta empresa.",
        });
      }

      res.json({
        mensaje: "Módulo retirado correctamente.",
      });
    } catch (error) {
      console.error("Error al retirar módulo:", error);

      res.status(500).json({
        mensaje: "Error al retirar módulo.",
      });
    }
  },
);

module.exports = router;
