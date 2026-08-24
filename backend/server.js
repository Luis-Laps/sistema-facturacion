require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const productosRoutes = require("./routes/productos");
const clientesRoutes = require("./routes/clientes");
const usuariosRoutes = require("./routes/usuarios");
const configuracionRoutes = require("./routes/configuracion");
const facturasRoutes = require("./routes/facturas");
const dashboardRoutes = require("./routes/dashboard");
const categoriasRoutes = require("./routes/categorias");
const cajasRoutes = require("./routes/cajas");
const empresasRoutes = require("./routes/empresas");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/facturas", facturasRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/cajas", cajasRoutes);
app.use("/api/empresas", empresasRoutes);

app.get("/", (req, res) => {
  res.send("API Sistema de Facturación");
});

// 👇 Agrega esto
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});
