import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
function ControlOrden() {
  const navigate = useNavigate();
  const [mesas, setMesas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombreMesa, setNombreMesa] = useState("");

  const cargarMesas = async () => {
    try {
      setCargando(true);

      const response = await api.get("/control-orden/mesas");

      setMesas(response.data);
    } catch (error) {
      console.error("Error al cargar mesas:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.mensaje || "No se pudieron cargar las mesas.",
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMesas();
  }, []);

  const abrirModal = () => {
    setNombreMesa("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setNombreMesa("");
  };

  const crearMesa = async (e) => {
    e.preventDefault();

    if (!nombreMesa.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Nombre requerido",
        text: "Escribe el nombre de la mesa.",
      });

      return;
    }

    try {
      await api.post("/control-orden/mesas", {
        nombre: nombreMesa.trim(),
      });

      cerrarModal();

      await cargarMesas();

      Swal.fire({
        icon: "success",
        title: "Mesa creada",
        text: "La mesa se creó correctamente.",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error al crear mesa:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo crear",
        text:
          error.response?.data?.mensaje || "Ocurrió un error al crear la mesa.",
      });
    }
  };

  return (
    <>
      <div className="container-fluid px-4 py-4">
        {/* ENCABEZADO */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">Control de Orden</h2>

            <p className="text-muted mb-0">
              Gestiona las mesas y sus cuentas abiertas.
            </p>
          </div>

          <button className="btn btn-success" onClick={abrirModal}>
            + Agregar mesa
          </button>
        </div>

        {/* CONTENIDO */}
        {cargando ? (
          <div className="text-center py-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>

            <p className="text-muted mt-3">Cargando mesas...</p>
          </div>
        ) : mesas.length === 0 ? (
          <div
            className="text-center py-5"
            style={{
              border: "2px dashed #dee2e6",
              borderRadius: "16px",
              backgroundColor: "#fafafa",
            }}
          >
            <div
              style={{
                fontSize: "50px",
                marginBottom: "15px",
              }}
            >
              🍽️
            </div>

            <h4 className="fw-bold">No hay mesas creadas</h4>

            <p className="text-muted mb-4">
              Crea una mesa para comenzar a recibir órdenes.
            </p>

            <button className="btn btn-success" onClick={abrirModal}>
              + Agregar primera mesa
            </button>
          </div>
        ) : (
          <div className="row g-4">
            {mesas.map((mesa) => {
              const cuentasAbiertas = Number(mesa.cuentas_abiertas || 0);

              const total = Number(mesa.total || 0);

              const ocupada = cuentasAbiertas > 0;

              return (
                <div
                  className="col-12 col-sm-6 col-md-4 col-lg-3"
                  key={mesa.id}
                >
                  <div
                    className="card h-100 border-0 shadow-sm"
                    style={{
                      borderRadius: "18px",
                      overflow: "hidden",
                    }}
                  >
                    {/* CABECERA */}
                    <div
                      className="p-3"
                      style={{
                        backgroundColor: ocupada ? "#fff3f3" : "#f1f9f4",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <h4 className="fw-bold mb-0">{mesa.nombre}</h4>

                        <span
                          className={`badge ${
                            ocupada ? "bg-danger" : "bg-success"
                          }`}
                        >
                          {ocupada ? "OCUPADA" : "LIBRE"}
                        </span>
                      </div>
                    </div>

                    {/* CUERPO */}
                    <div className="card-body p-4">
                      {ocupada ? (
                        <>
                          <div className="mb-3">
                            <small className="text-muted">
                              Cuentas abiertas
                            </small>

                            <div className="fs-4 fw-bold">
                              {cuentasAbiertas}
                            </div>
                          </div>

                          <div>
                            <small className="text-muted">Total actual</small>

                            <div className="fs-4 fw-bold text-success">
                              RD${" "}
                              {total.toLocaleString("es-DO", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-3">
                          <div
                            style={{
                              fontSize: "40px",
                            }}
                          >
                            🪑
                          </div>

                          <p className="text-muted mb-0">Mesa disponible</p>
                        </div>
                      )}
                    </div>

                    {/* PIE */}
                    <div className="card-footer bg-white border-0 p-3">
                      <button
                        className={`btn w-100 ${
                          ocupada ? "btn-primary" : "btn-success"
                        }`}
                        onClick={() =>
                          navigate(`/control-orden/mesa/${mesa.id}`)
                        }
                      >
                        {ocupada ? "Ver orden" : "Abrir orden"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CREAR MESA */}
      {mostrarModal && (
        <div
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={crearMesa}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Agregar mesa</h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={cerrarModal}
                  />
                </div>

                <div className="modal-body">
                  <label className="form-label fw-semibold">
                    Nombre de la mesa
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Mesa 01"
                    value={nombreMesa}
                    onChange={(e) => setNombreMesa(e.target.value)}
                    autoFocus
                  />

                  <small className="text-muted">
                    Puedes utilizar nombres como Mesa 01, Terraza 1, Barra, etc.
                  </small>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cerrarModal}
                  >
                    Cancelar
                  </button>

                  <button type="submit" className="btn btn-success">
                    Crear mesa
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ControlOrden;
