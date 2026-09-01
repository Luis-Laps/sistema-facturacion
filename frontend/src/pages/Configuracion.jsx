import { useEffect, useState } from "react";

import api from "../services/api";

function Configuracion() {
  const [form, setForm] = useState({
    nombre: "",
    rnc: "",
    telefono: "",
    direccion: "",
    correo: "",
    logo_url: "",
    color_principal: "#198754",
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // ==========================================
  // CARGAR CONFIGURACIÓN
  // ==========================================

  const cargarConfiguracion = async () => {
    try {
      setCargando(true);

      const response = await api.get("/configuracion");

      setForm({
        nombre: response.data.nombre || "",
        rnc: response.data.rnc || "",
        telefono: response.data.telefono || "",
        direccion: response.data.direccion || "",
        correo: response.data.correo || "",
        logo_url: response.data.logo_url || "",
        color_principal: response.data.color_principal || "#198754",
      });
    } catch (error) {
      console.error("Error al cargar configuración:", error);

      alert(
        error.response?.data?.mensaje || "Error al cargar la configuración",
      );
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // CAMBIAR CAMPO
  // ==========================================

  const cambiarCampo = (campo, valor) => {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  // ==========================================
  // GUARDAR
  // ==========================================

  const guardar = async () => {
    if (!form.nombre.trim()) {
      alert("El nombre de la empresa es obligatorio.");
      return;
    }

    try {
      setGuardando(true);

      const response = await api.put("/configuracion", form);

      if (response.data.empresa) {
        setForm({
          nombre: response.data.empresa.nombre || "",
          rnc: response.data.empresa.rnc || "",
          telefono: response.data.empresa.telefono || "",
          direccion: response.data.empresa.direccion || "",
          correo: response.data.empresa.correo || "",
          logo_url: response.data.empresa.logo_url || "",
          color_principal: response.data.empresa.color_principal || "#198754",
        });
      }

      alert("Configuración guardada correctamente.");
    } catch (error) {
      console.error("Error al guardar configuración:", error);

      alert(
        error.response?.data?.mensaje || "Error al guardar la configuración",
      );
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // CARGAR AL ENTRAR
  // ==========================================

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return (
      <>
        <div className="container mt-4">
          <div className="text-center py-5">
            <div className="spinner-border text-success" role="status" />

            <p className="mt-3">Cargando configuración...</p>
          </div>
        </div>
      </>
    );
  }

  // ==========================================
  // PANTALLA
  // ==========================================

  return (
    <>
      <div className="container mt-4 mb-5">
        <div className="mb-4">
          <h2>Configuración de la empresa</h2>

          <p className="text-muted">
            Información que aparecerá en el sistema y en las facturas.
          </p>
        </div>

        <div className="row">
          {/* ================================= */}
          {/* INFORMACIÓN EMPRESA */}
          {/* ================================= */}

          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h5 className="mb-4">Información de la empresa</h5>

                {/* NOMBRE */}

                <div className="mb-3">
                  <label className="form-label">Nombre de la empresa</label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nombre de la empresa"
                    value={form.nombre}
                    onChange={(e) => cambiarCampo("nombre", e.target.value)}
                  />
                </div>

                {/* RNC */}

                <div className="mb-3">
                  <label className="form-label">RNC</label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="RNC"
                    value={form.rnc}
                    onChange={(e) => cambiarCampo("rnc", e.target.value)}
                  />
                </div>

                {/* TELEFONO */}

                <div className="mb-3">
                  <label className="form-label">Teléfono</label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Teléfono"
                    value={form.telefono}
                    onChange={(e) => cambiarCampo("telefono", e.target.value)}
                  />
                </div>

                {/* DIRECCION */}

                <div className="mb-3">
                  <label className="form-label">Dirección</label>

                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Dirección"
                    value={form.direccion}
                    onChange={(e) => cambiarCampo("direccion", e.target.value)}
                  />
                </div>

                {/* CORREO */}

                <div className="mb-3">
                  <label className="form-label">Correo electrónico</label>

                  <input
                    type="email"
                    className="form-control"
                    placeholder="correo@empresa.com"
                    value={form.correo}
                    onChange={(e) => cambiarCampo("correo", e.target.value)}
                  />
                </div>

                {/* LOGO */}

                <div className="mb-3">
                  <label className="form-label">URL del logo</label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://..."
                    value={form.logo_url}
                    onChange={(e) => cambiarCampo("logo_url", e.target.value)}
                  />

                  <small className="text-muted">
                    Puedes colocar la URL pública de la imagen del logo.
                  </small>
                </div>

                {/* COLOR */}

                <div className="mb-4">
                  <label className="form-label">Color principal</label>

                  <div className="d-flex align-items-center gap-3">
                    <input
                      type="color"
                      className="form-control form-control-color"
                      value={form.color_principal || "#198754"}
                      onChange={(e) =>
                        cambiarCampo("color_principal", e.target.value)
                      }
                    />

                    <span>{form.color_principal || "#198754"}</span>
                  </div>
                </div>

                {/* BOTON */}

                <button
                  className="btn btn-success"
                  onClick={guardar}
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Guardar configuración"}
                </button>
              </div>
            </div>
          </div>

          {/* ================================= */}
          {/* VISTA PREVIA */}
          {/* ================================= */}

          <div className="col-lg-4 mt-4 mt-lg-0">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h5 className="mb-4">Vista previa</h5>

                <div
                  className="border rounded p-3"
                  style={{
                    borderTop: `5px solid ${form.color_principal || "#198754"}`,
                  }}
                >
                  {form.logo_url ? (
                    <div className="text-center mb-3">
                      <img
                        src={form.logo_url}
                        alt="Logo de la empresa"
                        style={{
                          maxWidth: "180px",
                          maxHeight: "100px",
                          objectFit: "contain",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center text-muted mb-3">Sin logo</div>
                  )}

                  <h5 className="text-center">
                    {form.nombre || "Nombre de la empresa"}
                  </h5>

                  {form.rnc && (
                    <p className="text-center mb-1">RNC: {form.rnc}</p>
                  )}

                  {form.telefono && (
                    <p className="text-center mb-1">{form.telefono}</p>
                  )}

                  {form.correo && (
                    <p className="text-center mb-1">{form.correo}</p>
                  )}

                  {form.direccion && (
                    <p className="text-center text-muted mb-0">
                      {form.direccion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Configuracion;
