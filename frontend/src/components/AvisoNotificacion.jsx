import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import api from "../services/api";

function AvisoNotificacion() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  const cargarNotificaciones = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setCargando(false);
        return;
      }

      // Leer el usuario guardado
      const usuarioGuardado = localStorage.getItem("usuario");

      if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado);

        // SUPER_ADMIN no necesita recibir estos avisos
        if (usuario.rol === "SUPER_ADMIN") {
          setCargando(false);
          return;
        }
      }

      const response = await api.get("/notificaciones/no-leidas");

      const pendientes = Array.isArray(response.data) ? response.data : [];

      setNotificaciones(pendientes);
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    } finally {
      setCargando(false);
    }
  };

  const marcarComoLeida = async (notificacionId) => {
    try {
      await api.put(`/notificaciones/${notificacionId}/leida`);

      setNotificaciones((prev) =>
        prev.filter((notificacion) => notificacion.id !== notificacionId),
      );

      return true;
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);

      return false;
    }
  };

  useEffect(() => {
    if (cargando || notificaciones.length === 0) {
      return;
    }

    mostrarSiguienteNotificacion();
  }, [cargando, notificaciones]);

  const mostrarSiguienteNotificacion = async () => {
    const notificacion = notificaciones[0];

    if (!notificacion) {
      return;
    }

    const resultado = await Swal.fire({
      icon: "warning",
      title: notificacion.titulo,
      text: notificacion.mensaje,
      confirmButtonText: "Entendido",
      allowOutsideClick: false,
      allowEscapeKey: false,
      confirmButtonColor: "#0d6efd",
    });

    if (resultado.isConfirmed) {
      await marcarComoLeida(notificacion.id);
    }
  };

  return null;
}

export default AvisoNotificacion;
