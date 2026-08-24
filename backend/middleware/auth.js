const jwt = require("jsonwebtoken");

const validarToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        mensaje: "Token requerido",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // SUPER_ADMIN no necesita empresa asignada
    if (decoded.rol !== "SUPER_ADMIN" && !decoded.empresa_id) {
      return res.status(401).json({
        mensaje: "Usuario sin empresa asignada",
      });
    }

    req.usuario = decoded;

    next();
  } catch (error) {
    console.error("Error autenticando:", error);

    if (!res.headersSent) {
      return res.status(401).json({
        mensaje: "Token inválido",
      });
    }
  }
};

module.exports = validarToken;
