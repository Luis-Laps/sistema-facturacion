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
      AND empresa_id = $2
      AND estado = 'ABIERTA'
      LIMIT 1
      `,
      [req.usuario.id, req.usuario.empresa_id],
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
// HISTORIAL DE REPORTES
// =======================================

router.get("/reportes", validarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        fecha_apertura,
        fecha_cierre,
        monto_inicial,
        efectivo,
        tarjeta,
        transferencia,
        dinero_contado,
        diferencia,
        total_ventas,
        total_costos,
        ganancia,
        cantidad_facturas,
        cantidad_productos,
        estado
      FROM cajas
      WHERE usuario_id = $1
      AND empresa_id = $2
      ORDER BY fecha_apertura DESC
      `,
      [req.usuario.id, req.usuario.empresa_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener los reportes.",
    });
  }
});

// =======================================
// VENTAS DETALLADAS DE UN REPORTE DE CAJA
// =======================================

router.get("/reportes/:id/ventas", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la caja pertenece al usuario y empresa
    const cajaResult = await pool.query(
      `
      SELECT
        c.id,
        c.fecha_apertura,
        c.fecha_cierre,
        c.estado,
        e.nombre AS empresa,
        u.nombre AS usuario_nombre
      FROM cajas c
      INNER JOIN empresas e
        ON e.id = c.empresa_id
      LEFT JOIN usuarios u
        ON u.id = c.usuario_id
        AND u.empresa_id = c.empresa_id
      WHERE c.id = $1
      AND c.usuario_id = $2
      AND c.empresa_id = $3
      `,
      [id, req.usuario.id, req.usuario.empresa_id],
    );

    if (cajaResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Reporte de caja no encontrado.",
      });
    }

    const ventasResult = await pool.query(
      `
      SELECT
        f.id AS factura_id,
        f.fecha,
        f.total,
        f.forma_pago,

        CASE
          WHEN fd.es_servicio = TRUE
            THEN fd.descripcion_manual
          ELSE p.nombre
        END AS producto,

        fd.cantidad,
        fd.precio,
        fd.descuento,

        (
          fd.cantidad * fd.precio
        ) - COALESCE(fd.descuento, 0) AS subtotal

      FROM facturas f

      INNER JOIN factura_detalle fd
        ON fd.factura_id = f.id

      LEFT JOIN productos p
        ON p.id = fd.producto_id
        AND p.empresa_id = f.empresa_id

      WHERE f.caja_id = $1
      AND f.empresa_id = $2

      ORDER BY f.id ASC, fd.id ASC
      `,
      [id, req.usuario.empresa_id],
    );

    res.json({
      caja: cajaResult.rows[0],
      ventas: ventasResult.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener las ventas del reporte.",
    });
  }
});

// =======================================
// DETALLE DE UN REPORTE DE CAJA
// =======================================

router.get("/reportes/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        fecha_apertura,
        fecha_cierre,
        monto_inicial,
        efectivo,
        tarjeta,
        transferencia,
        dinero_contado,
        diferencia,
        total_ventas,
        total_costos,
        ganancia,
        cantidad_facturas,
        cantidad_productos,
        estado
      FROM cajas
      WHERE id = $1
      AND usuario_id = $2
      AND empresa_id = $3
      `,
      [id, req.usuario.id, req.usuario.empresa_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Reporte no encontrado.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener el reporte.",
    });
  }
});

// =======================================
// ABRIR CAJA
// =======================================

router.post("/abrir", validarToken, async (req, res) => {
  try {
    const { monto_inicial } = req.body;

    if (Number(monto_inicial) < 0) {
      return res.status(400).json({
        mensaje: "El monto inicial no puede ser negativo.",
      });
    }

    const abierta = await pool.query(
      `
      SELECT id
      FROM cajas
      WHERE usuario_id = $1
      AND empresa_id = $2
      AND estado = 'ABIERTA'
      `,
      [req.usuario.id, req.usuario.empresa_id],
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
        empresa_id,
        monto_inicial
      )
      VALUES
      (
        $1,
        $2,
        $3
      )
      RETURNING *
      `,
      [req.usuario.id, req.usuario.empresa_id, monto_inicial],
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
      AND empresa_id = $2
      AND estado = 'ABIERTA'
      LIMIT 1
      `,
      [req.usuario.id, req.usuario.empresa_id],
    );

    if (caja.rows.length === 0) {
      return res.status(400).json({
        mensaje: "No existe una caja abierta.",
      });
    }

    const cajaActual = caja.rows[0];

    // ===========================================
    // TOTAL VENTAS Y FACTURAS
    // ===========================================

    const ventasResult = await pool.query(
      `
      SELECT
        COUNT(*) AS cantidad_facturas,
        COALESCE(SUM(total), 0) AS total_ventas
      FROM facturas
      WHERE caja_id = $1
      AND empresa_id = $2
      `,
      [cajaActual.id, req.usuario.empresa_id],
    );

    const totalVentas = Number(ventasResult.rows[0].total_ventas);

    const cantidadFacturas = Number(ventasResult.rows[0].cantidad_facturas);

    // ===========================================
    // PRODUCTOS VENDIDOS Y COSTOS
    // ===========================================

    const detalleResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(fd.cantidad), 0) AS cantidad_productos,

        COALESCE(
          SUM(
            CASE
              WHEN fd.es_servicio = TRUE THEN
                COALESCE(fd.costo_manual, 0) * fd.cantidad
              ELSE
                COALESCE(p.costo_compra, 0) * fd.cantidad
            END
          ),
          0
        ) AS total_costos

      FROM factura_detalle fd

      INNER JOIN facturas f
        ON f.id = fd.factura_id
        AND f.empresa_id = $2

      LEFT JOIN productos p
        ON p.id = fd.producto_id
        AND p.empresa_id = $2

      WHERE f.caja_id = $1
      AND f.empresa_id = $2
      `,
      [cajaActual.id, req.usuario.empresa_id],
    );

    const cantidadProductos = Number(detalleResult.rows[0].cantidad_productos);

    const totalCostos = Number(detalleResult.rows[0].total_costos);

    const ganancia = totalVentas - totalCostos;

    // ===========================================
    // CIERRE DE CAJA
    // ===========================================

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
        estado = 'CERRADA',
        total_ventas = $3,
        total_costos = $4,
        ganancia = $5,
        cantidad_facturas = $6,
        cantidad_productos = $7

      WHERE id = $8
      AND usuario_id = $9
      AND empresa_id = $10
      `,
      [
        dinero_contado,
        diferencia,
        totalVentas,
        totalCostos,
        ganancia,
        cantidadFacturas,
        cantidadProductos,
        cajaActual.id,
        req.usuario.id,
        req.usuario.empresa_id,
      ],
    );

    res.json({
      mensaje: "Caja cerrada correctamente.",
      debeHaber,
      diferencia,
      totalVentas,
      totalCostos,
      ganancia,
      cantidadFacturas,
      cantidadProductos,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al cerrar la caja.",
    });
  }
});

module.exports = router;
