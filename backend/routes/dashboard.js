const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

// ==========================================
// DASHBOARD
// ==========================================

router.get("/", validarToken, async (req, res) => {
  try {
    const obtenerFechaLocal = (fecha = new Date()) => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, "0");
      const day = String(fecha.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const hoy = obtenerFechaLocal();

    const primerDiaMes = obtenerFechaLocal(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    );

    const { desde = primerDiaMes, hasta = hoy } = req.query;

    const empresaId = req.usuario.empresa_id;

    // ==========================================
    // CONFIGURACIÓN DE LA EMPRESA
    // ==========================================

    const empresaResult = await pool.query(
      `
      SELECT
        manejo_mesas
      FROM empresas
      WHERE id = $1
      LIMIT 1
      `,
      [empresaId],
    );

    if (empresaResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada.",
      });
    }

    const manejoMesas = empresaResult.rows[0].manejo_mesas === true;

    // ==========================================
    // PRODUCTOS
    // ==========================================

    const productos = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM productos
      WHERE empresa_id = $1
      AND activo = TRUE
      `,
      [empresaId],
    );

    // ==========================================
    // CLIENTES
    // ==========================================

    const clientes = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM clientes
      WHERE empresa_id = $1
      AND activo = TRUE
      `,
      [empresaId],
    );

    // ==========================================
    // FACTURAS DEL PERÍODO
    // ==========================================

    const facturas = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM facturas
      WHERE empresa_id = $1
      AND fecha >= $2::date
      AND fecha < ($3::date + INTERVAL '1 day')
      `,
      [empresaId, desde, hasta],
    );

    // ==========================================
    // VENTAS DEL PERÍODO
    // ==========================================

    const ventas = await pool.query(
      `
      SELECT
        COALESCE(SUM(total), 0) AS total
      FROM facturas
      WHERE empresa_id = $1
      AND fecha >= $2::date
      AND fecha < ($3::date + INTERVAL '1 day')
      `,
      [empresaId, desde, hasta],
    );

    // ==========================================
    // PROPINAS DEL PERÍODO
    // SOLO PARA EMPRESAS CON MANEJO DE MESAS
    // ==========================================

    let propinas = {
      cantidad: 0,
      total: 0,
    };

    if (manejoMesas) {
      const propinasResult = await pool.query(
        `
        SELECT
          COUNT(*) FILTER (
            WHERE propina_aplicada = TRUE
          ) AS cantidad,

          COALESCE(
            SUM(
              CASE
                WHEN propina_aplicada = TRUE
                THEN COALESCE(propina, 0)
                ELSE 0
              END
            ),
            0
          ) AS total

        FROM facturas

        WHERE empresa_id = $1
        AND fecha >= $2::date
        AND fecha < ($3::date + INTERVAL '1 day')
        `,
        [empresaId, desde, hasta],
      );

      propinas = {
        cantidad: Number(propinasResult.rows[0].cantidad || 0),
        total: Number(propinasResult.rows[0].total || 0),
      };
    }

    // ==========================================
    // GANANCIAS DEL PERÍODO
    // ==========================================

    const ganancias = await pool.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE

              WHEN fd.es_servicio = TRUE THEN

                (
                  fd.precio * fd.cantidad
                )

                - COALESCE(fd.descuento, 0)

                - (
                  COALESCE(fd.costo_manual, 0)
                  * fd.cantidad
                )

              ELSE

                (
                  fd.precio * fd.cantidad
                )

                - COALESCE(fd.descuento, 0)

                - (
                  COALESCE(p.costo_compra, 0)
                  * fd.cantidad
                )

            END
          ),
          0
        ) AS total

      FROM factura_detalle fd

      INNER JOIN facturas f
        ON f.id = fd.factura_id

      LEFT JOIN productos p
        ON p.id = fd.producto_id
        AND p.empresa_id = $1

      WHERE f.empresa_id = $1

      AND f.fecha >= $2::date

      AND f.fecha < (
        $3::date + INTERVAL '1 day'
      )
      `,
      [empresaId, desde, hasta],
    );

    // ==========================================
    // VENTAS POR DÍA
    // ==========================================

    const ventasPorDia = await pool.query(
      `
      SELECT
        DATE(fecha) AS fecha,

        COALESCE(
          SUM(total),
          0
        ) AS total

      FROM facturas

      WHERE empresa_id = $1

      AND fecha >= $2::date

      AND fecha < (
        $3::date + INTERVAL '1 day'
      )

      GROUP BY DATE(fecha)

      ORDER BY DATE(fecha) ASC
      `,
      [empresaId, desde, hasta],
    );

    // ==========================================
    // ÚLTIMAS FACTURAS
    // ==========================================

    const ultimasFacturas = await pool.query(
      `
      SELECT
        f.id,
        f.fecha,
        f.total,
        c.nombre AS cliente

      FROM facturas f

      INNER JOIN clientes c
        ON c.id = f.cliente_id
        AND c.empresa_id = f.empresa_id

      WHERE f.empresa_id = $1

      ORDER BY f.id DESC

      LIMIT 10
      `,
      [empresaId],
    );

    // ==========================================
    // RESPUESTA
    // ==========================================

    res.json({
      productos: Number(productos.rows[0].total),

      clientes: Number(clientes.rows[0].total),

      facturas: Number(facturas.rows[0].total),

      ventas: Number(ventas.rows[0].total),

      ganancias: Number(ganancias.rows[0].total),

      // Indica al frontend si debe mostrar
      // la tarjeta de propinas.
      manejoMesas,

      // Estadísticas de propinas.
      propinas: {
        cantidad: propinas.cantidad,
        total: propinas.total,
      },

      ventasPorDia: ventasPorDia.rows.map((item) => ({
        fecha: item.fecha,
        total: Number(item.total),
      })),

      ultimasFacturas: ultimasFacturas.rows,
    });
  } catch (error) {
    console.error("Error en dashboard:", error);

    res.status(500).json({
      mensaje: "Error al cargar dashboard",
    });
  }
});

module.exports = router;
