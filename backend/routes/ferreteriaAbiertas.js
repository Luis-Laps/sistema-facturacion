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
      SELECT
        tipo,
        itbis_ley
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
// LISTAR FACTURAS ABIERTAS
// ==========================================

router.get("/", validarToken, validarFerreteria, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          fa.id,
          fa.empresa_id,
          fa.usuario_id,
          fa.nombre_cliente,
          fa.nota,
          fa.estado,
          fa.subtotal,
          fa.descuento,
          fa.itbis_aplicado,
          fa.itbis,
          fa.total,
          fa.created_at,
          fa.updated_at,
          u.nombre AS usuario_nombre,
          u.usuario AS usuario
        FROM facturas_abiertas fa
        LEFT JOIN usuarios u
          ON u.id = fa.usuario_id
          AND u.empresa_id = fa.empresa_id
        WHERE
          fa.empresa_id = $1
          AND fa.estado = 'ABIERTA'
        ORDER BY
          fa.updated_at DESC,
          fa.id DESC
        `,
      [req.usuario.empresa_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar facturas abiertas:", error);

    res.status(500).json({
      mensaje: "Error al obtener las facturas abiertas.",
    });
  }
});

// ==========================================
// OBTENER UNA FACTURA ABIERTA
// ==========================================

router.get("/:id", validarToken, validarFerreteria, async (req, res) => {
  try {
    const { id } = req.params;

    const facturaResult = await pool.query(
      `
        SELECT
          fa.id,
          fa.empresa_id,
          fa.usuario_id,
          fa.nombre_cliente,
          fa.nota,
          fa.estado,
          fa.subtotal,
          fa.descuento,
          fa.itbis_aplicado,
          fa.itbis,
          fa.total,
          fa.created_at,
          fa.updated_at,
          fa.closed_at,
          u.nombre AS usuario_nombre,
          u.usuario AS usuario
        FROM facturas_abiertas fa
        LEFT JOIN usuarios u
          ON u.id = fa.usuario_id
          AND u.empresa_id = fa.empresa_id
        WHERE
          fa.id = $1
          AND fa.empresa_id = $2
        `,
      [id, req.usuario.empresa_id],
    );

    if (facturaResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Factura abierta no encontrada.",
      });
    }

    const detalleResult = await pool.query(
      `
        SELECT
          fad.id,
          fad.factura_abierta_id,
          fad.producto_id,
          fad.cantidad,
          fad.precio,
          fad.descuento,
          fad.subtotal,
          fad.created_at,
          p.codigo,
          p.nombre,
          p.stock,
          p.costo_compra
        FROM facturas_abiertas_detalle fad
        INNER JOIN productos p
          ON p.id = fad.producto_id
          AND p.empresa_id = $2
        WHERE
          fad.factura_abierta_id = $1
        ORDER BY fad.id ASC
        `,
      [id, req.usuario.empresa_id],
    );

    res.json({
      factura: facturaResult.rows[0],
      detalle: detalleResult.rows,
    });
  } catch (error) {
    console.error("Error al obtener factura abierta:", error);

    res.status(500).json({
      mensaje: "Error al obtener la factura abierta.",
    });
  }
});

// ==========================================
// CREAR FACTURA ABIERTA
// ==========================================

router.post("/", validarToken, validarFerreteria, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      nombre_cliente = "",
      nota = "",
      productos,
      itbis_aplicado = false,
    } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      throw new Error("Agregue al menos un producto.");
    }

    let subtotal = 0;
    let descuentoTotal = 0;

    const detalleValidado = [];

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
        throw new Error("El descuento no es válido.");
      }

      const productoResult = await client.query(
        `
          SELECT
            id,
            codigo,
            nombre,
            precio_venta,
            costo_compra,
            stock,
            tipo
          FROM productos
          WHERE
            id = $1
            AND empresa_id = $2
            AND activo = TRUE
          `,
        [productoId, req.usuario.empresa_id],
      );

      if (productoResult.rows.length === 0) {
        throw new Error("Producto no encontrado.");
      }

      const producto = productoResult.rows[0];

      if (producto.tipo !== "PRODUCTO") {
        throw new Error(
          `El producto "${producto.nombre}" no es válido para ferretería.`,
        );
      }

      const precio = Number(producto.precio_venta);

      if (Number.isNaN(precio) || precio < 0) {
        throw new Error(`Precio inválido para "${producto.nombre}".`);
      }

      const subtotalItem = cantidad * precio - descuento;

      if (subtotalItem < 0) {
        throw new Error(
          `El subtotal de "${producto.nombre}" no puede ser negativo.`,
        );
      }

      subtotal += subtotalItem;
      descuentoTotal += descuento;

      detalleValidado.push({
        productoId,
        cantidad,
        precio,
        descuento,
        subtotal: subtotalItem,
      });
    }

    subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

    descuentoTotal = Math.round((descuentoTotal + Number.EPSILON) * 100) / 100;

    let aplicarItbis = false;
    let itbis = 0;

    if (itbis_aplicado === true) {
      if (req.empresaFerreteria.itbis_ley !== true) {
        throw new Error("El ITBIS no está habilitado para esta empresa.");
      }

      aplicarItbis = true;

      itbis = Math.round((subtotal * 0.18 + Number.EPSILON) * 100) / 100;
    }

    const total = Math.round((subtotal + itbis + Number.EPSILON) * 100) / 100;

    const facturaResult = await client.query(
      `
          INSERT INTO facturas_abiertas (
            empresa_id,
            usuario_id,
            nombre_cliente,
            nota,
            estado,
            subtotal,
            descuento,
            itbis_aplicado,
            itbis,
            total,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            'ABIERTA',
            $5,
            $6,
            $7,
            $8,
            $9,
            NOW(),
            NOW()
          )
          RETURNING *
          `,
      [
        req.usuario.empresa_id,
        req.usuario.id,
        nombre_cliente?.trim() || null,
        nota?.trim() || null,
        subtotal,
        descuentoTotal,
        aplicarItbis,
        itbis,
        total,
      ],
    );

    const facturaAbiertaId = facturaResult.rows[0].id;

    for (const item of detalleValidado) {
      await client.query(
        `
          INSERT INTO facturas_abiertas_detalle (
            factura_abierta_id,
            producto_id,
            cantidad,
            precio,
            descuento,
            subtotal,
            created_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            NOW()
          )
          `,
        [
          facturaAbiertaId,
          item.productoId,
          item.cantidad,
          item.precio,
          item.descuento,
          item.subtotal,
        ],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      mensaje: "Factura abierta guardada correctamente.",
      factura: facturaResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error al crear factura abierta:", error);

    res.status(400).json({
      mensaje: error.message,
    });
  } finally {
    client.release();
  }
});

// ==========================================
// ACTUALIZAR FACTURA ABIERTA
// ==========================================

router.put("/:id", validarToken, validarFerreteria, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    const {
      nombre_cliente = "",
      nota = "",
      productos,
      itbis_aplicado = false,
    } = req.body;

    const facturaResult = await client.query(
      `
          SELECT
            id,
            estado
          FROM facturas_abiertas
          WHERE
            id = $1
            AND empresa_id = $2
          FOR UPDATE
          `,
      [id, req.usuario.empresa_id],
    );

    if (facturaResult.rows.length === 0) {
      throw new Error("Factura abierta no encontrada.");
    }

    if (facturaResult.rows[0].estado !== "ABIERTA") {
      throw new Error("La factura ya no está abierta.");
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      throw new Error("Agregue al menos un producto.");
    }

    let subtotal = 0;
    let descuentoTotal = 0;

    const detalleValidado = [];

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
        throw new Error("El descuento no es válido.");
      }

      const productoResult = await client.query(
        `
            SELECT
              id,
              codigo,
              nombre,
              precio_venta,
              costo_compra,
              stock,
              tipo
            FROM productos
            WHERE
              id = $1
              AND empresa_id = $2
              AND activo = TRUE
            `,
        [productoId, req.usuario.empresa_id],
      );

      if (productoResult.rows.length === 0) {
        throw new Error("Producto no encontrado.");
      }

      const producto = productoResult.rows[0];

      if (producto.tipo !== "PRODUCTO") {
        throw new Error(
          `El producto "${producto.nombre}" no es válido para ferretería.`,
        );
      }

      const precio = Number(producto.precio_venta);

      if (Number.isNaN(precio) || precio < 0) {
        throw new Error(`Precio inválido para "${producto.nombre}".`);
      }

      const subtotalItem = cantidad * precio - descuento;

      if (subtotalItem < 0) {
        throw new Error(
          `El subtotal de "${producto.nombre}" no puede ser negativo.`,
        );
      }

      subtotal += subtotalItem;
      descuentoTotal += descuento;

      detalleValidado.push({
        productoId,
        cantidad,
        precio,
        descuento,
        subtotal: subtotalItem,
      });
    }

    subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

    descuentoTotal = Math.round((descuentoTotal + Number.EPSILON) * 100) / 100;

    let aplicarItbis = false;
    let itbis = 0;

    if (itbis_aplicado === true) {
      if (req.empresaFerreteria.itbis_ley !== true) {
        throw new Error("El ITBIS no está habilitado para esta empresa.");
      }

      aplicarItbis = true;

      itbis = Math.round((subtotal * 0.18 + Number.EPSILON) * 100) / 100;
    }

    const total = Math.round((subtotal + itbis + Number.EPSILON) * 100) / 100;

    await client.query(
      `
        UPDATE facturas_abiertas
        SET
          nombre_cliente = $1,
          nota = $2,
          subtotal = $3,
          descuento = $4,
          itbis_aplicado = $5,
          itbis = $6,
          total = $7,
          updated_at = NOW()
        WHERE
          id = $8
          AND empresa_id = $9
        `,
      [
        nombre_cliente?.trim() || null,
        nota?.trim() || null,
        subtotal,
        descuentoTotal,
        aplicarItbis,
        itbis,
        total,
        id,
        req.usuario.empresa_id,
      ],
    );

    await client.query(
      `
        DELETE FROM
          facturas_abiertas_detalle
        WHERE
          factura_abierta_id = $1
        `,
      [id],
    );

    for (const item of detalleValidado) {
      await client.query(
        `
          INSERT INTO facturas_abiertas_detalle (
            factura_abierta_id,
            producto_id,
            cantidad,
            precio,
            descuento,
            subtotal,
            created_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            NOW()
          )
          `,
        [
          id,
          item.productoId,
          item.cantidad,
          item.precio,
          item.descuento,
          item.subtotal,
        ],
      );
    }

    const actualizadaResult = await client.query(
      `
          SELECT *
          FROM facturas_abiertas
          WHERE
            id = $1
            AND empresa_id = $2
          `,
      [id, req.usuario.empresa_id],
    );

    await client.query("COMMIT");

    res.json({
      mensaje: "Factura abierta actualizada correctamente.",
      factura: actualizadaResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error al actualizar factura abierta:", error);

    res.status(400).json({
      mensaje: error.message,
    });
  } finally {
    client.release();
  }
});

// ==========================================
// CANCELAR FACTURA ABIERTA
// ==========================================

router.delete("/:id", validarToken, validarFerreteria, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
        UPDATE facturas_abiertas
        SET
          estado = 'CANCELADA',
          updated_at = NOW()
        WHERE
          id = $1
          AND empresa_id = $2
          AND estado = 'ABIERTA'
        RETURNING id
        `,
      [id, req.usuario.empresa_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Factura abierta no encontrada o ya procesada.",
      });
    }

    res.json({
      mensaje: "Factura abierta cancelada correctamente.",
    });
  } catch (error) {
    console.error("Error al cancelar factura abierta:", error);

    res.status(500).json({
      mensaje: "Error al cancelar la factura abierta.",
    });
  }
});

// ==========================================
// CERRAR / COBRAR FACTURA ABIERTA
// ==========================================

router.post(
  "/:id/cerrar",
  validarToken,
  validarFerreteria,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { id } = req.params;

      const { forma_pago = "EFECTIVO" } = req.body;

      const formasPermitidas = ["EFECTIVO", "TARJETA", "TRANSFERENCIA"];

      if (!formasPermitidas.includes(forma_pago)) {
        throw new Error("Forma de pago inválida.");
      }

      // ==========================================
      // OBTENER FACTURA ABIERTA
      // ==========================================

      const facturaResult = await client.query(
        `
          SELECT *
          FROM facturas_abiertas
          WHERE
            id = $1
            AND empresa_id = $2
          FOR UPDATE
          `,
        [id, req.usuario.empresa_id],
      );

      if (facturaResult.rows.length === 0) {
        throw new Error("Factura abierta no encontrada.");
      }

      const facturaAbierta = facturaResult.rows[0];

      if (facturaAbierta.estado !== "ABIERTA") {
        throw new Error("La factura ya no está abierta.");
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
        throw new Error("Debes tener una caja abierta para cobrar la factura.");
      }

      const cajaId = cajaResult.rows[0].id;

      // ==========================================
      // DETALLE
      // ==========================================

      const detalleResult = await client.query(
        `
          SELECT
            fad.id,
            fad.producto_id,
            fad.cantidad,
            fad.precio,
            fad.descuento,
            p.nombre,
            p.costo_compra,
            p.stock,
            p.tipo,
            p.activo
          FROM facturas_abiertas_detalle fad
          INNER JOIN productos p
            ON p.id = fad.producto_id
            AND p.empresa_id = $2
          WHERE
            fad.factura_abierta_id = $1
          ORDER BY fad.id ASC
          `,
        [id, req.usuario.empresa_id],
      );

      const detalle = detalleResult.rows;

      if (detalle.length === 0) {
        throw new Error("No puedes cobrar una factura sin productos.");
      }

      // ==========================================
      // VALIDAR STOCK Y RECALCULAR
      // ==========================================

      let subtotal = 0;

      for (const item of detalle) {
        const cantidad = Number(item.cantidad);

        const precio = Number(item.precio);

        const descuento = Number(item.descuento || 0);

        const stock = Number(item.stock);

        if (item.activo !== true || item.tipo !== "PRODUCTO") {
          throw new Error(
            `El producto "${item.nombre}" ya no está disponible.`,
          );
        }

        if (!Number.isInteger(cantidad) || cantidad <= 0) {
          throw new Error(`Cantidad inválida para "${item.nombre}".`);
        }

        if (stock < cantidad) {
          throw new Error(
            `Stock insuficiente para "${item.nombre}". Disponible: ${stock}.`,
          );
        }

        const subtotalItem = cantidad * precio - descuento;

        if (subtotalItem < 0) {
          throw new Error(
            `El subtotal de "${item.nombre}" no puede ser negativo.`,
          );
        }

        subtotal += subtotalItem;
      }

      subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

      // ==========================================
      // ITBIS
      // ==========================================

      let itbis = 0;

      if (facturaAbierta.itbis_aplicado === true) {
        if (req.empresaFerreteria.itbis_ley !== true) {
          throw new Error("El ITBIS no está habilitado para esta empresa.");
        }

        itbis = Math.round((subtotal * 0.18 + Number.EPSILON) * 100) / 100;
      }

      const total = Math.round((subtotal + itbis + Number.EPSILON) * 100) / 100;

      // ==========================================
      // CREAR FACTURA DEFINITIVA
      // ==========================================

      const facturaFinalResult = await client.query(
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
          facturaAbierta.itbis_aplicado === true,
          itbis,
        ],
      );

      const facturaId = facturaFinalResult.rows[0].id;

      // ==========================================
      // CREAR DETALLE DEFINITIVO
      // ==========================================

      for (const item of detalle) {
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
          [
            facturaId,
            item.producto_id,
            item.cantidad,
            item.precio,
            item.descuento,
          ],
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
              AND activo = TRUE
              AND stock >= $1
            RETURNING stock
            `,
          [item.cantidad, item.producto_id, req.usuario.empresa_id],
        );

        if (stockResult.rows.length === 0) {
          throw new Error(
            `No fue posible actualizar el inventario de "${item.nombre}".`,
          );
        }

        // ==========================================
        // REGISTRAR MOVIMIENTO
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
          [item.producto_id, item.cantidad],
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
            SET
              efectivo =
                COALESCE(
                  efectivo,
                  0
                ) + $1
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
            SET
              tarjeta =
                COALESCE(
                  tarjeta,
                  0
                ) + $1
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
            SET
              transferencia =
                COALESCE(
                  transferencia,
                  0
                ) + $1
            WHERE
              id = $2
              AND empresa_id = $3
            `,
            [total, cajaId, req.usuario.empresa_id],
          );
          break;
      }

      // ==========================================
      // CERRAR FACTURA ABIERTA
      // ==========================================

      await client.query(
        `
        UPDATE facturas_abiertas
        SET
          estado = 'CERRADA',
          subtotal = $1,
          itbis = $2,
          total = $3,
          updated_at = NOW(),
          closed_at = NOW()
        WHERE
          id = $4
          AND empresa_id = $5
        `,
        [subtotal, itbis, total, id, req.usuario.empresa_id],
      );

      await client.query("COMMIT");

      res.status(201).json({
        mensaje: "Factura cobrada correctamente.",
        factura_id: facturaId,
        factura_abierta_id: Number(id),
        subtotal,
        itbis_aplicado: facturaAbierta.itbis_aplicado === true,
        itbis,
        total,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Error al cerrar factura abierta:", error);

      res.status(400).json({
        mensaje: error.message,
      });
    } finally {
      client.release();
    }
  },
);

module.exports = router;
