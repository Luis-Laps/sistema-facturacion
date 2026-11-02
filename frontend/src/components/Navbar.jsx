import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { obtenerRol } from "../utils/auth";
import api from "../services/api";
import Swal from "sweetalert2";

import "../styles/sidebar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const rol = obtenerRol();

  const [empresa, setEmpresa] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  // Estado de caja
  const [cajaAbierta, setCajaAbierta] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(false);

  // ==========================================
  // CARGAR EMPRESA Y MÓDULOS
  // ==========================================

  useEffect(() => {
    if (rol === "SUPER_ADMIN") {
      setEmpresa(null);
      setModulos([]);
      return;
    }

    const cargarDatos = async () => {
      try {
        const empresaResponse = await api.get("/configuracion");
        setEmpresa(empresaResponse.data);

        const modulosResponse = await api.get("/modulos/mis-modulos");

        setModulos(
          Array.isArray(modulosResponse.data) ? modulosResponse.data : [],
        );
      } catch (error) {
        console.error("Error al cargar empresa y módulos:", error);
        setModulos([]);
      }
    };

    cargarDatos();
  }, [rol]);

  // ==========================================
  // VERIFICAR MÓDULO
  // ==========================================

  const tieneModulo = (codigo) => {
    return modulos.some((modulo) => modulo.codigo === codigo);
  };

  // ==========================================
  // FORMATO DE MONEDA
  // ==========================================

  const moneda = (valor) =>
    Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ==========================================
  // VERIFICAR CAJA
  // ==========================================

  const verificarCaja = async () => {
    try {
      setCargandoCaja(true);

      const response = await api.get("/cajas/abierta");

      setCajaAbierta(response.data || null);
    } catch (error) {
      console.error("Error verificando caja:", error);
      setCajaAbierta(null);
    } finally {
      setCargandoCaja(false);
    }
  };

  useEffect(() => {
    if (rol === "CAJERO") {
      verificarCaja();
    }
  }, [rol]);

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // ==========================================
  // NAVEGACIÓN
  // ==========================================

  const navegar = (ruta) => {
    navigate(ruta);
    setSidebarAbierto(false);
    setMenuAbierto(null);
  };

  // ==========================================
  // PÁGINA ACTIVA
  // ==========================================

  const estaActivo = (rutas) => {
    if (!Array.isArray(rutas)) {
      rutas = [rutas];
    }

    return rutas.some(
      (ruta) =>
        location.pathname === ruta || location.pathname.startsWith(`${ruta}/`),
    );
  };

  // ==========================================
  // TOGGLE MENÚ
  // ==========================================

  const toggleMenu = (menu) => {
    setMenuAbierto((actual) => (actual === menu ? null : menu));
  };

  // ==========================================
  // ABRIR CAJA - CAJERO
  // ==========================================

  const abrirCaja = async () => {
    try {
      const response = await api.get("/cajas/abierta");

      if (response.data) {
        setCajaAbierta(response.data);

        await Swal.fire({
          icon: "info",
          title: "Caja ya abierta",
          text: "Ya existe una caja abierta. No necesitas abrir otra.",
          confirmButtonColor: "#198754",
        });

        return;
      }

      const { value, isConfirmed } = await Swal.fire({
        title: "Apertura de Caja",
        text: "Ingrese el monto inicial de la caja.",
        input: "number",
        inputLabel: "Monto inicial",
        inputPlaceholder: "0.00",
        inputAttributes: {
          min: 0,
          step: "0.01",
        },
        confirmButtonText: "Abrir Caja",
        confirmButtonColor: "#198754",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        inputValidator: (value) => {
          if (value === "" || value === null) {
            return "Debe indicar un monto.";
          }

          if (!Number.isFinite(Number(value)) || Number(value) < 0) {
            return "Ingrese un monto válido.";
          }
        },
      });

      if (!isConfirmed) return;

      await api.post("/cajas/abrir", {
        monto_inicial: Number(value),
      });

      await verificarCaja();

      await Swal.fire({
        icon: "success",
        title: "Caja abierta correctamente",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error abriendo caja:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.mensaje || "No fue posible abrir la caja.",
      });
    }
  };

  // ==========================================
  // CERRAR CAJA - MISMA LÓGICA DEL DASHBOARD
  // ==========================================

  const cerrarCaja = async () => {
    if (!cajaAbierta) {
      await verificarCaja();
      return;
    }

    const debeHaber =
      Number(cajaAbierta.monto_inicial || 0) +
      Number(cajaAbierta.efectivo || 0);

    const { value, isConfirmed } = await Swal.fire({
      title: "Cerrar Caja",
      html: `
        <div style="text-align:left">
          <div class="mb-2">
            <strong>Monto inicial:</strong>
            RD$ ${moneda(cajaAbierta.monto_inicial)}
          </div>

          <div class="mb-2">
            <strong>Ventas en efectivo:</strong>
            RD$ ${moneda(cajaAbierta.efectivo)}
          </div>

          <div class="mb-2">
            <strong>Ventas con tarjeta:</strong>
            RD$ ${moneda(cajaAbierta.tarjeta)}
          </div>

          <div class="mb-2">
            <strong>Ventas por transferencia:</strong>
            RD$ ${moneda(cajaAbierta.transferencia)}
          </div>

          <div class="mb-2">
            <strong>Ventas totales:</strong>
            RD$ ${moneda(
              Number(cajaAbierta.efectivo || 0) +
                Number(cajaAbierta.tarjeta || 0) +
                Number(cajaAbierta.transferencia || 0),
            )}
          </div>

          <hr />

          <div>
            <strong>Debe haber:</strong>
          </div>

          <h3 style="color:#198754">
            RD$ ${moneda(debeHaber)}
          </h3>
        </div>
      `,
      input: "number",
      inputLabel: "Dinero contado",
      inputPlaceholder: "0.00",
      inputAttributes: {
        min: 0,
        step: "0.01",
      },
      showCancelButton: true,
      confirmButtonText: "Cerrar Caja",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
      inputValidator: (value) => {
        if (value === "" || value === null) {
          return "Debe indicar el dinero contado.";
        }

        if (Number(value) < 0) {
          return "El dinero contado no puede ser negativo.";
        }
      },
    });

    if (!isConfirmed) return;

    try {
      const response = await api.post("/cajas/cerrar", {
        dinero_contado: Number(value),
      });

      await verificarCaja();

      const resultado = await Swal.fire({
        icon: "success",
        title: "Caja cerrada",
        html: `
          <div style="text-align:left">

            <p>
              <strong>Debe haber:</strong>
              RD$ ${moneda(response.data.debeHaber)}
            </p>

            <p>
              <strong>Diferencia:</strong>
              RD$ ${moneda(response.data.diferencia)}
            </p>

            <hr />

            <p>
              <strong>Facturas:</strong>
              ${response.data.cantidadFacturas || 0}
            </p>

            <p>
              <strong>Propinas aplicadas:</strong>
              ${response.data.cantidadPropinasAplicadas || 0}
            </p>

            <p>
              <strong>Total propinas:</strong>
              RD$ ${moneda(response.data.totalPropinas)}
            </p>

            <p>
              <strong>Productos vendidos:</strong>
              ${response.data.cantidadProductos || 0}
            </p>

            <p>
              <strong>Total vendido:</strong>
              RD$ ${moneda(response.data.totalVentas)}
            </p>

            <hr />

            <p>
              <strong>Efectivo:</strong>
              RD$ ${moneda(response.data.totalEfectivo)}
            </p>

            <p>
              <strong>Tarjeta:</strong>
              RD$ ${moneda(response.data.totalTarjeta)}
            </p>

            <p>
              <strong>Transferencia:</strong>
              RD$ ${moneda(response.data.totalTransferencia)}
            </p>

            <p>
              <strong>Clientes atendidos:</strong>
              ${response.data.clientesAtendidos || 0}
            </p>

          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "🖨️ Imprimir reporte",
        cancelButtonText: "Aceptar",
        reverseButtons: true,
        confirmButtonColor: "#198754",
      });

      if (resultado.isConfirmed && response.data.cajaId) {
        navigate(`/imprimir-cierre-caja/${response.data.cajaId}`);
      }
    } catch (error) {
      console.error("Error cerrando caja:", error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No fue posible cerrar la caja.",
        "error",
      );
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      {/* BARRA SUPERIOR MÓVIL */}

      <div className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setSidebarAbierto(!sidebarAbierto)}
        >
          ☰
        </button>

        <div className="mobile-company">
          {empresa?.logo_url && (
            <img src={empresa.logo_url} alt={`Logo ${empresa.nombre || ""}`} />
          )}

          <span>{empresa?.nombre || "Sistema de Facturación"}</span>
        </div>

        <button
          type="button"
          className="mobile-logout"
          onClick={cerrarSesion}
          title="Cerrar sesión"
        >
          ↪
        </button>
      </div>

      {/* OVERLAY MÓVIL */}

      {sidebarAbierto && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarAbierto(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`sidebar ${sidebarAbierto ? "sidebar-open" : ""}`}
        style={{
          "--empresa-color": empresa?.color_principal || "#198754",
        }}
      >
        {/* EMPRESA */}

        <div className="sidebar-brand">
          <Link
            to={rol === "CAJERO" ? "/facturas" : "/dashboard"}
            onClick={() => setSidebarAbierto(false)}
            className="sidebar-brand-link"
          >
            <div className="sidebar-logo">
              {empresa?.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt={`Logo ${empresa.nombre || ""}`}
                />
              ) : (
                <div className="sidebar-logo-placeholder">F</div>
              )}
            </div>

            <div className="sidebar-company-name">
              <strong>{empresa?.nombre || "Sistema"}</strong>
              <span>Sistema de Facturación</span>
            </div>
          </Link>
        </div>

        {/* NAVEGACIÓN */}

        <div className="sidebar-content">
          <div className="sidebar-section-title">PRINCIPAL</div>

          {/* CAJA - SOLO CAJERO */}

          {rol === "CAJERO" && (
            <>
              {!cargandoCaja &&
                (!cajaAbierta ? (
                  <button
                    type="button"
                    className="sidebar-link sidebar-link-button"
                    onClick={() => {
                      setSidebarAbierto(false);
                      abrirCaja();
                    }}
                  >
                    <span className="sidebar-icon">💵</span>
                    <span className="sidebar-link-text">Abrir Caja</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sidebar-link sidebar-link-button"
                    onClick={() => {
                      setSidebarAbierto(false);
                      cerrarCaja();
                    }}
                  >
                    <span className="sidebar-icon">🔒</span>
                    <span className="sidebar-link-text">Cerrar Caja</span>
                  </button>
                ))}
            </>
          )}

          {/* DASHBOARD - ADMINISTRADORES */}

          {(rol === "ADMIN" || rol === "SUPER_ADMIN") && (
            <Link
              to="/dashboard"
              className={`sidebar-link ${
                estaActivo("/dashboard") ? "sidebar-link-active" : ""
              }`}
              onClick={() => setSidebarAbierto(false)}
            >
              <span className="sidebar-icon">🏠</span>
              <span>Dashboard</span>
            </Link>
          )}

          {/* PRODUCTOS */}

          {tieneModulo("PRODUCTOS") &&
            (rol === "ADMIN" || rol === "SUPER_ADMIN") && (
              <Link
                to="/productos"
                className={`sidebar-link ${
                  estaActivo("/productos") ? "sidebar-link-active" : ""
                }`}
                onClick={() => setSidebarAbierto(false)}
              >
                <span className="sidebar-icon">📦</span>
                <span>Productos</span>
              </Link>
            )}

          {/* INVENTARIO */}

          {tieneModulo("INVENTARIO") &&
            (rol === "ADMIN" || rol === "SUPER_ADMIN") && (
              <Link
                to="/inventario"
                className={`sidebar-link ${
                  estaActivo("/inventario") ? "sidebar-link-active" : ""
                }`}
                onClick={() => setSidebarAbierto(false)}
              >
                <span className="sidebar-icon">📊</span>
                <span>Inventario</span>
              </Link>
            )}

          {/* CLIENTES */}

          {tieneModulo("CLIENTES") &&
            (rol === "ADMIN" || rol === "SUPER_ADMIN") && (
              <Link
                to="/clientes"
                className={`sidebar-link ${
                  estaActivo("/clientes") ? "sidebar-link-active" : ""
                }`}
                onClick={() => setSidebarAbierto(false)}
              >
                <span className="sidebar-icon">👥</span>
                <span>Clientes</span>
              </Link>
            )}

          {/* PROVEEDORES */}

          {tieneModulo("PROVEEDORES") &&
            (rol === "ADMIN" || rol === "SUPER_ADMIN") && (
              <Link
                to="/proveedores"
                className={`sidebar-link ${
                  estaActivo("/proveedores") ? "sidebar-link-active" : ""
                }`}
                onClick={() => setSidebarAbierto(false)}
              >
                <span className="sidebar-icon">🚚</span>
                <span>Proveedores</span>
              </Link>
            )}

          {/* CONTROL DE ORDEN */}

          {tieneModulo("CONTROL_ORDEN") && (
            <Link
              to="/control-orden"
              className={`sidebar-link ${
                estaActivo("/control-orden") ? "sidebar-link-active" : ""
              }`}
              onClick={() => setSidebarAbierto(false)}
            >
              <span className="sidebar-icon">🍽️</span>
              <span>Control de Orden</span>
            </Link>
          )}

          {/* FACTURACIÓN */}

          {tieneModulo("FACTURACION") && (
            <>
              <button
                type="button"
                className={`sidebar-link sidebar-link-button ${
                  menuAbierto === "facturacion" ? "sidebar-link-open" : ""
                }`}
                onClick={() => toggleMenu("facturacion")}
              >
                <span className="sidebar-icon">🧾</span>
                <span className="sidebar-link-text">Facturación</span>
                <span className="sidebar-arrow">
                  {menuAbierto === "facturacion" ? "⌃" : "⌄"}
                </span>
              </button>

              {menuAbierto === "facturacion" && (
                <div className="sidebar-submenu">
                  <Link
                    to="/facturas"
                    className={`sidebar-sublink ${
                      estaActivo("/facturas") ? "sidebar-sublink-active" : ""
                    }`}
                    onClick={() => setSidebarAbierto(false)}
                  >
                    Nueva factura
                  </Link>

                  {(rol === "ADMIN" || rol === "SUPER_ADMIN") && (
                    <Link
                      to="/facturas-eliminadas"
                      className={`sidebar-sublink ${
                        estaActivo("/facturas-eliminadas")
                          ? "sidebar-sublink-active"
                          : ""
                      }`}
                      onClick={() => setSidebarAbierto(false)}
                    >
                      Facturas eliminadas
                    </Link>
                  )}

                  <Link
                    to="/historial-facturas"
                    className={`sidebar-sublink ${
                      estaActivo("/historial-facturas")
                        ? "sidebar-sublink-active"
                        : ""
                    }`}
                    onClick={() => setSidebarAbierto(false)}
                  >
                    Historial
                  </Link>

                  <Link
                    to="/cotizacion"
                    className={`sidebar-sublink ${
                      estaActivo("/cotizacion") ? "sidebar-sublink-active" : ""
                    }`}
                    onClick={() => setSidebarAbierto(false)}
                  >
                    Cotización
                  </Link>
                </div>
              )}
            </>
          )}

          {/* FERRETERÍA */}

          {tieneModulo("FERRETERIA") && (
            <>
              <button
                type="button"
                className={`sidebar-link sidebar-link-button ${
                  menuAbierto === "ferreteria" ? "sidebar-link-open" : ""
                }`}
                onClick={() => toggleMenu("ferreteria")}
              >
                <span className="sidebar-icon">🔧</span>
                <span className="sidebar-link-text">Ferretería</span>
                <span className="sidebar-arrow">
                  {menuAbierto === "ferreteria" ? "⌃" : "⌄"}
                </span>
              </button>

              {menuAbierto === "ferreteria" && (
                <div className="sidebar-submenu">
                  <Link
                    to="/ferreteria/nueva-factura"
                    className={`sidebar-sublink ${
                      estaActivo("/ferreteria/nueva-factura")
                        ? "sidebar-sublink-active"
                        : ""
                    }`}
                    onClick={() => setSidebarAbierto(false)}
                  >
                    Nueva factura
                  </Link>

                  <Link
                    to="/ferreteria/facturas-abiertas"
                    className={`sidebar-sublink ${
                      estaActivo("/ferreteria/facturas-abiertas")
                        ? "sidebar-sublink-active"
                        : ""
                    }`}
                    onClick={() => setSidebarAbierto(false)}
                  >
                    Facturas abiertas
                  </Link>

                  <Link
                    to="/ferreteria/historial-facturas"
                    className={`sidebar-sublink ${
                      estaActivo("/ferreteria/historial-facturas")
                        ? "sidebar-sublink-active"
                        : ""
                    }`}
                    onClick={() => setSidebarAbierto(false)}
                  >
                    Historial
                  </Link>
                </div>
              )}
            </>
          )}

          {/* REPORTES */}

          {tieneModulo("REPORTES") &&
            (rol === "ADMIN" || rol === "SUPER_ADMIN") && (
              <>
                <button
                  type="button"
                  className={`sidebar-link sidebar-link-button ${
                    menuAbierto === "reportes" ? "sidebar-link-open" : ""
                  }`}
                  onClick={() => toggleMenu("reportes")}
                >
                  <span className="sidebar-icon">📈</span>
                  <span className="sidebar-link-text">Reportes</span>
                  <span className="sidebar-arrow">
                    {menuAbierto === "reportes" ? "⌃" : "⌄"}
                  </span>
                </button>

                {menuAbierto === "reportes" && (
                  <div className="sidebar-submenu">
                    <Link
                      to="/reportes-caja"
                      className={`sidebar-sublink ${
                        estaActivo("/reportes-caja")
                          ? "sidebar-sublink-active"
                          : ""
                      }`}
                      onClick={() => setSidebarAbierto(false)}
                    >
                      Reportes de caja
                    </Link>
                  </div>
                )}
              </>
            )}

          {/* ADMINISTRACIÓN */}

          {rol === "ADMIN" && (
            <>
              <div className="sidebar-section-title sidebar-section-margin">
                ADMINISTRACIÓN
              </div>

              <button
                type="button"
                className={`sidebar-link sidebar-link-button ${
                  menuAbierto === "administracion" ? "sidebar-link-open" : ""
                }`}
                onClick={() => toggleMenu("administracion")}
              >
                <span className="sidebar-icon">⚙️</span>
                <span className="sidebar-link-text">Administración</span>
                <span className="sidebar-arrow">
                  {menuAbierto === "administracion" ? "⌃" : "⌄"}
                </span>
              </button>

              {menuAbierto === "administracion" && (
                <div className="sidebar-submenu">
                  <Link
                    to="/configuracion"
                    className={`sidebar-sublink ${
                      estaActivo("/configuracion")
                        ? "sidebar-sublink-active"
                        : ""
                    }`}
                    onClick={() => setSidebarAbierto(false)}
                  >
                    Configuración
                  </Link>

                  <Link
                    to="/usuarios"
                    className={`sidebar-sublink ${
                      estaActivo("/usuarios") ? "sidebar-sublink-active" : ""
                    }`}
                    onClick={() => setSidebarAbierto(false)}
                  >
                    Usuarios
                  </Link>
                </div>
              )}
            </>
          )}

          {/* SUPER ADMIN */}

          {rol === "SUPER_ADMIN" && (
            <>
              <div className="sidebar-section-title sidebar-section-margin">
                SISTEMA
              </div>

              <Link
                to="/empresas"
                className={`sidebar-link ${
                  estaActivo("/empresas") ? "sidebar-link-active" : ""
                }`}
                onClick={() => setSidebarAbierto(false)}
              >
                <span className="sidebar-icon">🏢</span>
                <span>Empresas</span>
              </Link>
            </>
          )}
        </div>

        {/* PARTE INFERIOR */}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div
              className="sidebar-user-avatar"
              style={{
                background: empresa?.color_principal || "#198754",
              }}
            >
              👤
            </div>

            <div className="sidebar-user-info">
              <strong>
                {rol === "SUPER_ADMIN"
                  ? "Super Administrador"
                  : rol === "ADMIN"
                    ? "Administrador"
                    : rol === "CAJERO"
                      ? "Cajero"
                      : "Usuario"}
              </strong>

              <span>{rol || "Usuario"}</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={cerrarSesion}
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Navbar;
