import { jwtDecode } from "jwt-decode";

export const obtenerRol = () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) return null;

    const decoded = jwtDecode(token);

    return decoded.rol?.trim().toUpperCase() || null;
  } catch (error) {
    console.error("Error al obtener el rol:", error);
    return null;
  }
};

export const estaLogueado = () => {
  return !!localStorage.getItem("token");
};
