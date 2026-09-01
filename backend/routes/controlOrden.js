const express = require("express");
const router = express.Router();
const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

// ==========================================
// LISTAR MESAS
// ==========================================

router.get("/mesas", validarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        m.id,
        m.nombre,
        m.activa,
        m.created_at,

        COUNT(
          CASE
            WHEN c.estado = 'ABIERTA' THEN 1
          END
        ) AS cuentas_abiertas,

        COALESCE(
          SUM(
            CASE
              WHEN c.estado = 'ABIERTA' THEN
                (
                  SELECT COALESCE(
                    SUM(
                      cd.cantidad * cd.precio - cd.descuento
                    ),
                    0
                  )
                  FROM cuenta_detalle cd
                  WHERE cd.cuenta_id = c.id
                )
              ELSE 0
            END
          ),
          0
        ) AS total

      FROM mesas m

      LEFT JOIN cuentas c
        ON c.mesa_id = m.id

      WHERE
        m.empresa_id = $1
        AND m.activa = TRUE

      GROUP BY
        m.id,
        m.nombre,
        m.activa,
        m.created_at

      ORDER BY m.id ASC
      `,
      [req.usuario.empresa_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar mesas:", error);

    res.status(500).json({
      mensaje: "Error al obtener las mesas.",
    });
  }
});

// ==========================================
// CREAR MESA
// ==========================================

router.post("/mesas", validarToken, async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre de la mesa es obligatorio.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO mesas (
        empresa_id,
        nombre,
        activa,
        created_at
      )
      VALUES (
        $1,
        $2,
        TRUE,
        NOW()
      )
      RETURNING *
      `,
      [req.usuario.empresa_id, nombre.trim()],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear mesa:", error);

    res.status(500).json({
      mensaje: "Error al crear la mesa.",
    });
  }
});

// ==========================================
// OBTENER UNA MESA
// ==========================================

router.get("/mesas/:mesaId", validarToken, async (req, res) => {
  try {
    const { mesaId } = req.params;

    const mesaResult = await pool.query(
      `
        SELECT
          id,
          nombre,
          activa,
          created_at
        FROM mesas
        WHERE
          id = $1
          AND empresa_id = $2
          AND activa = TRUE
        `,
      [mesaId, req.usuario.empresa_id],
    );

    if (mesaResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Mesa no encontrada.",
      });
    }

    const cuentasResult = await pool.query(
      `
        SELECT
          c.id,
          c.mesa_id,
          c.usuario_id,
          c.nombre,
          c.estado,
          c.created_at,
          c.closed_at,

          COALESCE(
            SUM(
              cd.cantidad * cd.precio - cd.descuento
            ),
            0
          ) AS total

        FROM cuentas c

        LEFT JOIN cuenta_detalle cd
          ON cd.cuenta_id = c.id

        WHERE
          c.mesa_id = $1
          AND c.estado = 'ABIERTA'

        GROUP BY
          c.id,
          c.mesa_id,
          c.usuario_id,
          c.nombre,
          c.estado,
          c.created_at,
          c.closed_at

        ORDER BY c.id ASC
        `,
      [mesaId],
    );

    res.json({
      mesa: mesaResult.rows[0],
      cuentas: cuentasResult.rows,
    });
  } catch (error) {
    console.error("Error al obtener mesa:", error);

    res.status(500).json({
      mensaje: "Error al obtener la mesa.",
    });
  }
});

// ==========================================
// CREAR CUENTA
// ==========================================

router.post("/mesas/:mesaId/cuentas", validarToken, async (req, res) => {
  try {
    const { mesaId } = req.params;
    const { nombre } = req.body;

    // ------------------------------------------
    // VERIFICAR MESA
    // ------------------------------------------

    const mesaResult = await pool.query(
      `
        SELECT id
        FROM mesas
        WHERE
          id = $1
          AND empresa_id = $2
          AND activa = TRUE
        `,
      [mesaId, req.usuario.empresa_id],
    );

    if (mesaResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Mesa no encontrada.",
      });
    }

    // ------------------------------------------
    // CREAR CUENTA
    // ------------------------------------------

    const result = await pool.query(
      `
        INSERT INTO cuentas (
          mesa_id,
          usuario_id,
          nombre,
          estado,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          'ABIERTA',
          NOW()
        )
        RETURNING *
        `,
      [
        mesaId,
        req.usuario.id,
        nombre && nombre.trim() ? nombre.trim() : "Cuenta",
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear cuenta:", error);

    res.status(500).json({
      mensaje: "Error al crear la cuenta.",
    });
  }
});

// ==========================================
// OBTENER CUENTA
// ==========================================

router.get("/cuentas/:cuentaId", validarToken, async (req, res) => {
  try {
    const { cuentaId } = req.params;

    const cuentaResult = await pool.query(
      `
        SELECT
          c.id,
          c.mesa_id,
          c.usuario_id,
          c.nombre,
          c.estado,
          c.created_at,
          c.closed_at,
          m.nombre AS mesa_nombre
        FROM cuentas c

        INNER JOIN mesas m
          ON m.id = c.mesa_id
          AND m.empresa_id = $2

        WHERE
          c.id = $1
          AND c.estado = 'ABIERTA'
        `,
      [cuentaId, req.usuario.empresa_id],
    );

    if (cuentaResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Cuenta no encontrada.",
      });
    }

    const detalleResult = await pool.query(
      `
        SELECT
          cd.id,
          cd.cuenta_id,
          cd.producto_id,
          cd.cantidad,
          cd.precio,
          cd.descuento,
          cd.created_at,

          p.codigo,
          p.nombre AS producto_nombre,
          p.tipo,
          p.stock

        FROM cuenta_detalle cd

        INNER JOIN productos p
          ON p.id = cd.producto_id
          AND p.empresa_id = $2

        WHERE cd.cuenta_id = $1

        ORDER BY cd.id ASC
        `,
      [cuentaId, req.usuario.empresa_id],
    );

    let subtotal = 0;

    for (const item of detalleResult.rows) {
      subtotal +=
        Number(item.cantidad) * Number(item.precio) -
        Number(item.descuento || 0);
    }

    res.json({
      cuenta: cuentaResult.rows[0],
      detalle: detalleResult.rows,
      subtotal,
    });
  } catch (error) {
    console.error("Error al obtener cuenta:", error);

    res.status(500).json({
      mensaje: "Error al obtener la cuenta.",
    });
  }
});

// ==========================================
// AGREGAR PRODUCTO A CUENTA
// ==========================================

router.post("/cuentas/:cuentaId/detalle", validarToken, async (req, res) => {
  try {
    const { cuentaId } = req.params;

    const { producto_id, cantidad, precio, descuento = 0 } = req.body;

    if (!producto_id) {
      return res.status(400).json({
        mensaje: "Debe seleccionar un producto.",
      });
    }

    if (!cantidad || Number(cantidad) <= 0) {
      return res.status(400).json({
        mensaje: "La cantidad debe ser mayor que cero.",
      });
    }

    // ------------------------------------------
    // VERIFICAR CUENTA
    // ------------------------------------------

    const cuentaResult = await pool.query(
      `
        SELECT c.id
        FROM cuentas c

        INNER JOIN mesas m
          ON m.id = c.mesa_id

        WHERE
          c.id = $1
          AND c.estado = 'ABIERTA'
          AND m.empresa_id = $2
        `,
      [cuentaId, req.usuario.empresa_id],
    );

    if (cuentaResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Cuenta no encontrada o cerrada.",
      });
    }

    // ------------------------------------------
    // PRODUCTO
    // ------------------------------------------

    const productoResult = await pool.query(
      `
        SELECT
          id,
          nombre,
          precio_venta,
          stock,
          tipo
        FROM productos
        WHERE
          id = $1
          AND empresa_id = $2
          AND activo = TRUE
        `,
      [producto_id, req.usuario.empresa_id],
    );

    if (productoResult.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Producto no encontrado.",
      });
    }

    const producto = productoResult.rows[0];

    const precioFinal =
      precio !== undefined && precio !== null && precio !== ""
        ? Number(precio)
        : Number(producto.precio_venta);

    if (Number.isNaN(precioFinal) || precioFinal < 0) {
      return res.status(400).json({
        mensaje: "Precio inválido.",
      });
    }

    const descuentoFinal = Number(descuento || 0);

    if (Number.isNaN(descuentoFinal) || descuentoFinal < 0) {
      return res.status(400).json({
        mensaje: "Descuento inválido.",
      });
    }

    // ------------------------------------------
    // INSERTAR
    // ------------------------------------------

    const result = await pool.query(
      `
        INSERT INTO cuenta_detalle (
          cuenta_id,
          producto_id,
          cantidad,
          precio,
          descuento,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NOW()
        )
        RETURNING *
        `,
      [cuentaId, producto_id, Number(cantidad), precioFinal, descuentoFinal],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al agregar producto a cuenta:", error);

    res.status(500).json({
      mensaje: "Error al agregar producto.",
    });
  }
});

// ==========================================
// ACTUALIZAR CANTIDAD DE PRODUCTO
// ==========================================

router.put(
  "/cuentas/:cuentaId/detalle/:detalleId",
  validarToken,
  async (req, res) => {
    try {
      const { cuentaId, detalleId } = req.params;
      const { cantidad } = req.body;

      // ------------------------------------------
      // VALIDAR CANTIDAD
      // ------------------------------------------

      if (
        cantidad === undefined ||
        cantidad === null ||
        !Number.isInteger(Number(cantidad)) ||
        Number(cantidad) <= 0
      ) {
        return res.status(400).json({
          mensaje: "La cantidad debe ser un número entero mayor que cero.",
        });
      }

      const cantidadFinal = Number(cantidad);

      // ------------------------------------------
      // VERIFICAR CUENTA Y DETALLE
      // ------------------------------------------

      const result = await pool.query(
        `
        UPDATE cuenta_detalle cd
        SET cantidad = $1
        FROM cuentas c
        INNER JOIN mesas m
          ON m.id = c.mesa_id
        WHERE
          cd.id = $2
          AND cd.cuenta_id = $3
          AND c.id = cd.cuenta_id
          AND c.estado = 'ABIERTA'
          AND m.empresa_id = $4
        RETURNING
          cd.id,
          cd.cuenta_id,
          cd.producto_id,
          cd.cantidad,
          cd.precio,
          cd.descuento,
          cd.created_at
        `,
        [cantidadFinal, detalleId, cuentaId, req.usuario.empresa_id],
      );

      // ------------------------------------------
      // VERIFICAR SI EXISTE
      // ------------------------------------------

      if (result.rows.length === 0) {
        return res.status(404).json({
          mensaje: "Detalle no encontrado o la cuenta está cerrada.",
        });
      }

      // ------------------------------------------
      // RESPUESTA
      // ------------------------------------------

      res.json({
        mensaje: "Cantidad actualizada correctamente.",
        detalle: result.rows[0],
      });
    } catch (error) {
      console.error("Error al actualizar cantidad:", error);

      res.status(500).json({
        mensaje: "Error al actualizar la cantidad.",
      });
    }
  },
);

// ==========================================
// ELIMINAR PRODUCTO DE CUENTA
// ==========================================

router.delete(
  "/cuentas/:cuentaId/detalle/:detalleId",
  validarToken,
  async (req, res) => {
    try {
      const { cuentaId, detalleId } = req.params;

      const result = await pool.query(
        `
        DELETE FROM cuenta_detalle cd
        USING cuentas c
        INNER JOIN mesas m
          ON m.id = c.mesa_id
        WHERE
          cd.id = $1
          AND cd.cuenta_id = $2
          AND c.id = cd.cuenta_id
          AND c.estado = 'ABIERTA'
          AND m.empresa_id = $3
        RETURNING cd.id
        `,
        [detalleId, cuentaId, req.usuario.empresa_id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          mensaje: "Detalle no encontrado.",
        });
      }

      res.json({
        mensaje: "Producto eliminado de la cuenta.",
      });
    } catch (error) {
      console.error("Error al eliminar detalle:", error);

      res.status(500).json({
        mensaje: "Error al eliminar producto.",
      });
    }
  },
);

// ==========================================
// CERRAR CUENTA
// GENERAR FACTURA
// ACTUALIZAR CAJA
// ACTUALIZAR INVENTARIO
// REGISTRAR MOVIMIENTOS
// ==========================================

router.post("/cuentas/:cuentaId/cerrar", validarToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { cuentaId } = req.params;

    const {
      forma_pago = "EFECTIVO",
      propina_aplicada = false,
      itbis_aplicado = false,
      cliente_id = null,
    } = req.body;

    // ==========================================
    // VERIFICAR FORMA DE PAGO
    // ==========================================

    const formasPermitidas = ["EFECTIVO", "TARJETA", "TRANSFERENCIA"];

    if (!formasPermitidas.includes(forma_pago)) {
      throw new Error("Forma de pago inválida.");
    }

    // ==========================================
    // OBTENER CUENTA
    // ==========================================

    const cuentaResult = await client.query(
      `
        SELECT
          c.id,
          c.mesa_id,
          c.usuario_id,
          c.nombre,
          c.estado,
          m.nombre AS mesa_nombre
        FROM cuentas c

        INNER JOIN mesas m
          ON m.id = c.mesa_id

        WHERE
          c.id = $1
          AND m.empresa_id = $2

        FOR UPDATE OF c
        `,
      [cuentaId, req.usuario.empresa_id],
    );

    if (cuentaResult.rows.length === 0) {
      throw new Error("La cuenta no existe.");
    }

    const cuenta = cuentaResult.rows[0];

    if (cuenta.estado !== "ABIERTA") {
      throw new Error("La cuenta ya está cerrada.");
    }

    // ==========================================
    // OBTENER DETALLE
    // ==========================================

    const detalleResult = await client.query(
      `
          SELECT
            cd.id,
            cd.producto_id,
            cd.cantidad,
            cd.precio,
            cd.descuento,

            p.nombre,
            p.tipo,
            p.stock,
            p.costo_compra

          FROM cuenta_detalle cd

          INNER JOIN productos p
            ON p.id = cd.producto_id
            AND p.empresa_id = $2

          WHERE cd.cuenta_id = $1

          ORDER BY cd.id ASC
          `,
      [cuentaId, req.usuario.empresa_id],
    );

    const detalle = detalleResult.rows;

    if (detalle.length === 0) {
      throw new Error("No puedes cerrar una cuenta sin productos.");
    }

    // ==========================================
    // CALCULAR SUBTOTAL
    // ==========================================

    let subtotal = 0;
    let cantidadProductos = 0;
    let totalCostos = 0;

    for (const item of detalle) {
      const cantidad = Number(item.cantidad);

      const precio = Number(item.precio);

      const descuento = Number(item.descuento || 0);

      const costoCompra = Number(item.costo_compra || 0);

      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error(`Cantidad inválida para ${item.nombre}.`);
      }

      if (Number.isNaN(precio) || precio < 0) {
        throw new Error(`Precio inválido para ${item.nombre}.`);
      }

      if (Number.isNaN(descuento) || descuento < 0) {
        throw new Error(`Descuento inválido para ${item.nombre}.`);
      }

      const subtotalItem = cantidad * precio - descuento;

      if (subtotalItem < 0) {
        throw new Error(`El subtotal de ${item.nombre} no puede ser negativo.`);
      }

      subtotal += subtotalItem;

      cantidadProductos += cantidad;

      totalCostos += cantidad * costoCompra;
    }

    subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

    totalCostos = Math.round((totalCostos + Number.EPSILON) * 100) / 100;

    // ==========================================
    // CONFIGURACIÓN EMPRESA
    // ==========================================

    const empresaResult = await client.query(
      `
         SELECT
          id,
          propina_ley,
          itbis_ley
        FROM empresas
          WHERE id = $1
          `,
      [req.usuario.empresa_id],
    );

    if (empresaResult.rows.length === 0) {
      throw new Error("Empresa no encontrada.");
    }

    const empresa = empresaResult.rows[0];

    // ==========================================
    // PROPINA
    // ==========================================

    let aplicarPropina = false;

    if (propina_aplicada === true) {
      if (empresa.propina_ley !== true) {
        throw new Error(
          "La propina de ley no está habilitada para esta empresa.",
        );
      }

      aplicarPropina = true;
    }

    let propina = 0;

    if (aplicarPropina) {
      propina = Math.round((subtotal * 0.1 + Number.EPSILON) * 100) / 100;
    }

    // ==========================================
    // ITBIS
    // ==========================================

    let aplicarItbis = false;

    if (itbis_aplicado === true) {
      if (empresa.itbis_ley !== true) {
        throw new Error("El ITBIS no está habilitado para esta empresa.");
      }

      aplicarItbis = true;
    }

    let itbis = 0;

    if (aplicarItbis) {
      itbis = Math.round((subtotal * 0.18 + Number.EPSILON) * 100) / 100;
    }
    // ==========================================
    // TOTAL
    // ==========================================

    const total =
      Math.round((subtotal + propina + itbis + Number.EPSILON) * 100) / 100;
    // ==========================================
    // BUSCAR CAJA ABIERTA
    // ==========================================

    const cajaResult = await client.query(
      `
          SELECT
            id
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
      throw new Error("Debes tener una caja abierta para cerrar la cuenta.");
    }

    const cajaId = cajaResult.rows[0].id;

    // ==========================================
    // CLIENTE
    // ==========================================

    let clienteId = cliente_id;

    if (clienteId) {
      const clienteResult = await client.query(
        `
            SELECT id
            FROM clientes
            WHERE
              id = $1
              AND empresa_id = $2
            `,
        [clienteId, req.usuario.empresa_id],
      );

      if (clienteResult.rows.length === 0) {
        throw new Error("El cliente seleccionado no pertenece a esta empresa.");
      }
    } else {
      // Si no se seleccionó cliente,
      // utilizamos el primer cliente
      // disponible de la empresa.

      const clienteResult = await client.query(
        `
            SELECT id
            FROM clientes
            WHERE empresa_id = $1
            ORDER BY id ASC
            LIMIT 1
            `,
        [req.usuario.empresa_id],
      );

      if (clienteResult.rows.length === 0) {
        throw new Error(
          "No existe ningún cliente registrado para esta empresa.",
        );
      }

      clienteId = clienteResult.rows[0].id;
    }

    // ==========================================
    // CREAR FACTURA
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
      NOW(),
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10
    )
    RETURNING id
  `,
      [
        total,
        clienteId,
        cajaId,
        forma_pago,
        req.usuario.empresa_id,
        req.usuario.id,
        aplicarPropina,
        propina,
        aplicarItbis,
        itbis,
      ],
    );

    const facturaId = facturaResult.rows[0].id;

    // ==========================================
    // FACTURA DETALLE
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
            $6,
            $7,
            $8
          )
          `,
        [
          facturaId,
          item.producto_id,
          item.cantidad,
          item.precio,
          item.descuento || 0,
          item.tipo === "SERVICIO",
          null,
          null,
        ],
      );

      // ========================================
      // INVENTARIO
      // ========================================

      // ========================================
      // INVENTARIO
      // ========================================

      // SOLO LOS PRODUCTOS MANEJAN INVENTARIO.
      // ALIMENTO y SERVICIO NO manejan stock.

      if (item.tipo === "PRODUCTO") {
        const stockResult = await client.query(
          `
      UPDATE productos
      SET stock = stock - $1
      WHERE
        id = $2
        AND empresa_id = $3
        AND stock >= $1
      RETURNING id
    `,
          [item.cantidad, item.producto_id, req.usuario.empresa_id],
        );

        if (stockResult.rows.length === 0) {
          throw new Error(`Stock insuficiente para ${item.nombre}.`);
        }

        // ======================================
        // MOVIMIENTO DE INVENTARIO
        // ======================================

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
    }

    // ==========================================
    // ACTUALIZAR CAJA
    // ==========================================

    if (forma_pago === "EFECTIVO") {
      await client.query(
        `
          UPDATE cajas
          SET
            efectivo =
              COALESCE(efectivo, 0) + $1,
            total_ventas =
              COALESCE(total_ventas, 0) + $1,
            total_costos =
              COALESCE(total_costos, 0) + $2,
            ganancia =
              COALESCE(ganancia, 0) + ($1 - $2),
            cantidad_facturas =
              COALESCE(cantidad_facturas, 0) + 1,
            cantidad_productos =
              COALESCE(cantidad_productos, 0) + $3
          WHERE
            id = $4
            AND empresa_id = $5
          `,
        [total, totalCostos, cantidadProductos, cajaId, req.usuario.empresa_id],
      );
    }

    if (forma_pago === "TARJETA") {
      await client.query(
        `
          UPDATE cajas
          SET
            tarjeta =
              COALESCE(tarjeta, 0) + $1,
            total_ventas =
              COALESCE(total_ventas, 0) + $1,
            total_costos =
              COALESCE(total_costos, 0) + $2,
            ganancia =
              COALESCE(ganancia, 0) + ($1 - $2),
            cantidad_facturas =
              COALESCE(cantidad_facturas, 0) + 1,
            cantidad_productos =
              COALESCE(cantidad_productos, 0) + $3
          WHERE
            id = $4
            AND empresa_id = $5
          `,
        [total, totalCostos, cantidadProductos, cajaId, req.usuario.empresa_id],
      );
    }

    if (forma_pago === "TRANSFERENCIA") {
      await client.query(
        `
          UPDATE cajas
          SET
            transferencia =
              COALESCE(transferencia, 0) + $1,
            total_ventas =
              COALESCE(total_ventas, 0) + $1,
            total_costos =
              COALESCE(total_costos, 0) + $2,
            ganancia =
              COALESCE(ganancia, 0) + ($1 - $2),
            cantidad_facturas =
              COALESCE(cantidad_facturas, 0) + 1,
            cantidad_productos =
              COALESCE(cantidad_productos, 0) + $3
          WHERE
            id = $4
            AND empresa_id = $5
          `,
        [total, totalCostos, cantidadProductos, cajaId, req.usuario.empresa_id],
      );
    }

    // ==========================================
    // CERRAR CUENTA
    // ==========================================

    await client.query(
      `
        UPDATE cuentas
        SET
          estado = 'CERRADA',
          closed_at = NOW()
        WHERE
          id = $1
        `,
      [cuentaId],
    );

    // ==========================================
    // COMMIT
    // ==========================================

    await client.query("COMMIT");

    res.status(200).json({
      mensaje: "Cuenta cerrada correctamente.",

      factura_id: facturaId,

      cuenta_id: Number(cuentaId),

      mesa_id: cuenta.mesa_id,

      mesa_nombre: cuenta.mesa_nombre,
      subtotal,

      propina_aplicada: aplicarPropina,

      propina,

      itbis_aplicado: aplicarItbis,

      itbis,

      total,

      forma_pago,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error al cerrar cuenta:", error);

    res.status(500).json({
      mensaje: error.message || "Error al cerrar la cuenta.",
    });
  } finally {
    client.release();
  }
});

module.exports = router;
