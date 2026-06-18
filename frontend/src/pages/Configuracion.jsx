import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Configuracion() {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    correo: "",
  });

  const cargarConfiguracion = async () => {
    try {
      const response = await api.get("/configuracion");

      setForm(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const guardar = async () => {
    try {
      await api.put("/configuracion", form);

      alert("Configuración guardada");
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h2>Configuración Empresa</h2>

        <input
          className="form-control mb-2"
          placeholder="Nombre"
          value={form.nombre}
          onChange={(e) =>
            setForm({
              ...form,
              nombre: e.target.value,
            })
          }
        />

        <input
          className="form-control mb-2"
          placeholder="Teléfono"
          value={form.telefono}
          onChange={(e) =>
            setForm({
              ...form,
              telefono: e.target.value,
            })
          }
        />

        <input
          className="form-control mb-2"
          placeholder="Dirección"
          value={form.direccion}
          onChange={(e) =>
            setForm({
              ...form,
              direccion: e.target.value,
            })
          }
        />

        <input
          className="form-control mb-2"
          placeholder="Correo"
          value={form.correo}
          onChange={(e) =>
            setForm({
              ...form,
              correo: e.target.value,
            })
          }
        />

        <button className="btn btn-success" onClick={guardar}>
          Guardar
        </button>
      </div>
    </>
  );
}

export default Configuracion;
