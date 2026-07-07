const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

// =======================================
// OBTENER CAJA ABIERTA
// =======================================

router.get("/abierta", validarToken, async (req, res) => {
  try {
    const caja = await pool.query(
      `
      SELECT *
      FROM cajas
      WHERE usuario_id = $1
      AND estado = 'ABIERTA'
      LIMIT 1
    `,
      [req.usuario.id],
    );

    res.json(caja.rows[0] || null);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al consultar la caja",
    });
  }
});

// =======================================
// ABRIR CAJA
// =======================================

router.post("/abrir", validarToken, async (req, res) => {
  try {
    const { monto_inicial } = req.body;

    const abierta = await pool.query(
      `
      SELECT id
      FROM cajas
      WHERE usuario_id=$1
      AND estado='ABIERTA'
    `,
      [req.usuario.id],
    );

    if (abierta.rows.length > 0) {
      return res.status(400).json({
        mensaje: "Ya existe una caja abierta.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO cajas
      (
        usuario_id,
        monto_inicial
      )
      VALUES
      (
        $1,
        $2
      )
      RETURNING *
    `,
      [req.usuario.id, monto_inicial],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al abrir la caja",
    });
  }
});
// =======================================
// CERRAR CAJA
// =======================================

router.post("/cerrar", validarToken, async (req, res) => {
  try {
    const { dinero_contado } = req.body;

    const caja = await pool.query(
      `
      SELECT *
      FROM cajas
      WHERE usuario_id = $1
      AND estado = 'ABIERTA'
      LIMIT 1
      `,
      [req.usuario.id],
    );

    if (caja.rows.length === 0) {
      return res.status(400).json({
        mensaje: "No existe una caja abierta.",
      });
    }

    const cajaActual = caja.rows[0];

    const debeHaber =
      Number(cajaActual.monto_inicial) + Number(cajaActual.efectivo);

    const diferencia = Number(dinero_contado) - debeHaber;

    await pool.query(
      `
      UPDATE cajas
      SET
        dinero_contado = $1,
        diferencia = $2,
        fecha_cierre = NOW(),
        estado = 'CERRADA'
      WHERE id = $3
      `,
      [dinero_contado, diferencia, cajaActual.id],
    );

    res.json({
      mensaje: "Caja cerrada correctamente.",
      debeHaber,
      diferencia,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al cerrar la caja.",
    });
  }
});
module.exports = router;
