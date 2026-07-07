const express = require("express");
const router = express.Router();

const pool = require("../db/conexion");
const validarToken = require("../middleware/auth");

// ==========================================
// LISTAR PRODUCTOS
// ==========================================
router.get("/", validarToken, async (req, res) => {
  try {
    const result = await pool.query(`
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
      ORDER BY p.id DESC
    `);

    res.json(result.rows);
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
router.post("/", validarToken, async (req, res) => {
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

    // Validaciones
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

    // Verificar código repetido
    const existe = await pool.query(
      `
      SELECT id
      FROM productos
      WHERE codigo = $1
      `,
      [codigo],
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        mensaje: "Ya existe un producto con ese código.",
      });
    }

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
    tipo
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
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
router.put("/:id", validarToken, async (req, res) => {
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

    // Validaciones
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

    // Verificar que el código no exista en otro producto
    const existe = await pool.query(
      `
      SELECT id
      FROM productos
      WHERE codigo = $1
      AND id <> $2
      `,
      [codigo, id],
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        mensaje: "Ya existe otro producto con ese código.",
      });
    }

    await pool.query(
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
WHERE id = $9
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
      ],
    );

    res.json({
      mensaje: "Producto actualizado",
    });
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
router.delete("/:id", validarToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM productos
      WHERE id = $1
      `,
      [id],
    );

    res.json({
      mensaje: "Producto eliminado",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al eliminar producto",
    });
  }
});

module.exports = router;
