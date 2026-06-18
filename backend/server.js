require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const productosRoutes = require("./routes/productos");
const clientesRoutes = require("./routes/clientes");
const usuariosRoutes = require("./routes/usuarios");
const configuracionRoutes = require("./routes/configuracion");
const facturasRoutes = require("./routes/facturas");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/facturas", facturasRoutes);
app.get("/", (req, res) => {
  res.send("API Sistema de Facturación");
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});
