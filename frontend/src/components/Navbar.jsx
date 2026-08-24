import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { obtenerRol } from "../utils/auth";
import api from "../services/api";

function Navbar() {
  const navigate = useNavigate();
  const rol = obtenerRol();

  const [empresa, setEmpresa] = useState(null);
  const [cargandoEmpresa, setCargandoEmpresa] = useState(true);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  useEffect(() => {
    const cargarEmpresa = async () => {
      try {
        const response = await api.get("/configuracion");

        setEmpresa(response.data);
      } catch (error) {
        console.error("Error al cargar configuración de empresa:", error);
      } finally {
        setCargandoEmpresa(false);
      }
    };

    cargarEmpresa();
  }, []);

  const colorPrincipal = empresa?.color_principal || "#212529";

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark"
      style={{
        backgroundColor: colorPrincipal,
      }}
    >
      <div className="container">
        {/* IDENTIDAD DE LA EMPRESA */}
        <Link
          className="navbar-brand d-flex align-items-center"
          to="/dashboard"
        >
          {empresa?.logo_url && (
            <img
              src={empresa.logo_url}
              alt={`Logo ${empresa.nombre || ""}`}
              style={{
                height: "35px",
                maxWidth: "120px",
                objectFit: "contain",
                marginRight: "10px",
              }}
            />
          )}

          <span>
            {cargandoEmpresa ? "Facturación" : empresa?.nombre || "Facturación"}
          </span>
        </Link>

        {/* BOTÓN MOBILE */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Abrir navegación"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* MENÚ */}
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/dashboard">
                Dashboard
              </Link>
            </li>

            <li className="nav-item">
              <Link className="nav-link" to="/productos">
                Productos
              </Link>
            </li>

            <li className="nav-item">
              <Link className="nav-link" to="/clientes">
                Clientes
              </Link>
            </li>

            <li className="nav-item">
              <Link className="nav-link" to="/facturas">
                Facturas
              </Link>
            </li>

            <li className="nav-item">
              <Link className="nav-link" to="/historial-facturas">
                Historial
              </Link>
            </li>

            <li className="nav-item">
              <Link className="nav-link" to="/reportes-caja">
                Reportes
              </Link>
            </li>

            {/* SOLO SUPER ADMIN */}
            {rol === "SUPER_ADMIN" && (
              <li className="nav-item">
                <Link className="nav-link" to="/empresas">
                  Empresas
                </Link>
              </li>
            )}

            {/* SOLO ADMIN */}
            {rol === "ADMIN" && (
              <li className="nav-item">
                <Link className="nav-link" to="/configuracion">
                  Configuración
                </Link>
              </li>
            )}

            {/* SOLO ADMIN */}
            {rol === "ADMIN" && (
              <li className="nav-item">
                <Link className="nav-link" to="/usuarios">
                  Usuarios
                </Link>
              </li>
            )}
          </ul>

          <button className="btn btn-danger" onClick={cerrarSesion}>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
