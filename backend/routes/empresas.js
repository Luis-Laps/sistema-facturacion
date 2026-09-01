const express = require("express");

const router = express.Router();

const pool = require("../db/conexion");

const bcrypt = require("bcrypt");

const validarToken = require("../middleware/auth");

// ==========================================
// LISTAR EMPRESAS
// SOLO SUPER ADMIN
// ==========================================

router.get("/", validarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== "SUPER_ADMIN") {
      return res.status(403).json({
        mensaje: "No tienes permisos para acceder a las empresas.",
      });
    }

    const result = await pool.query(`
      SELECT
        id,
        nombre,
        rnc,
        telefono,
        direccion,
        correo,
        logo_url,
        color_principal,
        propina_ley,
        itbis_ley,
        activo,
        fecha_vencimiento,
        created_at
      FROM empresas
      ORDER BY id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener empresas:", error);

    res.status(500).json({
      mensaje: "Error al obtener empresas",
    });
  }
});

// ==========================================
// CREAR EMPRESA + ADMINISTRADOR
// SOLO SUPER ADMIN
// ==========================================

router.post("/", validarToken, async (req, res) => {
  const client = await pool.connect();

  try {
    if (req.usuario.rol !== "SUPER_ADMIN") {
      return res.status(403).json({
        mensaje: "No tienes permisos para crear empresas.",
      });
    }

    const {
      nombre,
      rnc,
      telefono,
      direccion,
      correo,
      logo_url,
      color_principal,
      propina_ley,
      itbis_ley,
      admin_nombre,
      admin_usuario,
      admin_password,
    } = req.body;

    // ==========================================
    // VALIDACIONES
    // ==========================================

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre de la empresa es obligatorio.",
      });
    }

    if (!admin_nombre || !admin_nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre del administrador es obligatorio.",
      });
    }

    if (!admin_usuario || !admin_usuario.trim()) {
      return res.status(400).json({
        mensaje: "El usuario del administrador es obligatorio.",
      });
    }

    if (!admin_password) {
      return res.status(400).json({
        mensaje: "La contraseña del administrador es obligatoria.",
      });
    }

    // ==========================================
    // VERIFICAR QUE EL USUARIO NO EXISTA
    // ==========================================

    const usuarioExiste = await pool.query(
      `
      SELECT id
      FROM usuarios
      WHERE usuario = $1
      `,
      [admin_usuario.trim()],
    );

    if (usuarioExiste.rows.length > 0) {
      return res.status(400).json({
        mensaje: "El usuario del administrador ya existe.",
      });
    }

    // ==========================================
    // INICIAR TRANSACCIÓN
    // ==========================================

    await client.query("BEGIN");

    // ==========================================
    // CREAR EMPRESA
    // ==========================================

    const empresaResult = await client.query(
      `
      INSERT INTO empresas
      (
        nombre,
        rnc,
        telefono,
        direccion,
        correo,
        logo_url,
        color_principal,
        propina_ley,
        itbis_ley,
        activo
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING *
      `,
      [
        nombre.trim(),
        rnc || null,
        telefono || null,
        direccion || null,
        correo || null,
        logo_url || null,
        color_principal || "#198754",
        propina_ley === true,
        itbis_ley === true,
      ],
    );

    const empresa = empresaResult.rows[0];

    // ==========================================
    // ENCRIPTAR CONTRASEÑA
    // ==========================================

    const passwordHash = await bcrypt.hash(admin_password, 10);

    // ==========================================
    // CREAR ADMINISTRADOR
    // ==========================================

    const usuarioResult = await client.query(
      `
      INSERT INTO usuarios
      (
        nombre,
        usuario,
        password,
        rol,
        activo,
        empresa_id
      )
      VALUES
      ($1, $2, $3, 'ADMIN', true, $4)
      RETURNING
        id,
        nombre,
        usuario,
        rol,
        empresa_id
      `,
      [admin_nombre.trim(), admin_usuario.trim(), passwordHash, empresa.id],
    );

    const administrador = usuarioResult.rows[0];

    // ==========================================
    // CONFIRMAR TODO
    // ==========================================

    await client.query("COMMIT");

    res.status(201).json({
      mensaje: "Empresa creada correctamente.",
      empresa,
      administrador,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error al crear empresa:", error);

    res.status(500).json({
      mensaje: "Error al crear la empresa.",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// ==========================================
// EDITAR EMPRESA
// SOLO SUPER ADMIN
// ==========================================

router.put("/:id", validarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== "SUPER_ADMIN") {
      return res.status(403).json({
        mensaje: "No tienes permisos para editar empresas.",
      });
    }

    const { id } = req.params;

    const {
      nombre,
      rnc,
      telefono,
      direccion,
      correo,
      logo_url,
      color_principal,
      propina_ley,
      itbis_ley,
    } = req.body;

    // ==========================================
    // VALIDAR NOMBRE
    // ==========================================

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        mensaje: "El nombre de la empresa es obligatorio.",
      });
    }

    // ==========================================
    // VERIFICAR EMPRESA
    // ==========================================

    const empresaExiste = await pool.query(
      `
      SELECT id
      FROM empresas
      WHERE id = $1
      `,
      [id],
    );

    if (empresaExiste.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada.",
      });
    }

    // ==========================================
    // ACTUALIZAR EMPRESA
    // ==========================================

    const result = await pool.query(
      `
      UPDATE empresas
      SET
        nombre = $1,
        rnc = $2,
        telefono = $3,
        direccion = $4,
        correo = $5,
        logo_url = $6,
        color_principal = $7,
        propina_ley = $8,
        itbis_ley = $9
      WHERE id = $10
      RETURNING
        id,
        nombre,
        rnc,
        telefono,
        direccion,
        correo,
        logo_url,
        color_principal,
        propina_ley,
        itbis_ley,
        activo,
        fecha_vencimiento,
        created_at
      `,
      [
        nombre.trim(),
        rnc || null,
        telefono || null,
        direccion || null,
        correo || null,
        logo_url || null,
        color_principal || "#198754",
        propina_ley === true,
        itbis_ley === true,
        id,
      ],
    );

    res.json({
      mensaje: "Empresa actualizada correctamente.",
      empresa: result.rows[0],
    });
  } catch (error) {
    console.error("Error al editar empresa:", error);

    res.status(500).json({
      mensaje: "Error al editar la empresa.",
      error: error.message,
    });
  }
});

// ==========================================
// ELIMINAR EMPRESA
// DESACTIVACIÓN LÓGICA
// SOLO SUPER ADMIN
// ==========================================

router.delete("/:id", validarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== "SUPER_ADMIN") {
      return res.status(403).json({
        mensaje: "No tienes permisos para eliminar empresas.",
      });
    }

    const { id } = req.params;

    // ==========================================
    // VERIFICAR EMPRESA
    // ==========================================

    const empresaExiste = await pool.query(
      `
      SELECT id, nombre, activo
      FROM empresas
      WHERE id = $1
      `,
      [id],
    );

    if (empresaExiste.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Empresa no encontrada.",
      });
    }

    // ==========================================
    // DESACTIVAR EMPRESA
    // ==========================================

    const result = await pool.query(
      `
      UPDATE empresas
      SET activo = FALSE
      WHERE id = $1
      RETURNING
        id,
        nombre,
        activo
      `,
      [id],
    );

    res.json({
      mensaje: "Empresa eliminada correctamente.",
      empresa: result.rows[0],
    });
  } catch (error) {
    console.error("Error al eliminar empresa:", error);

    res.status(500).json({
      mensaje: "Error al eliminar la empresa.",
      error: error.message,
    });
  }
});

module.exports = router;
