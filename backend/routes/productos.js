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
        c.nombre AS categoria
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
      FILTER (WHERE tipo = 'PRODUCTO' AND stock > 0),
      0
    ) AS inversion,

    COALESCE(
      SUM(
        (precio_venta - costo_compra) * stock
      )
      FILTER (WHERE tipo = 'PRODUCTO' AND stock > 0),
      0
    ) AS ganancia_proyectada,

    COALESCE(
      SUM(precio_venta * stock)
      FILTER (WHERE tipo = 'PRODUCTO' AND stock > 0),
      0
    ) AS valor_total
  FROM productos
  WHERE empresa_id = $1
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
  try {
    const {
      codigo,
      nombre,
      descripcion,
      categoria_id,
      costo_compra,
      precio_venta,
      stock,
      tipo,
    } = req.body;

    if (!nombre || !categoria_id || (tipo === "PRODUCTO" && !codigo)) {
      return res.status(400).json({
        mensaje: "Complete todos los campos obligatorios.",
      });
    }

    if (Number(costo_compra) < 0) {
      return res.status(400).json({
        mensaje: "El costo de compra no puede ser negativo.",
      });
    }

    if (Number(precio_venta) < 0) {
      return res.status(400).json({
        mensaje: "El precio de venta no puede ser negativo.",
      });
    }

    if (Number(stock) < 0) {
      return res.status(400).json({
        mensaje: "La cantidad no puede ser negativa.",
      });
    }

    // ==========================================
    // VERIFICAR CATEGORÍA
    // ==========================================

    const categoria = await pool.query(
      `
      SELECT id
      FROM categorias
      WHERE id = $1
      AND empresa_id = $2
      `,
      [categoria_id, req.usuario.empresa_id],
    );

    if (categoria.rows.length === 0) {
      return res.status(400).json({
        mensaje: "La categoría no pertenece a esta empresa.",
      });
    }

    // ==========================================
    // VERIFICAR CÓDIGO EN ESTA EMPRESA
    // ==========================================
    if (tipo === "PRODUCTO") {
      const existe = await pool.query(
        `
    SELECT id
    FROM productos
    WHERE codigo = $1
    AND empresa_id = $2
    `,
        [codigo, req.usuario.empresa_id],
      );

      if (existe.rows.length > 0) {
        return res.status(400).json({
          mensaje: "Ya existe un producto con ese código en esta empresa.",
        });
      }
    }

    // ==========================================
    // CREAR PRODUCTO
    // ==========================================

    const result = await pool.query(
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
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        codigo,
        nombre,
        descripcion,
        categoria_id,
        costo_compra,
        precio_venta,
        stock,
        tipo || "PRODUCTO",
        req.usuario.empresa_id,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al crear producto",
    });
  }
});

// ==========================================
// ACTUALIZAR PRODUCTO
// ==========================================

router.put("/:id", validarToken, validarPermisoProductos, async (req, res) => {
  try {
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
    } = req.body;

    if (!codigo || !nombre || !categoria_id) {
      return res.status(400).json({
        mensaje: "Complete todos los campos obligatorios.",
      });
    }

    if (Number(costo_compra) < 0) {
      return res.status(400).json({
        mensaje: "El costo de compra no puede ser negativo.",
      });
    }

    if (Number(precio_venta) < 0) {
      return res.status(400).json({
        mensaje: "El precio de venta no puede ser negativo.",
      });
    }

    if (Number(stock) < 0) {
      return res.status(400).json({
        mensaje: "La cantidad no puede ser negativa.",
      });
    }

    // ==========================================
    // VERIFICAR CATEGORÍA
    // ==========================================

    const categoria = await pool.query(
      `
      SELECT id
      FROM categorias
      WHERE id = $1
      AND empresa_id = $2
      `,
      [categoria_id, req.usuario.empresa_id],
    );

    if (categoria.rows.length === 0) {
      return res.status(400).json({
        mensaje: "La categoría no pertenece a esta empresa.",
      });
    }

    // ==========================================
    // VERIFICAR CÓDIGO
    // ==========================================

    const existe = await pool.query(
      `
      SELECT id
      FROM productos
      WHERE codigo = $1
      AND empresa_id = $2
      AND id <> $3
      `,
      [codigo, req.usuario.empresa_id, id],
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        mensaje: "Ya existe otro producto con ese código en esta empresa.",
      });
    }

    // ==========================================
    // ACTUALIZAR PRODUCTO
    // ==========================================

    const result = await pool.query(
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
        descripcion,
        categoria_id,
        costo_compra,
        precio_venta,
        stock,
        tipo || "PRODUCTO",
        id,
        req.usuario.empresa_id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Producto no encontrado.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al actualizar producto",
    });
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
        WHERE id = $1
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
