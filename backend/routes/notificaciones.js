const express = require("express");
const router = express.Router();
const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

// =====================================================
// ENVIAR NOTIFICACIÓN DESDE SUPER ADMIN
// =====================================================

router.post("/enviar", validarToken, async (req, res) => {
  try {
    // Solo SUPER_ADMIN puede enviar notificaciones
    if (req.usuario.rol !== "SUPER_ADMIN") {
      return res.status(403).json({
        mensaje: "No tienes permisos para enviar notificaciones.",
      });
    }

    const { empresa_id, titulo, mensaje } = req.body;

    if (!empresa_id) {
      return res.status(400).json({
        mensaje: "Debe indicar la empresa.",
      });
    }

    if (!titulo || !String(titulo).trim()) {
      return res.status(400).json({
        mensaje: "Debe indicar un título.",
      });
    }

    if (!mensaje || !String(mensaje).trim()) {
      return res.status(400).json({
        mensaje: "Debe indicar el mensaje.",
      });
    }

    // =================================================
    // VERIFICAR QUE LA EMPRESA EXISTA
    // =================================================

    const empresaResult = await pool.query(
      `
      SELECT id, nombre
      FROM empresas
      WHERE id = $1
      LIMIT 1
      `,
      [empresa_id],
    );

    if (empresaResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "La empresa no existe.",
      });
    }

    // =================================================
    // BUSCAR ADMINISTRADORES DE LA EMPRESA
    // =================================================

    const administradoresResult = await pool.query(
      `
      SELECT id, nombre, usuario
      FROM usuarios
      WHERE empresa_id = $1
        AND rol = 'ADMIN'
      `,
      [empresa_id],
    );

    if (administradoresResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "La empresa seleccionada no tiene administradores.",
      });
    }

    // =================================================
    // CREAR NOTIFICACIÓN PARA CADA ADMINISTRADOR
    // =================================================

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const notificaciones = [];

      for (const administrador of administradoresResult.rows) {
        const result = await client.query(
          `
          INSERT INTO notificaciones (
            empresa_id,
            usuario_origen_id,
            usuario_destino_id,
            titulo,
            mensaje
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
          `,
          [
            empresa_id,
            req.usuario.id,
            administrador.id,
            String(titulo).trim(),
            String(mensaje).trim(),
          ],
        );

        notificaciones.push(result.rows[0]);
      }

      await client.query("COMMIT");

      return res.status(201).json({
        mensaje: "Notificación enviada correctamente.",
        empresa: empresaResult.rows[0],
        administradores_notificados: administradoresResult.rows.length,
        notificaciones,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error al enviar notificación:", error);

    return res.status(500).json({
      mensaje: "Error al enviar la notificación.",
    });
  }
});

// =====================================================
// OBTENER NOTIFICACIONES DEL USUARIO LOGUEADO
// =====================================================

router.get("/", validarToken, async (req, res) => {
  try {
    if (!req.usuario.id) {
      return res.status(401).json({
        mensaje: "Usuario no identificado.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        n.id,
        n.empresa_id,
        n.usuario_origen_id,
        n.usuario_destino_id,
        n.titulo,
        n.mensaje,
        n.leido,
        n.created_at,
        e.nombre AS empresa_nombre
      FROM notificaciones n
      INNER JOIN empresas e
        ON e.id = n.empresa_id
      WHERE n.usuario_destino_id = $1
      ORDER BY n.created_at DESC
      `,
      [req.usuario.id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);

    res.status(500).json({
      mensaje: "Error al obtener las notificaciones.",
    });
  }
});

// =====================================================
// OBTENER SOLO NOTIFICACIONES NO LEÍDAS
// =====================================================

router.get("/no-leidas", validarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        n.id,
        n.empresa_id,
        n.titulo,
        n.mensaje,
        n.leido,
        n.created_at,
        e.nombre AS empresa_nombre
      FROM notificaciones n
      INNER JOIN empresas e
        ON e.id = n.empresa_id
      WHERE
        n.usuario_destino_id = $1
        AND n.leido = FALSE
      ORDER BY n.created_at DESC
      `,
      [req.usuario.id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener notificaciones no leídas:", error);

    res.status(500).json({
      mensaje: "Error al obtener las notificaciones no leídas.",
    });
  }
});

// =====================================================
// CANTIDAD DE NOTIFICACIONES NO LEÍDAS
// =====================================================

router.get("/contador", validarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT COUNT(*)::INTEGER AS cantidad
        FROM notificaciones
        WHERE
          usuario_destino_id = $1
          AND leido = FALSE
        `,
      [req.usuario.id],
    );

    res.json({
      cantidad: result.rows[0].cantidad,
    });
  } catch (error) {
    console.error("Error al obtener contador de notificaciones:", error);

    res.status(500).json({
      mensaje: "Error al obtener el contador de notificaciones.",
    });
  }
});

// =====================================================
// MARCAR UNA NOTIFICACIÓN COMO LEÍDA
// =====================================================

router.put("/:id/leida", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE notificaciones
      SET leido = TRUE
      WHERE
        id = $1
        AND usuario_destino_id = $2
      RETURNING *
      `,
      [id, req.usuario.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "La notificación no existe o no pertenece a este usuario.",
      });
    }

    res.json({
      mensaje: "Notificación marcada como leída.",
      notificacion: result.rows[0],
    });
  } catch (error) {
    console.error("Error al marcar notificación:", error);

    res.status(500).json({
      mensaje: "Error al marcar la notificación como leída.",
    });
  }
});

// =====================================================
// MARCAR TODAS COMO LEÍDAS
// =====================================================

router.put("/marcar-todas-leidas", validarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
        UPDATE notificaciones
        SET leido = TRUE
        WHERE
          usuario_destino_id = $1
          AND leido = FALSE
        `,
      [req.usuario.id],
    );

    res.json({
      mensaje: "Todas las notificaciones fueron marcadas como leídas.",
      actualizadas: result.rowCount,
    });
  } catch (error) {
    console.error("Error al marcar todas las notificaciones:", error);

    res.status(500).json({
      mensaje: "Error al marcar las notificaciones.",
    });
  }
});

module.exports = router;
