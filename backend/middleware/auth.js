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

    console.log("TOKEN:", token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("DECODED:", decoded);

    req.usuario = decoded;

    next();
  } catch (error) {
    console.error(error);

    return res.status(401).json({
      mensaje: "Token inválido",
    });
  }
};

module.exports = validarToken;
