import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";

import api from "../services/api";

function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    rnc: "",
    telefono: "",
    direccion: "",
    correo: "",
    logo_url: "",
    color_principal: "#198754",

    // Características de la empresa
    propina_ley: false,

    admin_nombre: "",
    admin_usuario: "",
    admin_password: "",
  });

  // ==========================================
  // CARGAR EMPRESAS
  // ==========================================

  const cargarEmpresas = async () => {
    try {
      const response = await api.get("/empresas");

      setEmpresas(response.data);
    } catch (error) {
      console.error("Error al cargar empresas:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  // ==========================================
  // CAMBIAR CAMPOS
  // ==========================================

  const cambiarCampo = (e) => {
    const { name, type, checked, value } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // ==========================================
  // ABRIR FORMULARIO
  // ==========================================

  const abrirFormulario = () => {
    setForm({
      nombre: "",
      rnc: "",
      telefono: "",
      direccion: "",
      correo: "",
      logo_url: "",
      color_principal: "#198754",

      // Características
      propina_ley: false,

      admin_nombre: "",
      admin_usuario: "",
      admin_password: "",
    });

    setMostrarFormulario(true);
  };

  // ==========================================
  // CERRAR FORMULARIO
  // ==========================================

  const cerrarFormulario = () => {
    if (guardando) return;

    setMostrarFormulario(false);
  };

  // ==========================================
  // GUARDAR EMPRESA
  // ==========================================

  const guardarEmpresa = async () => {
    if (!form.nombre.trim()) {
      alert("Debe indicar el nombre de la empresa.");
      return;
    }

    if (!form.admin_nombre.trim()) {
      alert("Debe indicar el nombre del administrador.");
      return;
    }

    if (!form.admin_usuario.trim()) {
      alert("Debe indicar el usuario del administrador.");
      return;
    }

    if (!form.admin_password) {
      alert("Debe indicar la contraseña del administrador.");
      return;
    }

    try {
      setGuardando(true);

      await api.post("/empresas", form);

      alert("Empresa creada correctamente.");

      setMostrarFormulario(false);

      await cargarEmpresas();
    } catch (error) {
      console.error("Error al crear empresa:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible crear la empresa.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        {/* ==========================================
            ENCABEZADO
        ========================================== */}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2>Empresas</h2>

            <p className="text-muted mb-0">
              Administración de empresas del sistema
            </p>
          </div>

          <button className="btn btn-success" onClick={abrirFormulario}>
            + Nueva empresa
          </button>
        </div>

        {/* ==========================================
            LISTADO
        ========================================== */}

        {cargando ? (
          <div className="text-center">Cargando empresas...</div>
        ) : (
          <div className="card shadow">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Empresa</th>
                      <th>RNC</th>
                      <th>Teléfono</th>
                      <th>Correo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {empresas.length > 0 ? (
                      empresas.map((empresa) => (
                        <tr key={empresa.id}>
                          <td>{empresa.id}</td>

                          <td>
                            <strong>{empresa.nombre}</strong>
                          </td>

                          <td>{empresa.rnc || "-"}</td>

                          <td>{empresa.telefono || "-"}</td>

                          <td>{empresa.correo || "-"}</td>

                          <td>
                            {empresa.activo ? (
                              <span className="badge bg-success">Activa</span>
                            ) : (
                              <span className="badge bg-danger">Inactiva</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">
                          No hay empresas registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          MODAL NUEVA EMPRESA
      ========================================== */}

      {mostrarFormulario && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              {/* HEADER */}

              <div className="modal-header">
                <h5 className="modal-title">Nueva empresa</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarFormulario}
                ></button>
              </div>

              {/* BODY */}

              <div className="modal-body">
                {/* ==========================================
                    INFORMACIÓN DE LA EMPRESA
                ========================================== */}

                <h6 className="mb-3">Información de la empresa</h6>

                <div className="row">
                  {/* NOMBRE */}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nombre *</label>

                    <input
                      type="text"
                      className="form-control"
                      name="nombre"
                      value={form.nombre}
                      onChange={cambiarCampo}
                      placeholder="Nombre de la empresa"
                    />
                  </div>

                  {/* RNC */}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">RNC</label>

                    <input
                      type="text"
                      className="form-control"
                      name="rnc"
                      value={form.rnc}
                      onChange={cambiarCampo}
                      placeholder="RNC"
                    />
                  </div>

                  {/* TELÉFONO */}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Teléfono</label>

                    <input
                      type="text"
                      className="form-control"
                      name="telefono"
                      value={form.telefono}
                      onChange={cambiarCampo}
                      placeholder="Teléfono"
                    />
                  </div>

                  {/* CORREO */}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Correo</label>

                    <input
                      type="email"
                      className="form-control"
                      name="correo"
                      value={form.correo}
                      onChange={cambiarCampo}
                      placeholder="correo@empresa.com"
                    />
                  </div>

                  {/* DIRECCIÓN */}

                  <div className="col-md-12 mb-3">
                    <label className="form-label">Dirección</label>

                    <input
                      type="text"
                      className="form-control"
                      name="direccion"
                      value={form.direccion}
                      onChange={cambiarCampo}
                      placeholder="Dirección de la empresa"
                    />
                  </div>

                  {/* LOGO */}

                  <div className="col-md-8 mb-3">
                    <label className="form-label">URL del logo</label>

                    <input
                      type="text"
                      className="form-control"
                      name="logo_url"
                      value={form.logo_url}
                      onChange={cambiarCampo}
                      placeholder="https://..."
                    />
                  </div>

                  {/* COLOR */}

                  <div className="col-md-4 mb-3">
                    <label className="form-label">Color principal</label>

                    <input
                      type="color"
                      className="form-control form-control-color w-100"
                      name="color_principal"
                      value={form.color_principal}
                      onChange={cambiarCampo}
                    />
                  </div>
                </div>

                <hr />

                {/* ==========================================
                    CARACTERÍSTICAS
                ========================================== */}

                <h6 className="mb-3">Características de la empresa</h6>

                <div className="card border-0 bg-light mb-4">
                  <div className="card-body">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="propina_ley"
                        name="propina_ley"
                        checked={form.propina_ley}
                        onChange={cambiarCampo}
                      />

                      <label
                        className="form-check-label fw-semibold"
                        htmlFor="propina_ley"
                      >
                        Habilitar propina de ley (10%)
                      </label>
                    </div>

                    <div className="form-text">
                      Permite que esta empresa pueda aplicar una propina del 10%
                      individualmente en sus facturas.
                    </div>
                  </div>
                </div>

                <hr />

                {/* ==========================================
                    ADMINISTRADOR
                ========================================== */}

                <h6 className="mb-3">Administrador de la empresa</h6>

                <div className="row">
                  {/* NOMBRE ADMIN */}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Nombre del administrador *
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      name="admin_nombre"
                      value={form.admin_nombre}
                      onChange={cambiarCampo}
                      placeholder="Nombre completo"
                    />
                  </div>

                  {/* USUARIO */}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Usuario *</label>

                    <input
                      type="text"
                      className="form-control"
                      name="admin_usuario"
                      value={form.admin_usuario}
                      onChange={cambiarCampo}
                      placeholder="usuario"
                    />
                  </div>

                  {/* CONTRASEÑA */}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contraseña *</label>

                    <input
                      type="password"
                      className="form-control"
                      name="admin_password"
                      value={form.admin_password}
                      onChange={cambiarCampo}
                      placeholder="Contraseña"
                    />
                  </div>
                </div>
              </div>

              {/* FOOTER */}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={guardarEmpresa}
                  disabled={guardando}
                >
                  {guardando ? "Creando..." : "Crear empresa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Empresas;
