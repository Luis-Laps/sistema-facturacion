import { jwtDecode } from "jwt-decode";

export const obtenerRol = () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) return null;

    const decoded = jwtDecode(token);

    return decoded.rol;
  } catch (error) {
    return null;
  }
};

export const estaLogueado = () => {
  return !!localStorage.getItem("token");
};
