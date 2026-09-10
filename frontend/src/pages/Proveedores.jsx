import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import api from "../services/api";

const proveedorInicial = {
  nombre: "",
  rnc: "",
  telefono: "",
  correo: "",
  direccion: "",
  contacto: "",
  notas: "",
};

function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [proveedor, setProveedor] = useState(proveedorInicial);
  const [guardando, setGuardando] = useState(false);

  const cargarProveedores = async () => {
    try {
      setCargando(true);

      const response = await api.get("/proveedores");
      setProveedores(response.data || []);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.mensaje ||
          "No se pudieron cargar los proveedores.",
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProveedor((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  const nuevoProveedor = () => {
    setProveedor({ ...proveedorInicial });
    setEditando(false);
    setEditandoId(null);
    setMostrarModal(true);
  };

  const editarProveedor = (item) => {
    setProveedor({
      nombre: item.nombre || "",
      rnc: item.rnc || "",
      telefono: item.telefono || "",
      correo: item.correo || "",
      direccion: item.direccion || "",
      contacto: item.contacto || "",
      notas: item.notas || "",
    });

    setEditando(true);
    setEditandoId(item.id);
    setMostrarModal(true);
  };

  const guardarProveedor = async () => {
    if (!proveedor.nombre.trim()) {
      Swal.fire(
        "Atención",
        "El nombre del proveedor es obligatorio.",
        "warning",
      );
      return;
    }

    try {
      setGuardando(true);

      const datos = {
        nombre: proveedor.nombre.trim(),
        rnc: proveedor.rnc.trim() || null,
        telefono: proveedor.telefono.trim() || null,
        correo: proveedor.correo.trim() || null,
        direccion: proveedor.direccion.trim() || null,
        contacto: proveedor.contacto.trim() || null,
        notas: proveedor.notas.trim() || null,
      };

      if (editando) {
        await api.put(`/proveedores/${editandoId}`, datos);
      } else {
        await api.post("/proveedores", datos);
      }

      setMostrarModal(false);
      await cargarProveedores();

      Swal.fire({
        icon: "success",
        title: editando ? "Proveedor actualizado" : "Proveedor creado",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text:
          error.response?.data?.mensaje ||
          "Ocurrió un error al guardar el proveedor.",
      });
    } finally {
      setGuardando(false);
    }
  };

  const desactivarProveedor = async (item) => {
    const confirmar = await Swal.fire({
      icon: "warning",
      title: "Desactivar proveedor",
      html: `
        <div>
          ¿Deseas desactivar al proveedor
          <strong>${item.nombre}</strong>?
        </div>
        <div class="text-muted mt-2">
          El proveedor dejará de aparecer en los nuevos registros,
          pero se conservará la información histórica.
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Sí, desactivar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!confirmar.isConfirmed) {
      return;
    }

    try {
      await api.delete(`/proveedores/${item.id}`);

      await cargarProveedores();

      Swal.fire({
        icon: "success",
        title: "Proveedor desactivado",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "No se pudo desactivar",
        text: error.response?.data?.mensaje || "Ocurrió un error.",
      });
    }
  };

  const proveedoresFiltrados = proveedores.filter((item) => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) {
      return true;
    }

    return (
      item.nombre?.toLowerCase().includes(texto) ||
      item.rnc?.toLowerCase().includes(texto) ||
      item.telefono?.toLowerCase().includes(texto) ||
      item.contacto?.toLowerCase().includes(texto) ||
      item.correo?.toLowerCase().includes(texto)
    );
  });

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Proveedores</h2>
          <p className="text-muted mb-0">
            Gestión de proveedores de la ferretería
          </p>
        </div>

        <button
          type="button"
          className="btn btn-success"
          onClick={nuevoProveedor}
        >
          + Nuevo proveedor
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <small className="text-muted fw-semibold">
                Proveedores activos
              </small>

              <h3 className="fw-bold mt-2 mb-0">{proveedores.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <label className="form-label fw-semibold">Buscar proveedor</label>

              <input
                type="text"
                className="form-control"
                placeholder="Nombre, RNC, teléfono, correo o contacto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status" />
              <p className="text-muted mt-3 mb-0">Cargando proveedores...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Proveedor</th>
                    <th>RNC</th>
                    <th>Teléfono</th>
                    <th>Contacto</th>
                    <th>Correo</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {proveedoresFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-5">
                        {busqueda
                          ? "No se encontraron proveedores."
                          : "No hay proveedores registrados."}
                      </td>
                    </tr>
                  )}

                  {proveedoresFiltrados.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold">{item.nombre}</div>

                        {item.direccion && (
                          <small className="text-muted">{item.direccion}</small>
                        )}
                      </td>

                      <td>{item.rnc || "—"}</td>
                      <td>{item.telefono || "—"}</td>
                      <td>{item.contacto || "—"}</td>
                      <td>{item.correo || "—"}</td>

                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-warning btn-sm me-2"
                          onClick={() => editarProveedor(item)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => desactivarProveedor(item)}
                        >
                          Desactivar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {mostrarModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editando ? "Editar proveedor" : "Nuevo proveedor"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMostrarModal(false)}
                  disabled={guardando}
                />
              </div>

              <div className="modal-body">
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label className="form-label">Nombre *</label>

                    <input
                      type="text"
                      className="form-control"
                      name="nombre"
                      value={proveedor.nombre}
                      onChange={handleChange}
                      disabled={guardando}
                      autoFocus
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">RNC</label>

                    <input
                      type="text"
                      className="form-control"
                      name="rnc"
                      value={proveedor.rnc}
                      onChange={handleChange}
                      disabled={guardando}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Teléfono</label>

                    <input
                      type="text"
                      className="form-control"
                      name="telefono"
                      value={proveedor.telefono}
                      onChange={handleChange}
                      disabled={guardando}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Persona de contacto</label>

                    <input
                      type="text"
                      className="form-control"
                      name="contacto"
                      value={proveedor.contacto}
                      onChange={handleChange}
                      disabled={guardando}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Correo electrónico</label>

                    <input
                      type="email"
                      className="form-control"
                      name="correo"
                      value={proveedor.correo}
                      onChange={handleChange}
                      disabled={guardando}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Dirección</label>

                    <input
                      type="text"
                      className="form-control"
                      name="direccion"
                      value={proveedor.direccion}
                      onChange={handleChange}
                      disabled={guardando}
                    />
                  </div>

                  <div className="col-12 mb-3">
                    <label className="form-label">Notas</label>

                    <textarea
                      className="form-control"
                      rows="4"
                      name="notas"
                      value={proveedor.notas}
                      onChange={handleChange}
                      disabled={guardando}
                      placeholder="Información adicional del proveedor..."
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMostrarModal(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={guardarProveedor}
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : editando
                      ? "Actualizar proveedor"
                      : "Guardar proveedor"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Proveedores;
