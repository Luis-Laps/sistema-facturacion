import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import Clientes from "./pages/Clientes";
import Facturas from "./pages/Facturas";
import HistorialFacturas from "./pages/HistorialFacturas";
import Configuracion from "./pages/Configuracion";
import ImprimirFactura from "./pages/ImprimirFactura";
import Usuarios from "./pages/Usuarios";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/productos" element={<Productos />} />

        <Route path="/clientes" element={<Clientes />} />

        <Route path="/facturas" element={<Facturas />} />

        <Route path="/historial-facturas" element={<HistorialFacturas />} />

        <Route path="/imprimir-factura/:id" element={<ImprimirFactura />} />

        <Route
          path="/usuarios"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <Usuarios />
            </ProtectedRoute>
          }
        />

        <Route
          path="/configuracion"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <Configuracion />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
