import { Link, useNavigate } from "react-router-dom";
import { obtenerRol } from "../utils/auth";

function Navbar() {
  const navigate = useNavigate();

  const rol = obtenerRol();

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand" to="/dashboard">
          Facturación
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

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

            {rol === "ADMIN" && (
              <li className="nav-item">
                <Link className="nav-link" to="/configuracion">
                  Configuración
                </Link>
              </li>
            )}

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
