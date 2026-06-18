import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function ProtectedRoute({ children, roles = [] }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" />;
  }

  try {
    const usuario = jwtDecode(token);

    if (roles.length > 0 && !roles.includes(usuario.rol)) {
      return <Navigate to="/dashboard" />;
    }

    return children;
  } catch {
    return <Navigate to="/" />;
  }
}

export default ProtectedRoute;
