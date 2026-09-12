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
import ImprimirCuentaPendiente from "./pages/ImprimirCuentaPendiente";
import ImprimirCierreCaja from "./pages/ImprimirCierreCaja";

// ==========================================
// FERRETERÍA
// ==========================================

import FerreteriaNuevaFactura from "./pages/FerreteriaNuevaFactura";
import FerreteriaFacturasAbiertas from "./pages/FerreteriaFacturasAbiertas";
import FerreteriaFacturaAbierta from "./pages/FerreteriaFacturaAbierta";
import Proveedores from "./pages/Proveedores";
import FerreteriaHistorialFacturas from "./pages/FerreteriaHistorialFacturas";

// ==========================================
// COMPONENTES
// ==========================================

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==========================================
            LOGIN
        ========================================== */}

        <Route path="/" element={<Login />} />

        {/* ==========================================
            SISTEMA
        ========================================== */}

        <Route
          path="*"
          element={
            <div className="app-layout">
              <Navbar />

              <main className="app-content">
                <Routes>
                  {/* ==================================
                      PRINCIPAL
                  ================================== */}

                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* ==================================
                      PRODUCTOS
                  ================================== */}

                  <Route path="/productos" element={<Productos />} />

                  <Route path="/categorias" element={<Categorias />} />

                  {/* ==================================
                      CLIENTES
                  ================================== */}

                  <Route path="/clientes" element={<Clientes />} />

                  {/* ==================================
                      FACTURACIÓN ESTÁNDAR
                  ================================== */}

                  <Route path="/facturas" element={<Facturas />} />

                  <Route
                    path="/historial-facturas"
                    element={<HistorialFacturas />}
                  />

                  <Route path="/cotizacion" element={<Cotizacion />} />

                  {/* ==================================
                      FERRETERÍA
                  ================================== */}

                  <Route
                    path="/ferreteria/nueva-factura"
                    element={<FerreteriaNuevaFactura />}
                  />

                  <Route
                    path="/ferreteria/facturas-abiertas"
                    element={<FerreteriaFacturasAbiertas />}
                  />

                  <Route
                    path="/ferreteria/facturas-abiertas/:id"
                    element={<FerreteriaFacturaAbierta />}
                  />

                  <Route
                    path="/ferreteria/historial-facturas"
                    element={<FerreteriaHistorialFacturas />}
                  />

                  {/* ==================================
                      REPORTES
                  ================================== */}

                  <Route path="/reportes-caja" element={<ReportesCaja />} />

                  {/* ==================================
                      EMPRESAS
                  ================================== */}

                  <Route
                    path="/empresas"
                    element={
                      <ProtectedRoute roles={["SUPER_ADMIN"]}>
                        <Empresas />
                      </ProtectedRoute>
                    }
                  />

                  {/* ==================================
                      USUARIOS
                  ================================== */}

                  <Route
                    path="/usuarios"
                    element={
                      <ProtectedRoute roles={["ADMIN"]}>
                        <Usuarios />
                      </ProtectedRoute>
                    }
                  />

                  {/* ==================================
                      CONFIGURACIÓN
                  ================================== */}

                  <Route
                    path="/configuracion"
                    element={
                      <ProtectedRoute roles={["ADMIN"]}>
                        <Configuracion />
                      </ProtectedRoute>
                    }
                  />

                  {/* ==================================
                      CONTROL DE ORDEN
                  ================================== */}

                  <Route path="/control-orden" element={<ControlOrden />} />

                  <Route
                    path="/control-orden/mesa/:mesaId"
                    element={<MesaOrden />}
                  />

                  {/* ==================================
                      IMPRESIÓN DE FACTURA
                  ================================== */}

                  <Route
                    path="/imprimir-factura/:id"
                    element={<ImprimirFacturaTicket />}
                  />
                  <Route
                    path="/imprimir-cierre-caja/:id"
                    element={<ImprimirCierreCaja />}
                  />

                  {/* ==================================
                      IMPRESIÓN DE CUENTA PENDIENTE
                  ================================== */}

                  <Route
                    path="/imprimir-cuenta-pendiente/:id"
                    element={<ImprimirCuentaPendiente />}
                  />
                  <Route path="/proveedores" element={<Proveedores />} />
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
