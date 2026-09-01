import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { obtenerRol } from "../utils/auth";
import api from "../services/api";

import "../styles/sidebar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const rol = obtenerRol();

  const [empresa, setEmpresa] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  // ==========================================
  // CARGAR EMPRESA
  // ==========================================

  useEffect(() => {
    // El SUPER_ADMIN no pertenece a una empresa específica
    if (rol === "SUPER_ADMIN") {
      setEmpresa(null);
      return;
    }

    const cargarEmpresa = async () => {
      try {
        const response = await api.get("/configuracion");
        setEmpresa(response.data);
      } catch (error) {
        console.error("Error al cargar empresa:", error);
      }
    };

    cargarEmpresa();
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

  return (
    <>
      {/* ======================================
          BARRA SUPERIOR MÓVIL
      ====================================== */}

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

      {/* ======================================
          OVERLAY MÓVIL
      ====================================== */}

      {sidebarAbierto && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarAbierto(false)}
        />
      )}

      {/* ======================================
          SIDEBAR
      ====================================== */}

      <aside
        className={`sidebar ${sidebarAbierto ? "sidebar-open" : ""}`}
        style={{
          "--empresa-color": empresa?.color_principal || "#198754",
        }}
      >
        {/* ====================================
            EMPRESA
        ==================================== */}

        <div className="sidebar-brand">
          <Link
            to="/dashboard"
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

        {/* ====================================
            NAVEGACIÓN
        ==================================== */}

        <div className="sidebar-content">
          <div className="sidebar-section-title">PRINCIPAL</div>

          {/* DASHBOARD */}

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

          {/* PRODUCTOS */}

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

          {/* CLIENTES */}

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

          {/* ==================================
              CONTROL DE ORDEN
              SOLO EMPRESAS CON MANEJO DE MESAS
          ================================== */}

          {empresa?.manejo_mesas === true && (
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

          {/* ==================================
              FACTURACIÓN
          ================================== */}

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

          {/* ==================================
              REPORTES
          ================================== */}

          <button
            type="button"
            className={`sidebar-link sidebar-link-button ${
              menuAbierto === "reportes" ? "sidebar-link-open" : ""
            }`}
            onClick={() => toggleMenu("reportes")}
          >
            <span className="sidebar-icon">📊</span>

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
                  estaActivo("/reportes-caja") ? "sidebar-sublink-active" : ""
                }`}
                onClick={() => setSidebarAbierto(false)}
              >
                Reportes de caja
              </Link>
            </div>
          )}

          {/* ==================================
              ADMINISTRACIÓN
          ================================== */}

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

          {/* ==================================
              SUPER ADMIN
          ================================== */}

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

        {/* ====================================
            PARTE INFERIOR
        ==================================== */}

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
