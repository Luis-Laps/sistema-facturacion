const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

// ==========================================
// VERIFICAR QUE SEA EMPRESA FERRETERÍA
// ==========================================

const validarFerreteria = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT tipo, itbis_ley
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

    req.empresaFerreteria = result.rows[0];

    next();
  } catch (error) {
    console.error("Error al validar empresa ferretería:", error);

    return res.status(500).json({
      mensaje: "Error al validar la empresa.",
    });
  }
};

// ==========================================
// LISTAR PRODUCTOS PARA FACTURACIÓN
// ==========================================

router.get("/productos", validarToken, validarFerreteria, async (req, res) => {
  try {
    const { buscar = "" } = req.query;

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.codigo,
          p.nombre,
          p.descripcion,
          p.costo_compra,
          p.precio_venta,
          p.stock,
          p.categoria_id,
          c.nombre AS categoria
        FROM productos p
        LEFT JOIN categorias c
          ON c.id = p.categoria_id
          AND c.empresa_id = p.empresa_id
        WHERE
          p.empresa_id = $1
          AND p.activo = TRUE
          AND p.tipo = 'PRODUCTO'
          AND (
            p.nombre ILIKE $2
            OR p.codigo ILIKE $2
            OR COALESCE(c.nombre, '') ILIKE $2
          )
        ORDER BY p.nombre ASC
        LIMIT 100
        `,
      [req.usuario.empresa_id, `%${buscar.trim()}%`],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener productos de ferretería:", error);

    res.status(500).json({
      mensaje: "Error al obtener productos.",
    });
  }
});

// ==========================================
// CREAR FACTURA DE FERRETERÍA
// ==========================================

router.post("/facturas", validarToken, validarFerreteria, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      productos,
      forma_pago = "EFECTIVO",
      itbis_aplicado = false,
    } = req.body;

    // ==========================================
    // VALIDAR PRODUCTOS
    // ==========================================

    if (!Array.isArray(productos) || productos.length === 0) {
      throw new Error("La factura debe contener al menos un producto.");
    }

    // ==========================================
    // VALIDAR FORMA DE PAGO
    // ==========================================

    const formasPermitidas = ["EFECTIVO", "TARJETA", "TRANSFERENCIA"];

    if (!formasPermitidas.includes(forma_pago)) {
      throw new Error("Forma de pago inválida.");
    }

    // ==========================================
    // VALIDAR ITBIS
    // ==========================================

    let aplicarItbis = false;

    if (itbis_aplicado === true) {
      if (req.empresaFerreteria.itbis_ley !== true) {
        throw new Error("El ITBIS no está habilitado para esta empresa.");
      }

      aplicarItbis = true;
    }

    // ==========================================
    // BUSCAR CAJA ABIERTA
    // ==========================================

    const cajaResult = await client.query(
      `
        SELECT id
        FROM cajas
        WHERE
          usuario_id = $1
          AND empresa_id = $2
          AND estado = 'ABIERTA'
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
        `,
      [req.usuario.id, req.usuario.empresa_id],
    );

    if (cajaResult.rows.length === 0) {
      throw new Error("Debes tener una caja abierta para facturar.");
    }

    const cajaId = cajaResult.rows[0].id;

    // ==========================================
    // VALIDAR Y CALCULAR PRODUCTOS
    // ==========================================

    let subtotal = 0;

    const productosValidados = [];

    for (const item of productos) {
      const productoId = Number(item.producto_id);
      const cantidad = Number(item.cantidad);
      const descuento = Number(item.descuento || 0);

      if (!Number.isInteger(productoId) || productoId <= 0) {
        throw new Error("Producto inválido.");
      }

      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error(
          "La cantidad debe ser un número entero mayor que cero.",
        );
      }

      if (Number.isNaN(descuento) || descuento < 0) {
        throw new Error("Descuento inválido.");
      }

      const productoResult = await client.query(
        `
          SELECT
            id,
            codigo,
            nombre,
            costo_compra,
            precio_venta,
            stock,
            tipo
          FROM productos
          WHERE
            id = $1
            AND empresa_id = $2
            AND activo = TRUE
          FOR UPDATE
          `,
        [productoId, req.usuario.empresa_id],
      );

      if (productoResult.rows.length === 0) {
        throw new Error("Producto no encontrado.");
      }

      const producto = productoResult.rows[0];

      if (producto.tipo !== "PRODUCTO") {
        throw new Error(
          `El producto "${producto.nombre}" no es válido para una factura de ferretería.`,
        );
      }

      const stock = Number(producto.stock);

      if (cantidad > stock) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}". Disponible: ${stock}.`,
        );
      }

      const precio = Number(producto.precio_venta);

      if (Number.isNaN(precio) || precio < 0) {
        throw new Error(
          `El precio del producto "${producto.nombre}" no es válido.`,
        );
      }

      const subtotalItem = cantidad * precio - descuento;

      if (subtotalItem < 0) {
        throw new Error(
          `El subtotal de "${producto.nombre}" no puede ser negativo.`,
        );
      }

      subtotal += subtotalItem;

      productosValidados.push({
        producto,
        cantidad,
        descuento,
        precio,
      });
    }

    // ==========================================
    // REDONDEAR SUBTOTAL
    // ==========================================

    subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

    // ==========================================
    // CALCULAR ITBIS
    // ==========================================

    let itbis = 0;

    if (aplicarItbis) {
      itbis = Math.round((subtotal * 0.18 + Number.EPSILON) * 100) / 100;
    }

    // ==========================================
    // TOTAL
    // ==========================================

    const total = Math.round((subtotal + itbis + Number.EPSILON) * 100) / 100;

    // ==========================================
    // CREAR FACTURA
    // SIN CLIENTE
    // ==========================================

    const facturaResult = await client.query(
      `
        INSERT INTO facturas (
          fecha,
          total,
          cliente_id,
          caja_id,
          forma_pago,
          empresa_id,
          usuario_id,
          propina_aplicada,
          propina,
          itbis_aplicado,
          itbis
        )
        VALUES (
          NOW() AT TIME ZONE 'America/Santo_Domingo',
          $1,
          NULL,
          $2,
          $3,
          $4,
          $5,
          FALSE,
          0,
          $6,
          $7
        )
        RETURNING id
        `,
      [
        total,
        cajaId,
        forma_pago,
        req.usuario.empresa_id,
        req.usuario.id,
        aplicarItbis,
        itbis,
      ],
    );

    const facturaId = facturaResult.rows[0].id;

    // ==========================================
    // DETALLE + INVENTARIO
    // ==========================================

    for (const item of productosValidados) {
      const producto = item.producto;

      await client.query(
        `
          INSERT INTO factura_detalle (
            factura_id,
            producto_id,
            cantidad,
            precio,
            descuento,
            es_servicio,
            descripcion_manual,
            costo_manual
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            FALSE,
            NULL,
            NULL
          )
          `,
        [facturaId, producto.id, item.cantidad, item.precio, item.descuento],
      );

      // ==========================================
      // DESCONTAR INVENTARIO
      // ==========================================

      const stockResult = await client.query(
        `
          UPDATE productos
          SET stock = stock - $1
          WHERE
            id = $2
            AND empresa_id = $3
            AND stock >= $1
          RETURNING stock
          `,
        [item.cantidad, producto.id, req.usuario.empresa_id],
      );

      if (stockResult.rows.length === 0) {
        throw new Error(
          `No fue posible actualizar el inventario de "${producto.nombre}".`,
        );
      }

      // ==========================================
      // MOVIMIENTO INVENTARIO
      // ==========================================

      await client.query(
        `
          INSERT INTO movimientos (
            producto_id,
            tipo,
            cantidad,
            fecha
          )
          VALUES (
            $1,
            'SALIDA',
            $2,
            NOW()
          )
          `,
        [producto.id, item.cantidad],
      );
    }

    // ==========================================
    // ACTUALIZAR CAJA
    // ==========================================

    switch (forma_pago) {
      case "EFECTIVO":
        await client.query(
          `
            UPDATE cajas
            SET efectivo =
              COALESCE(efectivo, 0) + $1
            WHERE
              id = $2
              AND empresa_id = $3
            `,
          [total, cajaId, req.usuario.empresa_id],
        );
        break;

      case "TARJETA":
        await client.query(
          `
            UPDATE cajas
            SET tarjeta =
              COALESCE(tarjeta, 0) + $1
            WHERE
              id = $2
              AND empresa_id = $3
            `,
          [total, cajaId, req.usuario.empresa_id],
        );
        break;

      case "TRANSFERENCIA":
        await client.query(
          `
            UPDATE cajas
            SET transferencia =
              COALESCE(transferencia, 0) + $1
            WHERE
              id = $2
              AND empresa_id = $3
            `,
          [total, cajaId, req.usuario.empresa_id],
        );
        break;
    }

    await client.query("COMMIT");

    res.status(201).json({
      factura_id: facturaId,
      subtotal,
      itbis_aplicado: aplicarItbis,
      itbis,
      total,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error al crear factura de ferretería:", error);

    res.status(400).json({
      mensaje: error.message,
    });
  } finally {
    client.release();
  }
});

module.exports = router;
