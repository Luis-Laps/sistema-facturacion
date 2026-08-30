import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import Categorias from "./pages/Categorias";
import Clientes from "./pages/Clientes";
import Facturas from "./pages/Facturas";
import HistorialFacturas from "./pages/HistorialFacturas";
import Configuracion from "./pages/Configuracion";
import ImprimirFacturaTicket from "./pages/ImprimirFacturaTicket";
import Usuarios from "./pages/Usuarios";
import ReportesCaja from "./pages/ReportesCaja";
import Empresas from "./pages/Empresas";
import Cotizacion from "./pages/Cotizacion";
import ControlOrden from "./pages/ControlOrden";
import MesaOrden from "./pages/MesaOrden";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route path="/" element={<Login />} />

        {/* SISTEMA */}
        <Route
          path="*"
          element={
            <div className="app-layout">
              <Navbar />

              <main className="app-content">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />

                  <Route path="/productos" element={<Productos />} />

                  <Route path="/categorias" element={<Categorias />} />

                  <Route path="/clientes" element={<Clientes />} />

                  <Route path="/facturas" element={<Facturas />} />

                  <Route
                    path="/historial-facturas"
                    element={<HistorialFacturas />}
                  />

                  <Route path="/reportes-caja" element={<ReportesCaja />} />

                  <Route
                    path="/empresas"
                    element={
                      <ProtectedRoute roles={["SUPER_ADMIN"]}>
                        <Empresas />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/imprimir-factura/:id"
                    element={<ImprimirFacturaTicket />}
                  />

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
                  <Route path="/cotizacion" element={<Cotizacion />} />
                  <Route path="/control-orden" element={<ControlOrden />} />
                  <Route
                    path="/control-orden/mesa/:mesaId"
                    element={<MesaOrden />}
                  />
                </Routes>
              </main>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
