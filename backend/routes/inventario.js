const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

const validarModulo = require("../middleware/modulo");

// ==========================================
// PERMISOS DE INVENTARIO
// ==========================================

const validarPermisoInventario = (req, res, next) => {
  if (req.usuario.rol !== "ADMIN" && req.usuario.rol !== "SUPER_ADMIN") {
    return res.status(403).json({
      mensaje: "No tienes permisos para gestionar el inventario.",
    });
  }

  next();
};

// ==========================================
// LISTAR EXISTENCIAS
// ==========================================

router.get(
  "/existencias",
  validarToken,
  validarModulo("INVENTARIO"),
  async (req, res) => {
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
          p.tipo,
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
            OR c.nombre ILIKE $2
          )
        ORDER BY p.nombre ASC
        `,
        [req.usuario.empresa_id, `%${buscar}%`],
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Error al obtener existencias:", error);

      res.status(500).json({
        mensaje: "Error al obtener existencias.",
      });
    }
  },
);

// ==========================================
// OBTENER PRODUCTO PARA INVENTARIO
// ==========================================

router.get(
  "/producto/:id",
  validarToken,
  validarModulo("INVENTARIO"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
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
        `,
        [id, req.usuario.empresa_id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          mensaje: "Producto no encontrado.",
        });
      }

      const producto = result.rows[0];

      if (producto.tipo !== "PRODUCTO") {
        return res.status(400).json({
          mensaje: "Este artículo no maneja inventario.",
        });
      }

      res.json(producto);
    } catch (error) {
      console.error("Error al obtener producto:", error);

      res.status(500).json({
        mensaje: "Error al obtener producto.",
      });
    }
  },
);

// ==========================================
// ENTRADA DE INVENTARIO
// ==========================================

router.post(
  "/entrada",
  validarToken,
  validarModulo("INVENTARIO"),
  validarPermisoInventario,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { producto_id, cantidad } = req.body;

      const productoId = Number(producto_id);
      const cantidadNumero = Number(cantidad);

      // ==========================================
      // VALIDACIONES
      // ==========================================

      if (!Number.isInteger(productoId) || productoId <= 0) {
        throw new Error("Producto inválido.");
      }

      if (!Number.isInteger(cantidadNumero) || cantidadNumero <= 0) {
        throw new Error(
          "La cantidad debe ser un número entero mayor que cero.",
        );
      }

      // ==========================================
      // BUSCAR Y BLOQUEAR PRODUCTO
      // ==========================================

      const productoResult = await client.query(
        `
        SELECT
          id,
          nombre,
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

      // ==========================================
      // SOLO PRODUCTOS MANEJAN INVENTARIO
      // ==========================================

      if (producto.tipo !== "PRODUCTO") {
        throw new Error("Los alimentos y servicios no manejan inventario.");
      }

      // ==========================================
      // ACTUALIZAR STOCK
      // ==========================================

      const stockAnterior = Number(producto.stock) || 0;

      const nuevoStock = stockAnterior + cantidadNumero;

      await client.query(
        `
        UPDATE productos
        SET stock = $1
        WHERE
          id = $2
          AND empresa_id = $3
        `,
        [nuevoStock, productoId, req.usuario.empresa_id],
      );

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
          'ENTRADA',
          $2,
          NOW()
        )
        `,
        [productoId, cantidadNumero],
      );

      await client.query("COMMIT");

      res.status(201).json({
        mensaje: "Entrada de inventario registrada correctamente.",
        producto_id: productoId,
        producto: producto.nombre,
        stock_anterior: stockAnterior,
        cantidad: cantidadNumero,
        stock_nuevo: nuevoStock,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Error en entrada de inventario:", error);

      res.status(400).json({
        mensaje: error.message,
      });
    } finally {
      client.release();
    }
  },
);

// ==========================================
// SALIDA DE INVENTARIO
// ==========================================

router.post(
  "/salida",
  validarToken,
  validarModulo("INVENTARIO"),
  validarPermisoInventario,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { producto_id, cantidad } = req.body;

      const productoId = Number(producto_id);
      const cantidadNumero = Number(cantidad);

      // ==========================================
      // VALIDACIONES
      // ==========================================

      if (!Number.isInteger(productoId) || productoId <= 0) {
        throw new Error("Producto inválido.");
      }

      if (!Number.isInteger(cantidadNumero) || cantidadNumero <= 0) {
        throw new Error(
          "La cantidad debe ser un número entero mayor que cero.",
        );
      }

      // ==========================================
      // BUSCAR Y BLOQUEAR PRODUCTO
      // ==========================================

      const productoResult = await client.query(
        `
        SELECT
          id,
          nombre,
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

      // ==========================================
      // SOLO PRODUCTOS MANEJAN INVENTARIO
      // ==========================================

      if (producto.tipo !== "PRODUCTO") {
        throw new Error("Los alimentos y servicios no manejan inventario.");
      }

      // ==========================================
      // VALIDAR STOCK
      // ==========================================

      const stockAnterior = Number(producto.stock) || 0;

      if (stockAnterior < cantidadNumero) {
        throw new Error(`Stock insuficiente. Disponible: ${stockAnterior}.`);
      }

      // ==========================================
      // ACTUALIZAR STOCK
      // ==========================================

      const nuevoStock = stockAnterior - cantidadNumero;

      await client.query(
        `
        UPDATE productos
        SET stock = $1
        WHERE
          id = $2
          AND empresa_id = $3
        `,
        [nuevoStock, productoId, req.usuario.empresa_id],
      );

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
        [productoId, cantidadNumero],
      );

      await client.query("COMMIT");

      res.status(201).json({
        mensaje: "Salida de inventario registrada correctamente.",
        producto_id: productoId,
        producto: producto.nombre,
        stock_anterior: stockAnterior,
        cantidad: cantidadNumero,
        stock_nuevo: nuevoStock,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Error en salida de inventario:", error);

      res.status(400).json({
        mensaje: error.message,
      });
    } finally {
      client.release();
    }
  },
);

// ==========================================
// AJUSTE DE INVENTARIO
// ==========================================

router.post(
  "/ajuste",
  validarToken,
  validarModulo("INVENTARIO"),
  validarPermisoInventario,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { producto_id, cantidad } = req.body;

      const productoId = Number(producto_id);
      const cantidadNueva = Number(cantidad);

      // ==========================================
      // VALIDACIONES
      // ==========================================

      if (!Number.isInteger(productoId) || productoId <= 0) {
        throw new Error("Producto inválido.");
      }

      if (!Number.isInteger(cantidadNueva) || cantidadNueva < 0) {
        throw new Error(
          "La cantidad del ajuste debe ser un número entero mayor o igual a cero.",
        );
      }

      // ==========================================
      // BUSCAR Y BLOQUEAR PRODUCTO
      // ==========================================

      const productoResult = await client.query(
        `
        SELECT
          id,
          nombre,
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

      // ==========================================
      // SOLO PRODUCTOS MANEJAN INVENTARIO
      // ==========================================

      if (producto.tipo !== "PRODUCTO") {
        throw new Error("Los alimentos y servicios no manejan inventario.");
      }

      const stockAnterior = Number(producto.stock) || 0;

      // ==========================================
      // CALCULAR DIFERENCIA
      // ==========================================

      const diferencia = cantidadNueva - stockAnterior;

      if (diferencia === 0) {
        throw new Error("El ajuste no genera ningún cambio en el inventario.");
      }

      // ==========================================
      // ACTUALIZAR STOCK
      // ==========================================

      await client.query(
        `
        UPDATE productos
        SET stock = $1
        WHERE
          id = $2
          AND empresa_id = $3
        `,
        [cantidadNueva, productoId, req.usuario.empresa_id],
      );

      // ==========================================
      // REGISTRAR AJUSTE
      // ==========================================
      //
      // Guardamos la diferencia:
      //
      // +5 = entraron 5
      // -5 = salieron 5
      //

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
          'AJUSTE',
          $2,
          NOW()
        )
        `,
        [productoId, diferencia],
      );

      await client.query("COMMIT");

      res.status(201).json({
        mensaje: "Ajuste de inventario registrado correctamente.",
        producto_id: productoId,
        producto: producto.nombre,
        stock_anterior: stockAnterior,
        stock_nuevo: cantidadNueva,
        diferencia,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Error en ajuste de inventario:", error);

      res.status(400).json({
        mensaje: error.message,
      });
    } finally {
      client.release();
    }
  },
);

// ==========================================
// KARDEX / MOVIMIENTOS
// ==========================================

router.get(
  "/movimientos",
  validarToken,
  validarModulo("INVENTARIO"),
  async (req, res) => {
    try {
      const { producto_id, tipo, fecha_desde, fecha_hasta } = req.query;

      const parametros = [req.usuario.empresa_id];

      const condiciones = ["p.empresa_id = $1", "p.tipo = 'PRODUCTO'"];

      // ==========================================
      // FILTRO PRODUCTO
      // ==========================================

      if (producto_id) {
        parametros.push(Number(producto_id));

        condiciones.push(`m.producto_id = $${parametros.length}`);
      }

      // ==========================================
      // FILTRO TIPO
      // ==========================================

      if (tipo) {
        const tiposPermitidos = ["ENTRADA", "SALIDA", "AJUSTE"];

        if (!tiposPermitidos.includes(tipo)) {
          return res.status(400).json({
            mensaje: "Tipo de movimiento inválido.",
          });
        }

        parametros.push(tipo);

        condiciones.push(`m.tipo = $${parametros.length}`);
      }

      // ==========================================
      // FECHA DESDE
      // ==========================================

      if (fecha_desde) {
        parametros.push(fecha_desde);

        condiciones.push(`m.fecha >= $${parametros.length}`);
      }

      // ==========================================
      // FECHA HASTA
      // ==========================================

      if (fecha_hasta) {
        parametros.push(fecha_hasta);

        condiciones.push(
          `m.fecha < ($${parametros.length}::date + INTERVAL '1 day')`,
        );
      }

      // ==========================================
      // CONSULTAR MOVIMIENTOS
      // ==========================================

      const result = await pool.query(
        `
        SELECT
          m.id,
          m.producto_id,
          p.codigo,
          p.nombre,
          m.tipo,
          m.cantidad,
          m.fecha
        FROM movimientos m
        INNER JOIN productos p
          ON p.id = m.producto_id
        WHERE
          ${condiciones.join(" AND ")}
        ORDER BY
          m.fecha DESC,
          m.id DESC
        `,
        parametros,
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Error al obtener movimientos:", error);

      res.status(500).json({
        mensaje: "Error al obtener movimientos de inventario.",
      });
    }
  },
);

// ==========================================
// KARDEX DE UN PRODUCTO
// ==========================================

router.get(
  "/kardex/:id",
  validarToken,
  validarModulo("INVENTARIO"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // ==========================================
      // VERIFICAR PRODUCTO
      // ==========================================

      const productoResult = await pool.query(
        `
        SELECT
          id,
          codigo,
          nombre,
          stock,
          tipo
        FROM productos
        WHERE
          id = $1
          AND empresa_id = $2
          AND activo = TRUE
        `,
        [id, req.usuario.empresa_id],
      );

      if (productoResult.rows.length === 0) {
        return res.status(404).json({
          mensaje: "Producto no encontrado.",
        });
      }

      const producto = productoResult.rows[0];

      if (producto.tipo !== "PRODUCTO") {
        return res.status(400).json({
          mensaje: "Este artículo no maneja inventario.",
        });
      }

      // ==========================================
      // OBTENER MOVIMIENTOS
      // ==========================================

      const movimientos = await pool.query(
        `
          SELECT
            id,
            tipo,
            cantidad,
            fecha
          FROM movimientos
          WHERE producto_id = $1
          ORDER BY
            fecha ASC,
            id ASC
          `,
        [id],
      );

      res.json({
        producto,
        movimientos: movimientos.rows,
      });
    } catch (error) {
      console.error("Error al obtener Kardex:", error);

      res.status(500).json({
        mensaje: "Error al obtener Kardex.",
      });
    }
  },
);

module.exports = router;
