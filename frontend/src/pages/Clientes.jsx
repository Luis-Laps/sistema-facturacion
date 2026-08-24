import { useEffect, useState } from "react";

import Swal from "sweetalert2";

import api from "../services/api";

import Navbar from "../components/Navbar";

function Clientes() {
  const [clientes, setClientes] = useState([]);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");

  const [editando, setEditando] = useState(false);
  const [clienteEditandoId, setClienteEditandoId] = useState(null);

  // ==========================================
  // CARGAR CLIENTES
  // ==========================================

  const cargarClientes = async () => {
    try {
      const response = await api.get("/clientes");

      setClientes(response.data);
    } catch (error) {
      console.error(error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No se pudieron cargar los clientes.",
        "error",
      );
    }
  };

  // ==========================================
  // LIMPIAR FORMULARIO
  // ==========================================

  const limpiarFormulario = () => {
    setNombre("");
    setTelefono("");
    setEmail("");
    setDireccion("");

    setEditando(false);
    setClienteEditandoId(null);
  };

  // ==========================================
  // GUARDAR / ACTUALIZAR
  // ==========================================

  const guardarCliente = async () => {
    if (!nombre.trim()) {
      Swal.fire("Atención", "El nombre del cliente es obligatorio.", "warning");

      return;
    }

    try {
      if (editando) {
        await api.put(`/clientes/${clienteEditandoId}`, {
          nombre,
          telefono,
          email,
          direccion,
        });

        Swal.fire({
          icon: "success",
          title: "Cliente actualizado",
          timer: 1200,
          showConfirmButton: false,
        });
      } else {
        await api.post("/clientes", {
          nombre,
          telefono,
          email,
          direccion,
        });

        Swal.fire({
          icon: "success",
          title: "Cliente creado",
          timer: 1200,
          showConfirmButton: false,
        });
      }

      limpiarFormulario();

      cargarClientes();
    } catch (error) {
      console.error(error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No se pudo guardar el cliente.",
        "error",
      );
    }
  };

  // ==========================================
  // EDITAR CLIENTE
  // ==========================================

  const editarCliente = (cliente) => {
    setNombre(cliente.nombre || "");
    setTelefono(cliente.telefono || "");
    setEmail(cliente.email || "");
    setDireccion(cliente.direccion || "");

    setClienteEditandoId(cliente.id);
    setEditando(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ==========================================
  // ELIMINAR CLIENTE
  // ==========================================

  const eliminarCliente = async (cliente) => {
    const confirmar = await Swal.fire({
      title: "¿Eliminar cliente?",
      text: `¿Deseas eliminar a "${cliente.nombre}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
    });

    if (!confirmar.isConfirmed) {
      return;
    }

    try {
      await api.delete(`/clientes/${cliente.id}`);

      Swal.fire({
        icon: "success",
        title: "Cliente eliminado",
        timer: 1200,
        showConfirmButton: false,
      });

      if (clienteEditandoId === cliente.id) {
        limpiarFormulario();
      }

      cargarClientes();
    } catch (error) {
      console.error(error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No se pudo eliminar el cliente.",
        "error",
      );
    }
  };

  // ==========================================
  // CARGA INICIAL
  // ==========================================

  useEffect(() => {
    cargarClientes();
  }, []);

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        {/* ==========================================
            ENCABEZADO
        ========================================== */}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2>Clientes</h2>

            <small className="text-muted">Total: {clientes.length}</small>
          </div>
        </div>

        {/* ==========================================
            FORMULARIO
        ========================================== */}

        <div className="card p-3 mb-4 shadow-sm">
          <h5>{editando ? "Editar Cliente" : "Nuevo Cliente"}</h5>

          <div className="row">
            <div className="col-md-6 mb-2">
              <label className="form-label">Nombre</label>

              <input
                className="form-control"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="col-md-6 mb-2">
              <label className="form-label">Teléfono</label>

              <input
                className="form-control"
                placeholder="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div className="col-md-6 mb-2">
              <label className="form-label">Email</label>

              <input
                type="email"
                className="form-control"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="col-md-6 mb-2">
              <label className="form-label">Dirección</label>

              <input
                className="form-control"
                placeholder="Dirección"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <button className="btn btn-success me-2" onClick={guardarCliente}>
              {editando ? "Actualizar Cliente" : "Guardar Cliente"}
            </button>

            {editando && (
              <button className="btn btn-secondary" onClick={limpiarFormulario}>
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* ==========================================
            TABLA
        ========================================== */}

        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-bordered table-hover mb-0">
              <thead className="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Dirección</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No hay clientes registrados.
                    </td>
                  </tr>
                ) : (
                  clientes.map((cliente) => (
                    <tr key={cliente.id}>
                      <td>{cliente.id}</td>

                      <td>{cliente.nombre}</td>

                      <td>{cliente.telefono || "-"}</td>

                      <td>{cliente.email || "-"}</td>

                      <td>{cliente.direccion || "-"}</td>

                      <td>
                        <button
                          className="btn btn-warning btn-sm me-2"
                          onClick={() => editarCliente(cliente)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => eliminarCliente(cliente)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default Clientes;
