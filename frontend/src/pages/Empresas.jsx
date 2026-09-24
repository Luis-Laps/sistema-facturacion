import { useEffect, useState } from "react";
import api from "../services/api";

function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // ==========================================
  // EMPRESA EN EDICIÓN
  // ==========================================

  const [empresaEditando, setEmpresaEditando] = useState(null);

  // ==========================================
  // MÓDULOS
  // ==========================================

  const [modulos, setModulos] = useState([]);
  const [modulosEmpresa, setModulosEmpresa] = useState([]);
  const [cargandoModulos, setCargandoModulos] = useState(false);
  const [guardandoModulo, setGuardandoModulo] = useState(false);

  // ==========================================
  // FORMULARIO
  // ==========================================

  const [form, setForm] = useState({
    nombre: "",
    rnc: "",
    telefono: "",
    direccion: "",
    correo: "",
    logo_url: "",
    color_principal: "#198754",

    // Tipo de empresa
    tipo: "ESTANDAR",

    // Características
    propina_ley: false,
    itbis_ley: false,

    // Administrador
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

      alert(
        error.response?.data?.mensaje || "No fue posible cargar las empresas.",
      );
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // CARGAR TODOS LOS MÓDULOS
  // ==========================================

  const cargarModulos = async () => {
    try {
      const response = await api.get("/modulos");

      setModulos(response.data);
    } catch (error) {
      console.error("Error al cargar módulos:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible cargar los módulos.",
      );
    }
  };

  // ==========================================
  // CARGAR MÓDULOS DE UNA EMPRESA
  // ==========================================

  const cargarModulosEmpresa = async (empresaId) => {
    if (!empresaId) {
      setModulosEmpresa([]);
      return;
    }

    try {
      setCargandoModulos(true);

      const response = await api.get(`/modulos/empresa/${empresaId}`);

      setModulosEmpresa(response.data.modulos || []);
    } catch (error) {
      console.error("Error al cargar módulos de la empresa:", error);

      setModulosEmpresa([]);

      alert(
        error.response?.data?.mensaje ||
          "No fue posible cargar los módulos de la empresa.",
      );
    } finally {
      setCargandoModulos(false);
    }
  };

  // ==========================================
  // CARGA INICIAL
  // ==========================================

  useEffect(() => {
    cargarEmpresas();
    cargarModulos();
  }, []);

  // ==========================================
  // CAMBIAR CAMPOS
  // ==========================================

  const cambiarCampo = (e) => {
    const { name, type, checked, value } = e.target;

    setForm((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ==========================================
  // FORMULARIO NUEVA EMPRESA
  // ==========================================

  const abrirFormulario = () => {
    setEmpresaEditando(null);
    setModulosEmpresa([]);

    setForm({
      nombre: "",
      rnc: "",
      telefono: "",
      direccion: "",
      correo: "",
      logo_url: "",
      color_principal: "#198754",

      tipo: "ESTANDAR",

      propina_ley: false,
      itbis_ley: false,

      admin_nombre: "",
      admin_usuario: "",
      admin_password: "",
    });

    setMostrarFormulario(true);
  };

  // ==========================================
  // FORMULARIO EDITAR EMPRESA
  // ==========================================

  const abrirEditar = async (empresa) => {
    setEmpresaEditando(empresa);

    setForm({
      nombre: empresa.nombre || "",
      rnc: empresa.rnc || "",
      telefono: empresa.telefono || "",
      direccion: empresa.direccion || "",
      correo: empresa.correo || "",
      logo_url: empresa.logo_url || "",
      color_principal: empresa.color_principal || "#198754",

      tipo: empresa.tipo || "ESTANDAR",

      propina_ley: empresa.propina_ley === true,
      itbis_ley: empresa.itbis_ley === true,

      admin_nombre: "",
      admin_usuario: "",
      admin_password: "",
    });

    setMostrarFormulario(true);

    await cargarModulosEmpresa(empresa.id);
  };

  // ==========================================
  // CERRAR FORMULARIO
  // ==========================================

  const cerrarFormulario = () => {
    if (guardando || guardandoModulo) return;

    setMostrarFormulario(false);
    setEmpresaEditando(null);
    setModulosEmpresa([]);
  };

  // ==========================================
  // VERIFICAR SI UN MÓDULO ESTÁ ASIGNADO
  // ==========================================

  const moduloAsignado = (codigo) => {
    const modulo = modulosEmpresa.find((item) => item.codigo === codigo);

    return modulo?.asignado === true;
  };

  // ==========================================
  // ASIGNAR / QUITAR MÓDULO
  // ==========================================

  const cambiarModulo = async (modulo) => {
    if (!empresaEditando || guardandoModulo) {
      return;
    }

    const asignado = moduloAsignado(modulo.codigo);

    try {
      setGuardandoModulo(true);

      if (asignado) {
        await api.delete(`/modulos/empresa/${empresaEditando.id}/${modulo.id}`);
      } else {
        await api.post(`/modulos/empresa/${empresaEditando.id}/asignar`, {
          modulo_id: modulo.id,
        });
      }

      // Recargar módulos para reflejar el nuevo estado
      await cargarModulosEmpresa(empresaEditando.id);
    } catch (error) {
      console.error("Error al cambiar módulo:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible modificar el módulo.",
      );
    } finally {
      setGuardandoModulo(false);
    }
  };

  // ==========================================
  // GUARDAR EMPRESA
  // CREAR / EDITAR
  // ==========================================

  const guardarEmpresa = async () => {
    if (!form.nombre.trim()) {
      alert("Debe indicar el nombre de la empresa.");
      return;
    }

    // ==========================================
    // VALIDACIONES SOLO PARA CREAR
    // ==========================================

    if (!empresaEditando) {
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
    }

    try {
      setGuardando(true);

      // ==========================================
      // EDITAR
      // ==========================================

      if (empresaEditando) {
        await api.put(`/empresas/${empresaEditando.id}`, {
          nombre: form.nombre,
          rnc: form.rnc,
          telefono: form.telefono,
          direccion: form.direccion,
          correo: form.correo,
          logo_url: form.logo_url,
          color_principal: form.color_principal,
          tipo: form.tipo,
          propina_ley: form.propina_ley,
          itbis_ley: form.itbis_ley,
        });

        alert("Empresa actualizada correctamente.");

        // Recargar módulos por si el modal sigue abierto
        await cargarModulosEmpresa(empresaEditando.id);
      } else {
        // ==========================================
        // CREAR
        // ==========================================

        const response = await api.post("/empresas", form);

        const empresaCreada = response.data?.empresa;

        alert("Empresa creada correctamente.");

        // Si el backend devuelve la empresa creada,
        // abrimos automáticamente la gestión de módulos.
        if (empresaCreada?.id) {
          setEmpresaEditando(empresaCreada);

          setForm({
            nombre: empresaCreada.nombre || form.nombre,
            rnc: empresaCreada.rnc || form.rnc,
            telefono: empresaCreada.telefono || form.telefono,
            direccion: empresaCreada.direccion || form.direccion,
            correo: empresaCreada.correo || form.correo,
            logo_url: empresaCreada.logo_url || form.logo_url,
            color_principal:
              empresaCreada.color_principal || form.color_principal,
            tipo: empresaCreada.tipo || form.tipo,
            propina_ley: empresaCreada.propina_ley === true,
            itbis_ley: empresaCreada.itbis_ley === true,
            admin_nombre: "",
            admin_usuario: "",
            admin_password: "",
          });

          await cargarModulosEmpresa(empresaCreada.id);

          setMostrarFormulario(true);
        } else {
          setMostrarFormulario(false);
        }
      }

      await cargarEmpresas();
    } catch (error) {
      console.error(
        empresaEditando
          ? "Error al editar empresa:"
          : "Error al crear empresa:",
        error,
      );

      alert(
        error.response?.data?.mensaje ||
          (empresaEditando
            ? "No fue posible actualizar la empresa."
            : "No fue posible crear la empresa."),
      );
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINAR EMPRESA
  // DESACTIVACIÓN LÓGICA
  // ==========================================

  const eliminarEmpresa = async (empresa) => {
    const confirmar = window.confirm(
      `¿Está seguro de eliminar la empresa "${empresa.nombre}"?\n\n` +
        "La empresa será desactivada y no se eliminarán sus datos históricos.",
    );

    if (!confirmar) {
      return;
    }

    try {
      setGuardando(true);

      await api.delete(`/empresas/${empresa.id}`);

      alert("Empresa eliminada correctamente.");

      await cargarEmpresas();
    } catch (error) {
      console.error("Error al eliminar empresa:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible eliminar la empresa.",
      );
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // REACTIVAR EMPRESA
  // ==========================================

  const reactivarEmpresa = async (empresa) => {
    const confirmar = window.confirm(
      `¿Desea reactivar la empresa "${empresa.nombre}"?`,
    );

    if (!confirmar) {
      return;
    }

    try {
      setGuardando(true);

      await api.put(`/empresas/${empresa.id}`, {
        nombre: empresa.nombre,
        rnc: empresa.rnc,
        telefono: empresa.telefono,
        direccion: empresa.direccion,
        correo: empresa.correo,
        logo_url: empresa.logo_url,
        color_principal: empresa.color_principal || "#198754",
        tipo: empresa.tipo || "ESTANDAR",
        propina_ley: empresa.propina_ley === true,
        itbis_ley: empresa.itbis_ley === true,
        activo: true,
      });

      alert("Empresa reactivada correctamente.");

      await cargarEmpresas();
    } catch (error) {
      console.error("Error al reactivar empresa:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible reactivar la empresa.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
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

          <button
            className="btn btn-success"
            onClick={abrirFormulario}
            disabled={guardando}
          >
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
                      <th>Acciones</th>
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

                          <td>
                            <div className="d-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => abrirEditar(empresa)}
                                disabled={guardando}
                              >
                                ✏️ Editar
                              </button>

                              {empresa.activo ? (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => eliminarEmpresa(empresa)}
                                  disabled={guardando}
                                >
                                  🗑️ Eliminar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm"
                                  onClick={() => reactivarEmpresa(empresa)}
                                  disabled={guardando}
                                >
                                  ↻ Reactivar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center">
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

        {/* ==========================================
            MODAL
            NUEVA / EDITAR EMPRESA
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
                {/* ==========================================
                    HEADER
                ========================================== */}

                <div className="modal-header">
                  <h5 className="modal-title">
                    {empresaEditando ? "Editar empresa" : "Nueva empresa"}
                  </h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={cerrarFormulario}
                    disabled={guardando || guardandoModulo}
                  ></button>
                </div>

                {/* ==========================================
                    BODY
                ========================================== */}

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

                    {/* TIPO DE EMPRESA */}

                    <div className="col-md-12 mb-3">
                      <label className="form-label">Tipo de empresa</label>

                      <select
                        className="form-select"
                        name="tipo"
                        value={form.tipo}
                        onChange={cambiarCampo}
                        disabled={guardando}
                      >
                        <option value="ESTANDAR">Empresa estándar</option>

                        <option value="FERRETERIA">Ferretería</option>
                      </select>

                      <div className="form-text">
                        Clasificación de la empresa. Los módulos se asignan
                        independientemente desde la sección de módulos.
                      </div>
                    </div>
                  </div>

                  <hr />

                  {/* ==========================================
                      CARACTERÍSTICAS
                  ========================================== */}

                  <h6 className="mb-3">Características de la empresa</h6>

                  <div className="card border-0 bg-light mb-4">
                    <div className="card-body">
                      {/* PROPINA */}

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
                        Permite que esta empresa pueda aplicar una propina del
                        10% individualmente en sus facturas.
                      </div>

                      <hr />

                      {/* ITBIS */}

                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="itbis_ley"
                          name="itbis_ley"
                          checked={form.itbis_ley}
                          onChange={cambiarCampo}
                        />

                        <label
                          className="form-check-label fw-semibold"
                          htmlFor="itbis_ley"
                        >
                          Habilitar ITBIS (18%)
                        </label>
                      </div>

                      <div className="form-text">
                        Permite que esta empresa pueda aplicar un ITBIS del 18%
                        individualmente en sus facturas.
                      </div>
                    </div>
                  </div>

                  {/* ==========================================
                      MÓDULOS
                  ========================================== */}

                  <h6 className="mb-3">Módulos de la empresa</h6>

                  {!empresaEditando ? (
                    <div className="alert alert-info">
                      <strong>Empresa nueva</strong>

                      <div className="mt-1">
                        Primero cree la empresa. Después podrá asignarle los
                        módulos que tendrá disponibles.
                      </div>
                    </div>
                  ) : cargandoModulos ? (
                    <div className="text-center py-3">Cargando módulos...</div>
                  ) : modulos.length === 0 ? (
                    <div className="alert alert-warning">
                      No hay módulos disponibles.
                    </div>
                  ) : (
                    <div className="row">
                      {modulos.map((modulo) => {
                        const asignado = moduloAsignado(modulo.codigo);

                        return (
                          <div className="col-md-6 mb-3" key={modulo.id}>
                            <div
                              className={`card h-100 ${
                                asignado ? "border-success" : ""
                              }`}
                            >
                              <div className="card-body">
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`modulo-${modulo.id}`}
                                    checked={asignado}
                                    disabled={guardandoModulo}
                                    onChange={() => cambiarModulo(modulo)}
                                  />

                                  <label
                                    className="form-check-label w-100"
                                    htmlFor={`modulo-${modulo.id}`}
                                    style={{
                                      cursor: guardandoModulo
                                        ? "default"
                                        : "pointer",
                                    }}
                                  >
                                    <div className="d-flex align-items-center gap-2">
                                      <span
                                        style={{
                                          fontSize: "1.4rem",
                                        }}
                                      >
                                        {modulo.icono || "📦"}
                                      </span>

                                      <strong>{modulo.nombre}</strong>
                                    </div>

                                    {modulo.descripcion && (
                                      <div className="text-muted small mt-1">
                                        {modulo.descripcion}
                                      </div>
                                    )}
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {empresaEditando && (
                    <div className="alert alert-secondary mt-2">
                      <strong>Importante:</strong> los módulos se guardan
                      inmediatamente al marcar o desmarcar cada opción.
                    </div>
                  )}

                  {/* ==========================================
                      ADMINISTRADOR
                      SOLO AL CREAR
                  ========================================== */}

                  {!empresaEditando && (
                    <>
                      <hr />

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
                    </>
                  )}
                </div>

                {/* ==========================================
                    FOOTER
                ========================================== */}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cerrarFormulario}
                    disabled={guardando || guardandoModulo}
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    className={
                      empresaEditando ? "btn btn-primary" : "btn btn-success"
                    }
                    onClick={guardarEmpresa}
                    disabled={guardando || guardandoModulo}
                  >
                    {guardando
                      ? "Guardando..."
                      : empresaEditando
                        ? "Guardar cambios"
                        : "Crear empresa"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Empresas;
