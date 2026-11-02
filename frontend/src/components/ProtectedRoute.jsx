import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function ProtectedRoute({ children, roles = [] }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const usuario = jwtDecode(token);

    if (roles.length > 0 && !roles.includes(usuario.rol)) {
      // La cajera no puede entrar al Dashboard.
      if (usuario.rol === "CAJERA") {
        return <Navigate to="/facturas" replace />;
      }

      return <Navigate to="/dashboard" replace />;
    }

    return children;
  } catch {
    return <Navigate to="/" replace />;
  }
}

export default ProtectedRoute;
