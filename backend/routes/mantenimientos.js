const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

// =====================================================
// OBTENER MANTENIMIENTO DE UNA EMPRESA
// =====================================================

router.get("/empresa/:empresaId", validarToken, async (req, res) => {
  try {
    const { empresaId } = req.params;

    // Solo SUPER_ADMIN puede consultar cualquier empresa.
    // Un ADMIN solo puede consultar su propia empresa.
    if (
      req.usuario.rol !== "SUPER_ADMIN" &&
      Number(req.usuario.empresa_id) !== Number(empresaId)
    ) {
      return res.status(403).json({
        mensaje: "No tienes permisos para consultar esta empresa.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        e.id AS empresa_id,
        e.nombre AS empresa_nombre,
        e.fecha_mantenimiento,
        e.monto_mantenimiento,

        CASE
          WHEN e.fecha_mantenimiento IS NULL
            THEN NULL
          ELSE (
            e.fecha_mantenimiento
            + INTERVAL '6 months'
          )::date
        END AS proximo_mantenimiento,

        CASE
          WHEN e.fecha_mantenimiento IS NULL
            THEN NULL
          ELSE (
            (
              e.fecha_mantenimiento
              + INTERVAL '6 months'
            )::date - CURRENT_DATE
          )
        END AS dias_restantes

      FROM empresas e

      WHERE e.id = $1
      `,
      [empresaId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada.",
      });
    }

    const mantenimiento = result.rows[0];

    let estado = "SIN_CONFIGURAR";

    if (mantenimiento.proximo_mantenimiento) {
      const dias = Number(mantenimiento.dias_restantes);

      if (dias < 0) {
        estado = "VENCIDO";
      } else if (dias === 0) {
        estado = "HOY";
      } else if (dias <= 30) {
        estado = "PROXIMO";
      } else {
        estado = "NORMAL";
      }
    }

    res.json({
      ...mantenimiento,
      estado,
    });
  } catch (error) {
    console.error("Error al consultar mantenimiento:", error);

    res.status(500).json({
      mensaje: "Error al consultar el mantenimiento.",
    });
  }
});

// =====================================================
// CONFIGURAR FECHA Y MONTO DE MANTENIMIENTO
// =====================================================

router.put("/empresa/:empresaId", validarToken, async (req, res) => {
  try {
    const { empresaId } = req.params;

    if (req.usuario.rol !== "SUPER_ADMIN") {
      return res.status(403).json({
        mensaje: "Solo el SUPER_ADMIN puede configurar mantenimientos.",
      });
    }

    const { fecha_mantenimiento, monto_mantenimiento } = req.body;

    if (!fecha_mantenimiento) {
      return res.status(400).json({
        mensaje: "Debe indicar la fecha de mantenimiento.",
      });
    }

    const monto = Number(monto_mantenimiento);

    if (Number.isNaN(monto) || monto < 0) {
      return res.status(400).json({
        mensaje: "El monto de mantenimiento no es válido.",
      });
    }

    const empresaExiste = await pool.query(
      `
      SELECT id
      FROM empresas
      WHERE id = $1
      `,
      [empresaId],
    );

    if (empresaExiste.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada.",
      });
    }

    const result = await pool.query(
      `
      UPDATE empresas
      SET
        fecha_mantenimiento = $1,
        monto_mantenimiento = $2
      WHERE id = $3
      RETURNING
        id,
        nombre,
        fecha_mantenimiento,
        monto_mantenimiento
      `,
      [fecha_mantenimiento, monto, empresaId],
    );

    res.json({
      mensaje: "Configuración de mantenimiento guardada correctamente.",
      empresa: result.rows[0],
    });
  } catch (error) {
    console.error("Error al configurar mantenimiento:", error);

    res.status(500).json({
      mensaje: "Error al configurar el mantenimiento.",
    });
  }
});

// =====================================================
// REGISTRAR MANTENIMIENTO REALIZADO
// =====================================================

router.post("/empresa/:empresaId/registrar", validarToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { empresaId } = req.params;

    if (req.usuario.rol !== "SUPER_ADMIN") {
      return res.status(403).json({
        mensaje: "Solo el SUPER_ADMIN puede registrar mantenimientos.",
      });
    }

    const { fecha_mantenimiento, monto, observaciones = null } = req.body;

    if (!fecha_mantenimiento) {
      return res.status(400).json({
        mensaje: "Debe indicar la fecha en que se realizó el mantenimiento.",
      });
    }

    const montoFinal = Number(monto);

    if (Number.isNaN(montoFinal) || montoFinal < 0) {
      return res.status(400).json({
        mensaje: "El monto del mantenimiento no es válido.",
      });
    }

    await client.query("BEGIN");

    const empresaResult = await client.query(
      `
      SELECT
        id,
        nombre
      FROM empresas
      WHERE id = $1
      FOR UPDATE
      `,
      [empresaId],
    );

    if (empresaResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        mensaje: "Empresa no encontrada.",
      });
    }

    // =================================================
    // CALCULAR PRÓXIMO MANTENIMIENTO
    // =================================================

    const proximoResult = await client.query(
      `
      SELECT
        (
          $1::date + INTERVAL '6 months'
        )::date AS proximo_mantenimiento
      `,
      [fecha_mantenimiento],
    );

    const proximoMantenimiento = proximoResult.rows[0].proximo_mantenimiento;

    // =================================================
    // GUARDAR HISTORIAL
    // =================================================

    const mantenimientoResult = await client.query(
      `
      INSERT INTO mantenimientos
      (
        empresa_id,
        fecha_mantenimiento,
        proximo_mantenimiento,
        monto,
        estado,
        observaciones
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        'COMPLETADO',
        $5
      )
      RETURNING *
      `,
      [
        empresaId,
        fecha_mantenimiento,
        proximoMantenimiento,
        montoFinal,
        observaciones,
      ],
    );

    // =================================================
    // ACTUALIZAR EMPRESA
    // =================================================

    await client.query(
      `
      UPDATE empresas
      SET
        fecha_mantenimiento = $1,
        monto_mantenimiento = $2
      WHERE id = $3
      `,
      [fecha_mantenimiento, montoFinal, empresaId],
    );

    await client.query("COMMIT");

    res.status(201).json({
      mensaje: "Mantenimiento registrado correctamente.",
      mantenimiento: mantenimientoResult.rows[0],
      proximo_mantenimiento: proximoMantenimiento,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error al registrar mantenimiento:", error);

    res.status(500).json({
      mensaje: "Error al registrar el mantenimiento.",
    });
  } finally {
    client.release();
  }
});

// =====================================================
// HISTORIAL DE MANTENIMIENTOS
// =====================================================

router.get("/empresa/:empresaId/historial", validarToken, async (req, res) => {
  try {
    const { empresaId } = req.params;

    if (
      req.usuario.rol !== "SUPER_ADMIN" &&
      Number(req.usuario.empresa_id) !== Number(empresaId)
    ) {
      return res.status(403).json({
        mensaje: "No tienes permisos para consultar este historial.",
      });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          empresa_id,
          fecha_mantenimiento,
          proximo_mantenimiento,
          monto,
          estado,
          observaciones,
          created_at
        FROM mantenimientos
        WHERE empresa_id = $1
        ORDER BY fecha_mantenimiento DESC, id DESC
        `,
      [empresaId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al consultar historial de mantenimientos:", error);

    res.status(500).json({
      mensaje: "Error al consultar el historial.",
    });
  }
});

module.exports = router;
