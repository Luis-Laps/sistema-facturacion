import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import Navbar from "../components/Navbar";
import api from "../services/api";

function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [cargando, setCargando] = useState(false);

  // ==========================================
  // CARGAR CATEGORÍAS
  // ==========================================

  const cargarCategorias = async () => {
    try {
      setCargando(true);

      const response = await api.get("/categorias");

      setCategorias(response.data);
    } catch (error) {
      console.error(error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje ||
          "No se pudieron cargar las categorías.",
        "error",
      );
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // GUARDAR / ACTUALIZAR
  // ==========================================

  const guardarCategoria = async () => {
    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      Swal.fire(
        "Atención",
        "Debes escribir el nombre de la categoría.",
        "warning",
      );
      return;
    }

    try {
      if (editandoId) {
        await api.put(`/categorias/${editandoId}`, {
          nombre: nombreLimpio,
        });

        Swal.fire({
          icon: "success",
          title: "Categoría actualizada",
          timer: 1200,
          showConfirmButton: false,
        });
      } else {
        await api.post("/categorias", {
          nombre: nombreLimpio,
        });

        Swal.fire({
          icon: "success",
          title: "Categoría creada",
          timer: 1200,
          showConfirmButton: false,
        });
      }

      setNombre("");
      setEditandoId(null);

      cargarCategorias();
    } catch (error) {
      console.error(error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No se pudo guardar la categoría.",
        "error",
      );
    }
  };

  // ==========================================
  // EDITAR
  // ==========================================

  const editarCategoria = (categoria) => {
    setNombre(categoria.nombre);
    setEditandoId(categoria.id);
  };

  // ==========================================
  // CANCELAR EDICIÓN
  // ==========================================

  const cancelarEdicion = () => {
    setNombre("");
    setEditandoId(null);
  };

  // ==========================================
  // ELIMINAR
  // ==========================================

  const eliminarCategoria = async (id, nombreCategoria) => {
    const confirmar = await Swal.fire({
      title: "¿Eliminar categoría?",
      text: `¿Deseas eliminar "${nombreCategoria}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
    });

    if (!confirmar.isConfirmed) return;

    try {
      await api.delete(`/categorias/${id}`);

      Swal.fire({
        icon: "success",
        title: "Categoría eliminada",
        timer: 1200,
        showConfirmButton: false,
      });

      cargarCategorias();
    } catch (error) {
      console.error(error);

      Swal.fire(
        "No se puede eliminar",
        error.response?.data?.mensaje || "No se pudo eliminar la categoría.",
        "error",
      );
    }
  };

  // ==========================================
  // CARGA INICIAL
  // ==========================================

  useEffect(() => {
    cargarCategorias();
  }, []);

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2>Administrar Categorías</h2>
            <small className="text-muted">
              Crea y administra las categorías de tu empresa.
            </small>
          </div>
        </div>

        {/* FORMULARIO */}

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="mb-3">
              {editandoId ? "Editar categoría" : "Nueva categoría"}
            </h5>

            <div className="row">
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nombre de la categoría"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      guardarCategoria();
                    }
                  }}
                />
              </div>

              <div className="col-md-4 mt-2 mt-md-0">
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success"
                    onClick={guardarCategoria}
                    disabled={cargando}
                  >
                    {editandoId ? "Actualizar" : "Crear"}
                  </button>

                  {editandoId && (
                    <button
                      className="btn btn-secondary"
                      onClick={cancelarEdicion}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LISTADO */}

        <div className="card shadow-sm">
          <div className="card-header">
            <strong>Categorías registradas</strong>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th width="80">#</th>
                  <th>Nombre</th>
                  <th width="220">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {categorias.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-4 text-muted">
                      No hay categorías registradas.
                    </td>
                  </tr>
                ) : (
                  categorias.map((categoria) => (
                    <tr key={categoria.id}>
                      <td>{categoria.id}</td>

                      <td>
                        <strong>{categoria.nombre}</strong>
                      </td>

                      <td>
                        <button
                          className="btn btn-warning btn-sm me-2"
                          onClick={() => editarCategoria(categoria)}
                        >
                          Editar
                        </button>

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() =>
                            eliminarCategoria(categoria.id, categoria.nombre)
                          }
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

export default Categorias;
