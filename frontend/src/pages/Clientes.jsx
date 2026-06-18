import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";

function Clientes() {
  const [clientes, setClientes] = useState([]);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");

  const cargarClientes = async () => {
    try {
      const response = await api.get("/clientes");

      setClientes(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const guardarCliente = async () => {
    try {
      await api.post("/clientes", {
        nombre,
        telefono,
        email,
        direccion,
      });

      setNombre("");
      setTelefono("");
      setEmail("");
      setDireccion("");

      cargarClientes();
    } catch (error) {
      console.error(error);

      alert("Error al guardar cliente");
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h2>Clientes</h2>

        <div className="card p-3 mb-4">
          <h5>Nuevo Cliente</h5>

          <input
            className="form-control mb-2"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            className="form-control mb-2"
            placeholder="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />

          <input
            className="form-control mb-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="form-control mb-2"
            placeholder="Dirección"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />

          <button className="btn btn-success" onClick={guardarCliente}>
            Guardar Cliente
          </button>
        </div>

        <table className="table table-bordered">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Email</th>
            </tr>
          </thead>

          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.id}>
                <td>{cliente.id}</td>

                <td>{cliente.nombre}</td>

                <td>{cliente.telefono}</td>

                <td>{cliente.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Clientes;
