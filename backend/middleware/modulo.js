const pool = require("../db/conexion");

// ==========================================
// VALIDAR QUE LA EMPRESA TENGA UN MÓDULO
// ==========================================

const validarModulo = (codigoModulo) => {
  return async (req, res, next) => {
    try {
      // ==========================================
      // SUPER ADMIN
      // ==========================================
      // El SUPER_ADMIN administra el sistema y
      // no pertenece a una empresa específica.

      if (req.usuario.rol === "SUPER_ADMIN") {
        return next();
      }

      // ==========================================
      // VERIFICAR EMPRESA
      // ==========================================

      if (!req.usuario.empresa_id) {
        return res.status(403).json({
          mensaje: "El usuario no pertenece a ninguna empresa.",
        });
      }

      // ==========================================
      // VERIFICAR MÓDULO
      // ==========================================

      const result = await pool.query(
        `
        SELECT
          m.id,
          m.codigo,
          m.nombre
        FROM empresa_modulos em
        INNER JOIN modulos m
          ON m.id = em.modulo_id
        WHERE
          em.empresa_id = $1
          AND m.codigo = $2
          AND em.activo = TRUE
          AND m.activo = TRUE
        LIMIT 1
        `,
        [req.usuario.empresa_id, codigoModulo],
      );

      // ==========================================
      // MÓDULO NO ASIGNADO
      // ==========================================

      if (result.rows.length === 0) {
        return res.status(403).json({
          mensaje: `El módulo ${codigoModulo} no está habilitado para esta empresa.`,
        });
      }

      // ==========================================
      // MÓDULO AUTORIZADO
      // ==========================================

      next();
    } catch (error) {
      console.error("Error al validar módulo:", error);

      res.status(500).json({
        mensaje: "Error al verificar el módulo.",
      });
    }
  };
};

module.exports = validarModulo;
