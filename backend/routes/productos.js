const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const validarToken = require("../middleware/auth");

// ==========================================
// PERMISOS DE PRODUCTOS
// ==========================================

const validarPermisoProductos = (req, res, next) => {
  if (req.usuario.rol !== "ADMIN" && req.usuario.rol !== "SUPER_ADMIN") {
    return res.status(403).json({
      mensaje: "No tienes permisos para gestionar productos.",
    });
  }

  next();
};

// ==========================================
// OBTENER TIPO DE EMPRESA
// ==========================================

const obtenerTipoEmpresa = async (empresaId) => {
  const result = await pool.query(
    `
    SELECT tipo
    FROM empresas
    WHERE id = $1
    `,
    [empresaId],
  );

  if (result.rows.length === 0) {
    throw new Error("Empresa no encontrada.");
  }

  return result.rows[0].tipo;
};

// ==========================================
// VALIDAR PROVEEDOR
// ==========================================

const validarProveedor = async (proveedorId, empresaId) => {
  if (!proveedorId) {
    return null;
  }

  const result = await pool.query(
    `
    SELECT
      id,
      nombre
    FROM proveedores
    WHERE
      id = $1
      AND empresa_id = $2
      AND activo = TRUE
    `,
    [proveedorId, empresaId],
  );

  if (result.rows.length === 0) {
    throw new Error(
      "El proveedor no pertenece a esta empresa o está inactivo.",
    );
  }

  return result.rows[0];
};

// ==========================================
// LISTAR PRODUCTOS
// ==========================================

router.get("/", validarToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, buscar = "" } = req.query;

    const pagina = Number(page);
    const limite = Number(limit);
    const offset = (pagina - 1) * limite;

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
          c.nombre AS categoria,

          pp.proveedor_id,
          pr.nombre AS proveedor_nombre

        FROM productos p

        LEFT JOIN categorias c
          ON c.id = p.categoria_id
          AND c.empresa_id = p.empresa_id

        LEFT JOIN producto_proveedores pp
          ON pp.producto_id = p.id
          AND pp.es_principal = TRUE

        LEFT JOIN proveedores pr
          ON pr.id = pp.proveedor_id
          AND pr.empresa_id = p.empresa_id

        WHERE
          p.activo = TRUE
          AND p.empresa_id = $1
          AND (
            p.nombre ILIKE $2
            OR p.codigo ILIKE $2
            OR c.nombre ILIKE $2
          )

        ORDER BY p.id DESC

        LIMIT $3
        OFFSET $4
        `,
      [req.usuario.empresa_id, `%${buscar}%`, limite, offset],
    );

    const total = await pool.query(
      `
        SELECT COUNT(*) total

        FROM productos p

        LEFT JOIN categorias c
          ON c.id = p.categoria_id
          AND c.empresa_id = p.empresa_id

        WHERE
          p.activo = TRUE
          AND p.empresa_id = $1
          AND (
            p.nombre ILIKE $2
            OR p.codigo ILIKE $2
            OR c.nombre ILIKE $2
          )
        `,
      [req.usuario.empresa_id, `%${buscar}%`],
    );

    const totalRegistros = Number(total.rows[0].total);

    const resumenInventario = await pool.query(
      `
          SELECT
            COALESCE(
              SUM(costo_compra * stock)
              FILTER (
                WHERE tipo = 'PRODUCTO'
                AND stock > 0
              ),
              0
            ) AS inversion,

            COALESCE(
              SUM(
                (precio_venta - costo_compra) * stock
              )
              FILTER (
                WHERE tipo = 'PRODUCTO'
                AND stock > 0
              ),
              0
            ) AS ganancia_proyectada,

            COALESCE(
              SUM(precio_venta * stock)
              FILTER (
                WHERE tipo = 'PRODUCTO'
                AND stock > 0
              ),
              0
            ) AS valor_total

          FROM productos

          WHERE
            empresa_id = $1
            AND activo = TRUE
          `,
      [req.usuario.empresa_id],
    );

    res.json({
      data: result.rows,

      total: totalRegistros,

      page: pagina,

      totalPages: Math.ceil(totalRegistros / limite),

      inversion: Number(resumenInventario.rows[0].inversion),

      gananciaProyectada: Number(resumenInventario.rows[0].ganancia_proyectada),

      valorTotal: Number(resumenInventario.rows[0].valor_total),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al obtener productos",
    });
  }
});

// ==========================================
// CREAR PRODUCTO
// ==========================================

router.post("/", validarToken, validarPermisoProductos, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      codigo,
      nombre,
      descripcion,
      categoria_id,
      costo_compra,
      precio_venta,
      stock,
      tipo,
      proveedor_id,
    } = req.body;

    const empresaId = req.usuario.empresa_id;

    // ==========================================
    // VALIDACIONES
    // ==========================================

    if (!nombre || !categoria_id || (tipo === "PRODUCTO" && !codigo)) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "Complete todos los campos obligatorios.",
      });
    }

    if (Number(costo_compra) < 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "El costo de compra no puede ser negativo.",
      });
    }

    if (Number(precio_venta) < 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "El precio de venta no puede ser negativo.",
      });
    }

    if (Number(stock) < 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "La cantidad no puede ser negativa.",
      });
    }

    // ==========================================
    // CATEGORÍA
    // ==========================================

    const categoria = await client.query(
      `
          SELECT id
          FROM categorias
          WHERE
            id = $1
            AND empresa_id = $2
          `,
      [categoria_id, empresaId],
    );

    if (categoria.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "La categoría no pertenece a esta empresa.",
      });
    }

    // ==========================================
    // CÓDIGO
    // ==========================================

    if (tipo === "PRODUCTO") {
      const existe = await client.query(
        `
            SELECT id
            FROM productos
            WHERE
              codigo = $1
              AND empresa_id = $2
            `,
        [codigo, empresaId],
      );

      if (existe.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          mensaje: "Ya existe un producto con ese código en esta empresa.",
        });
      }
    }

    // ==========================================
    // PROVEEDOR
    // ==========================================

    let proveedorFinal = null;

    if (proveedor_id) {
      const tipoEmpresa = await obtenerTipoEmpresa(empresaId);

      if (tipoEmpresa !== "FERRETERIA") {
        await client.query("ROLLBACK");

        return res.status(403).json({
          mensaje:
            "Los proveedores solo están disponibles para empresas ferretería.",
        });
      }

      const proveedor = await client.query(
        `
            SELECT id
            FROM proveedores
            WHERE
              id = $1
              AND empresa_id = $2
              AND activo = TRUE
            `,
        [proveedor_id, empresaId],
      );

      if (proveedor.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          mensaje: "El proveedor no pertenece a esta empresa o está inactivo.",
        });
      }

      proveedorFinal = Number(proveedor_id);
    }

    // ==========================================
    // CREAR PRODUCTO
    // ==========================================

    const result = await client.query(
      `
          INSERT INTO productos (
            codigo,
            nombre,
            descripcion,
            categoria_id,
            costo_compra,
            precio_venta,
            stock,
            tipo,
            empresa_id
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9
          )
          RETURNING *
          `,
      [
        codigo || null,
        nombre,
        descripcion || null,
        categoria_id,
        costo_compra,
        precio_venta,
        stock,
        tipo || "PRODUCTO",
        empresaId,
      ],
    );

    const producto = result.rows[0];

    // ==========================================
    // ASIGNAR PROVEEDOR PRINCIPAL
    // ==========================================

    if (proveedorFinal && (tipo || "PRODUCTO") === "PRODUCTO") {
      await client.query(
        `
          INSERT INTO producto_proveedores (
            producto_id,
            proveedor_id,
            es_principal,
            costo
          )
          VALUES (
            $1,
            $2,
            TRUE,
            $3
          )
          `,
        [producto.id, proveedorFinal, costo_compra],
      );
    }

    await client.query("COMMIT");

    // ==========================================
    // DEVOLVER PRODUCTO + PROVEEDOR
    // ==========================================

    const finalResult = await pool.query(
      `
          SELECT
            p.*,
            pp.proveedor_id,
            pr.nombre AS proveedor_nombre
          FROM productos p

          LEFT JOIN producto_proveedores pp
            ON pp.producto_id = p.id
            AND pp.es_principal = TRUE

          LEFT JOIN proveedores pr
            ON pr.id = pp.proveedor_id

          WHERE p.id = $1
          `,
      [producto.id],
    );

    res.status(201).json(finalResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      mensaje: "Error al crear producto",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// ==========================================
// ACTUALIZAR PRODUCTO
// ==========================================

router.put("/:id", validarToken, validarPermisoProductos, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    const {
      codigo,
      nombre,
      descripcion,
      categoria_id,
      costo_compra,
      precio_venta,
      stock,
      tipo,
      proveedor_id,
    } = req.body;

    const empresaId = req.usuario.empresa_id;

    // ==========================================
    // VALIDACIONES
    // ==========================================

    if (!codigo || !nombre || !categoria_id) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "Complete todos los campos obligatorios.",
      });
    }

    if (Number(costo_compra) < 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "El costo de compra no puede ser negativo.",
      });
    }

    if (Number(precio_venta) < 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "El precio de venta no puede ser negativo.",
      });
    }

    if (Number(stock) < 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "La cantidad no puede ser negativa.",
      });
    }

    // ==========================================
    // CATEGORÍA
    // ==========================================

    const categoria = await client.query(
      `
          SELECT id
          FROM categorias
          WHERE
            id = $1
            AND empresa_id = $2
          `,
      [categoria_id, empresaId],
    );

    if (categoria.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "La categoría no pertenece a esta empresa.",
      });
    }

    // ==========================================
    // CÓDIGO
    // ==========================================

    const existe = await client.query(
      `
          SELECT id
          FROM productos
          WHERE
            codigo = $1
            AND empresa_id = $2
            AND id <> $3
          `,
      [codigo, empresaId, id],
    );

    if (existe.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "Ya existe otro producto con ese código en esta empresa.",
      });
    }

    // ==========================================
    // VERIFICAR PRODUCTO
    // ==========================================

    const productoExiste = await client.query(
      `
          SELECT id
          FROM productos
          WHERE
            id = $1
            AND empresa_id = $2
          `,
      [id, empresaId],
    );

    if (productoExiste.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        mensaje: "Producto no encontrado.",
      });
    }

    // ==========================================
    // PROVEEDOR
    // ==========================================

    let proveedorFinal = null;

    if (proveedor_id) {
      const tipoEmpresa = await obtenerTipoEmpresa(empresaId);

      if (tipoEmpresa !== "FERRETERIA") {
        await client.query("ROLLBACK");

        return res.status(403).json({
          mensaje:
            "Los proveedores solo están disponibles para empresas ferretería.",
        });
      }

      const proveedor = await client.query(
        `
            SELECT id
            FROM proveedores
            WHERE
              id = $1
              AND empresa_id = $2
              AND activo = TRUE
            `,
        [proveedor_id, empresaId],
      );

      if (proveedor.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          mensaje: "El proveedor no pertenece a esta empresa o está inactivo.",
        });
      }

      proveedorFinal = Number(proveedor_id);
    }

    // ==========================================
    // ACTUALIZAR PRODUCTO
    // ==========================================

    const result = await client.query(
      `
          UPDATE productos
          SET
            codigo = $1,
            nombre = $2,
            descripcion = $3,
            categoria_id = $4,
            costo_compra = $5,
            precio_venta = $6,
            stock = $7,
            tipo = $8
          WHERE
            id = $9
            AND empresa_id = $10
          RETURNING *
          `,
      [
        codigo,
        nombre,
        descripcion || null,
        categoria_id,
        costo_compra,
        precio_venta,
        stock,
        tipo || "PRODUCTO",
        id,
        empresaId,
      ],
    );

    // ==========================================
    // ACTUALIZAR PROVEEDOR PRINCIPAL
    // ==========================================

    await client.query(
      `
        DELETE FROM producto_proveedores
        WHERE
          producto_id = $1
        `,
      [id],
    );

    if (proveedorFinal && (tipo || "PRODUCTO") === "PRODUCTO") {
      await client.query(
        `
          INSERT INTO producto_proveedores (
            producto_id,
            proveedor_id,
            es_principal,
            costo
          )
          VALUES (
            $1,
            $2,
            TRUE,
            $3
          )
          `,
        [id, proveedorFinal, costo_compra],
      );
    }

    await client.query("COMMIT");

    // ==========================================
    // DEVOLVER PRODUCTO COMPLETO
    // ==========================================

    const finalResult = await pool.query(
      `
          SELECT
            p.*,
            pp.proveedor_id,
            pr.nombre AS proveedor_nombre
          FROM productos p

          LEFT JOIN producto_proveedores pp
            ON pp.producto_id = p.id
            AND pp.es_principal = TRUE

          LEFT JOIN proveedores pr
            ON pr.id = pp.proveedor_id

          WHERE
            p.id = $1
            AND p.empresa_id = $2
          `,
      [id, empresaId],
    );

    res.json(finalResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      mensaje: "Error al actualizar producto",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// ==========================================
// ELIMINAR PRODUCTO
// ==========================================

router.delete(
  "/:id",
  validarToken,
  validarPermisoProductos,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
          DELETE FROM productos
          WHERE
            id = $1
            AND empresa_id = $2
          RETURNING id
          `,
        [id, req.usuario.empresa_id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          mensaje: "Producto no encontrado.",
        });
      }

      res.json({
        mensaje: "Producto eliminado",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        mensaje: "Error al eliminar producto",
      });
    }
  },
);

module.exports = router;
