import { useEffect, useState } from "react";
import api from "../services/api";

function Empresas() {
  // =====================================================
  // EMPRESAS
  // =====================================================

  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // =====================================================
  // FORMULARIO EMPRESA
  // =====================================================

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    rnc: "",
    telefono: "",
    direccion: "",
    correo: "",
    logo_url: "",
    color_principal: "#198754",
    slogan: "",
    tipo: "ESTANDAR",
    propina_ley: false,
    itbis_ley: false,
    admin_nombre: "",
    admin_usuario: "",
    admin_password: "",
  });

  // =====================================================
  // MÓDULOS
  // =====================================================

  const [modulos, setModulos] = useState([]);
  const [empresaModulos, setEmpresaModulos] = useState([]);
  const [empresaModulosActual, setEmpresaModulosActual] = useState(null);

  const [mostrarModalModulos, setMostrarModalModulos] = useState(false);
  const [cargandoModulos, setCargandoModulos] = useState(false);
  const [guardandoModulo, setGuardandoModulo] = useState(false);

  // =====================================================
  // MANTENIMIENTO
  // =====================================================

  const [mostrarMantenimiento, setMostrarMantenimiento] = useState(false);
  const [empresaMantenimiento, setEmpresaMantenimiento] = useState(null);

  const [mantenimientoData, setMantenimientoData] = useState({
    fecha_mantenimiento: "",
    monto_mantenimiento: 2000,
  });

  const [guardandoMantenimiento, setGuardandoMantenimiento] = useState(false);

  // =====================================================
  // HISTORIAL DE MANTENIMIENTO
  // =====================================================

  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [historialMantenimiento, setHistorialMantenimiento] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // =====================================================
  // REGISTRAR MANTENIMIENTO
  // =====================================================

  const [mostrarRegistrarMantenimiento, setMostrarRegistrarMantenimiento] =
    useState(false);

  const [registroMantenimiento, setRegistroMantenimiento] = useState({
    fecha_mantenimiento: "",
    monto: 2000,
    observaciones: "",
  });

  const [guardandoRegistro, setGuardandoRegistro] = useState(false);

  // =====================================================
  // AVISO MANUAL DE MANTENIMIENTO
  // =====================================================

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [empresaAviso, setEmpresaAviso] = useState(null);
  const [mensajeAviso, setMensajeAviso] = useState("");
  const [enviandoAviso, setEnviandoAviso] = useState(false);

  // =====================================================
  // CARGAR EMPRESAS
  // =====================================================

  const cargarEmpresas = async () => {
    try {
      setCargando(true);

      const response = await api.get("/empresas");

      setEmpresas(response.data || []);
    } catch (error) {
      console.error("Error al cargar empresas:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible cargar las empresas.",
      );
    } finally {
      setCargando(false);
    }
  };

  // =====================================================
  // CARGAR TODOS LOS MÓDULOS
  // =====================================================

  const cargarModulos = async () => {
    try {
      const response = await api.get("/modulos");

      setModulos(response.data || []);
    } catch (error) {
      console.error("Error al cargar módulos:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible cargar los módulos.",
      );
    }
  };

  // =====================================================
  // CARGA INICIAL
  // =====================================================

  useEffect(() => {
    cargarEmpresas();
    cargarModulos();
  }, []);

  // =====================================================
  // CAMBIAR CAMPOS
  // =====================================================

  const cambiarCampo = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // =====================================================
  // NUEVA EMPRESA
  // =====================================================

  const abrirFormulario = () => {
    setEmpresaEditando(null);

    setForm({
      nombre: "",
      rnc: "",
      telefono: "",
      direccion: "",
      correo: "",
      logo_url: "",
      color_principal: "#198754",
      slogan: "",
      tipo: "ESTANDAR",
      propina_ley: false,
      itbis_ley: false,
      admin_nombre: "",
      admin_usuario: "",
      admin_password: "",
    });

    setMostrarFormulario(true);
  };

  // =====================================================
  // EDITAR EMPRESA
  // =====================================================

  const abrirEditar = (empresa) => {
    setEmpresaEditando(empresa);

    setForm({
      nombre: empresa.nombre || "",
      rnc: empresa.rnc || "",
      telefono: empresa.telefono || "",
      direccion: empresa.direccion || "",
      correo: empresa.correo || "",
      logo_url: empresa.logo_url || "",
      color_principal: empresa.color_principal || "#198754",
      slogan: empresa.slogan || "",
      tipo: empresa.tipo || "ESTANDAR",
      propina_ley: empresa.propina_ley === true,
      itbis_ley: empresa.itbis_ley === true,
      admin_nombre: "",
      admin_usuario: "",
      admin_password: "",
    });

    setMostrarFormulario(true);
  };

  // =====================================================
  // CERRAR FORMULARIO
  // =====================================================

  const cerrarFormulario = () => {
    if (guardando) return;

    setMostrarFormulario(false);
    setEmpresaEditando(null);
  };

  // =====================================================
  // GUARDAR EMPRESA
  // =====================================================

  const guardarEmpresa = async () => {
    if (!form.nombre.trim()) {
      alert("Debe indicar el nombre de la empresa.");
      return;
    }

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

      const datos = {
        nombre: form.nombre.trim(),
        rnc: form.rnc,
        telefono: form.telefono,
        direccion: form.direccion,
        correo: form.correo,
        logo_url: form.logo_url,
        color_principal: form.color_principal,
        slogan: form.slogan,
        tipo: form.tipo,
        propina_ley: form.propina_ley,
        itbis_ley: form.itbis_ley,
      };

      // =================================================
      // EDITAR
      // =================================================

      if (empresaEditando) {
        await api.put(`/empresas/${empresaEditando.id}`, datos);

        alert("Empresa actualizada correctamente.");
      }

      // =================================================
      // CREAR
      // =================================================
      else {
        await api.post("/empresas", {
          ...datos,
          admin_nombre: form.admin_nombre,
          admin_usuario: form.admin_usuario,
          admin_password: form.admin_password,
        });

        alert("Empresa creada correctamente.");
      }

      setMostrarFormulario(false);
      setEmpresaEditando(null);

      await cargarEmpresas();
    } catch (error) {
      console.error("Error al guardar empresa:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible guardar la empresa.",
      );
    } finally {
      setGuardando(false);
    }
  };

  // =====================================================
  // ELIMINAR / DESACTIVAR EMPRESA
  // =====================================================

  const eliminarEmpresa = async (empresa) => {
    const confirmar = window.confirm(
      `¿Está seguro de desactivar la empresa "${empresa.nombre}"?\n\n` +
        "La empresa no será eliminada físicamente.",
    );

    if (!confirmar) return;

    try {
      setGuardando(true);

      await api.delete(`/empresas/${empresa.id}`);

      alert("Empresa desactivada correctamente.");

      await cargarEmpresas();
    } catch (error) {
      console.error("Error al desactivar empresa:", error);

      alert(
        error.response?.data?.mensaje ||
          "No fue posible desactivar la empresa.",
      );
    } finally {
      setGuardando(false);
    }
  };

  // =====================================================
  // REACTIVAR EMPRESA
  // =====================================================

  const reactivarEmpresa = async (empresa) => {
    const confirmar = window.confirm(
      `¿Desea reactivar la empresa "${empresa.nombre}"?`,
    );

    if (!confirmar) return;

    try {
      setGuardando(true);

      await api.put(`/empresas/${empresa.id}`, {
        nombre: empresa.nombre,
        rnc: empresa.rnc,
        telefono: empresa.telefono,
        direccion: empresa.direccion,
        correo: empresa.correo,
        logo_url: empresa.logo_url,
        color_principal: empresa.color_principal,
        slogan: empresa.slogan,
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

  // =====================================================
  // ABRIR MÓDULOS
  // =====================================================

  const abrirModulos = async (empresa) => {
    setEmpresaModulosActual(empresa);
    setMostrarModalModulos(true);
    setEmpresaModulos([]);
    setCargandoModulos(true);

    try {
      const response = await api.get(`/modulos/empresa/${empresa.id}`);

      setEmpresaModulos(response.data?.modulos || []);
    } catch (error) {
      console.error("Error al cargar módulos de la empresa:", error);

      alert(
        error.response?.data?.mensaje ||
          "No fue posible cargar los módulos de la empresa.",
      );
    } finally {
      setCargandoModulos(false);
    }
  };

  // =====================================================
  // CERRAR MÓDULOS
  // =====================================================

  const cerrarModulos = () => {
    if (guardandoModulo) return;

    setMostrarModalModulos(false);
    setEmpresaModulosActual(null);
    setEmpresaModulos([]);
  };

  // =====================================================
  // VERIFICAR SI MÓDULO ESTÁ ASIGNADO
  // =====================================================

  const moduloAsignado = (modulo) => {
    const encontrado = empresaModulos.find(
      (item) =>
        Number(item.id) === Number(modulo.id) || item.codigo === modulo.codigo,
    );

    return encontrado?.asignado === true;
  };

  // =====================================================
  // CAMBIAR MÓDULO
  // =====================================================

  const cambiarModulo = async (modulo) => {
    if (!empresaModulosActual || guardandoModulo) {
      return;
    }

    const asignado = moduloAsignado(modulo);

    try {
      setGuardandoModulo(true);

      if (asignado) {
        await api.delete(
          `/modulos/empresa/${empresaModulosActual.id}/${modulo.id}`,
        );
      } else {
        await api.post(`/modulos/empresa/${empresaModulosActual.id}/asignar`, {
          modulo_id: modulo.id,
        });
      }

      // Volver a consultar los módulos
      const response = await api.get(
        `/modulos/empresa/${empresaModulosActual.id}`,
      );

      setEmpresaModulos(response.data?.modulos || []);
    } catch (error) {
      console.error("Error al cambiar módulo:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible modificar el módulo.",
      );
    } finally {
      setGuardandoModulo(false);
    }
  };

  // =====================================================
  // ESTADO DEL MANTENIMIENTO
  // =====================================================

  const obtenerEstadoMantenimiento = (empresa) => {
    if (!empresa?.fecha_mantenimiento) {
      return {
        estado: "SIN_CONFIGURAR",
        dias: null,
        fechaProximo: null,
      };
    }

    const fechaBase = new Date(empresa.fecha_mantenimiento);

    if (Number.isNaN(fechaBase.getTime())) {
      return {
        estado: "SIN_CONFIGURAR",
        dias: null,
        fechaProximo: null,
      };
    }

    const fechaProximo = new Date(fechaBase);

    // Mantenimiento cada 6 meses
    fechaProximo.setMonth(fechaProximo.getMonth() + 6);

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);
    fechaProximo.setHours(0, 0, 0, 0);

    const diferencia = fechaProximo.getTime() - hoy.getTime();

    const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    if (dias < 0) {
      return {
        estado: "VENCIDO",
        dias,
        fechaProximo,
      };
    }

    if (dias === 0) {
      return {
        estado: "HOY",
        dias: 0,
        fechaProximo,
      };
    }

    if (dias <= 30) {
      return {
        estado: "PROXIMO",
        dias,
        fechaProximo,
      };
    }

    return {
      estado: "NORMAL",
      dias,
      fechaProximo,
    };
  };

  // =====================================================
  // FORMATEAR FECHA
  // =====================================================

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";

    const fechaLocal = new Date(fecha);

    if (Number.isNaN(fechaLocal.getTime())) {
      return "-";
    }

    return fechaLocal.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // =====================================================
  // FORMATEAR MONTO
  // =====================================================

  const formatearMonto = (monto) => {
    return Number(monto || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // =====================================================
  // ABRIR CONFIGURACIÓN DE MANTENIMIENTO
  // =====================================================

  const abrirMantenimiento = async (empresa) => {
    setEmpresaMantenimiento(empresa);

    setMantenimientoData({
      fecha_mantenimiento: empresa.fecha_mantenimiento
        ? String(empresa.fecha_mantenimiento).substring(0, 10)
        : "",
      monto_mantenimiento: empresa.monto_mantenimiento ?? 2000,
    });

    setMostrarMantenimiento(true);

    try {
      const response = await api.get(`/mantenimientos/empresa/${empresa.id}`);

      if (response.data) {
        setMantenimientoData({
          fecha_mantenimiento: response.data.fecha_mantenimiento
            ? String(response.data.fecha_mantenimiento).substring(0, 10)
            : "",
          monto_mantenimiento:
            response.data.monto_mantenimiento ??
            empresa.monto_mantenimiento ??
            2000,
        });
      }
    } catch (error) {
      console.log("No existe configuración previa de mantenimiento.");
    }
  };

  // =====================================================
  // GUARDAR CONFIGURACIÓN DE MANTENIMIENTO
  // =====================================================

  const guardarMantenimiento = async () => {
    if (!empresaMantenimiento) return;

    if (!mantenimientoData.fecha_mantenimiento) {
      alert("Debe indicar la fecha de mantenimiento.");
      return;
    }

    const monto = Number(mantenimientoData.monto_mantenimiento);

    if (Number.isNaN(monto) || monto < 0) {
      alert("El monto de mantenimiento no es válido.");
      return;
    }

    try {
      setGuardandoMantenimiento(true);

      await api.put(`/mantenimientos/empresa/${empresaMantenimiento.id}`, {
        fecha_mantenimiento: mantenimientoData.fecha_mantenimiento,
        monto_mantenimiento: monto,
      });

      alert("Configuración de mantenimiento guardada correctamente.");

      setMostrarMantenimiento(false);

      await cargarEmpresas();
    } catch (error) {
      console.error("Error al guardar mantenimiento:", error);

      alert(
        error.response?.data?.mensaje ||
          "No fue posible guardar el mantenimiento.",
      );
    } finally {
      setGuardandoMantenimiento(false);
    }
  };

  // =====================================================
  // ABRIR HISTORIAL
  // =====================================================

  const abrirHistorial = async (empresa) => {
    setEmpresaMantenimiento(empresa);
    setMostrarHistorial(true);
    setHistorialMantenimiento([]);
    setCargandoHistorial(true);

    try {
      const response = await api.get(
        `/mantenimientos/empresa/${empresa.id}/historial`,
      );

      setHistorialMantenimiento(response.data || []);
    } catch (error) {
      console.error("Error al cargar historial:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible cargar el historial.",
      );
    } finally {
      setCargandoHistorial(false);
    }
  };

  // =====================================================
  // ABRIR REGISTRO DE MANTENIMIENTO
  // =====================================================

  const abrirRegistrarMantenimiento = (empresa) => {
    setEmpresaMantenimiento(empresa);

    setRegistroMantenimiento({
      fecha_mantenimiento: new Date().toISOString().substring(0, 10),
      monto: empresa.monto_mantenimiento ?? 2000,
      observaciones: "",
    });

    setMostrarRegistrarMantenimiento(true);
  };

  // =====================================================
  // REGISTRAR MANTENIMIENTO REALIZADO
  // =====================================================

  const registrarMantenimiento = async () => {
    if (!empresaMantenimiento) return;

    if (!registroMantenimiento.fecha_mantenimiento) {
      alert("Debe indicar la fecha.");
      return;
    }

    const monto = Number(registroMantenimiento.monto);

    if (Number.isNaN(monto) || monto < 0) {
      alert("El monto no es válido.");
      return;
    }

    try {
      setGuardandoRegistro(true);

      await api.post(
        `/mantenimientos/empresa/${empresaMantenimiento.id}/registrar`,
        {
          fecha_mantenimiento: registroMantenimiento.fecha_mantenimiento,
          monto,
          observaciones: registroMantenimiento.observaciones,
        },
      );

      alert("Mantenimiento registrado correctamente.");

      setMostrarRegistrarMantenimiento(false);

      await cargarEmpresas();
    } catch (error) {
      console.error("Error al registrar mantenimiento:", error);

      alert(
        error.response?.data?.mensaje ||
          "No fue posible registrar el mantenimiento.",
      );
    } finally {
      setGuardandoRegistro(false);
    }
  };

  // =====================================================
  // AVISO MANUAL
  // =====================================================

  const abrirAviso = (empresa) => {
    const estado = obtenerEstadoMantenimiento(empresa);

    let mensaje = "";

    if (estado.estado === "VENCIDO") {
      mensaje =
        `Hola, le contactamos de parte del sistema. ` +
        `El mantenimiento de su cuenta se encuentra vencido. ` +
        `Por favor, comuníquese con nosotros para coordinarlo.`;
    } else if (estado.estado === "HOY") {
      mensaje =
        `Hola, le contactamos de parte del sistema. ` +
        `Su mantenimiento corresponde para el día de hoy. ` +
        `Por favor, comuníquese con nosotros para coordinarlo.`;
    } else if (estado.estado === "PROXIMO") {
      mensaje =
        `Hola, le contactamos de parte del sistema. ` +
        `Su mantenimiento está próximo. ` +
        `La fecha estimada es ${formatearFecha(estado.fechaProximo)}.`;
    } else {
      mensaje =
        `Hola, le contactamos de parte del sistema. ` +
        `Queremos informarle sobre el próximo mantenimiento ` +
        `de su cuenta.`;
    }

    setEmpresaAviso(empresa);
    setMensajeAviso(mensaje);
    setMostrarAviso(true);
  };

  // =====================================================
  // COPIAR AVISO
  // =====================================================

  const copiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(mensajeAviso);

      alert("Mensaje copiado correctamente.");
    } catch (error) {
      console.error("Error copiando mensaje:", error);

      alert("No fue posible copiar el mensaje.");
    }
  };

  // =====================================================
  // ENVIAR NOTIFICACIÓN INTERNA
  // =====================================================

  const enviarAvisoInterno = async () => {
    if (!empresaAviso) return;

    if (!mensajeAviso.trim()) {
      alert("El mensaje no puede estar vacío.");
      return;
    }

    try {
      setEnviandoAviso(true);

      await api.post("/notificaciones/enviar", {
        empresa_id: empresaAviso.id,
        titulo: "Aviso de mantenimiento",
        mensaje: mensajeAviso,
      });

      alert("Notificación enviada al administrador de la empresa.");

      setMostrarAviso(false);
    } catch (error) {
      console.error("Error enviando notificación:", error);

      alert(
        error.response?.data?.mensaje ||
          "No fue posible enviar la notificación.",
      );
    } finally {
      setEnviandoAviso(false);
    }
  };

  // =====================================================
  // ABRIR WHATSAPP
  // =====================================================

  const abrirWhatsApp = () => {
    if (!empresaAviso?.telefono) {
      alert("Esta empresa no tiene un número de teléfono registrado.");
      return;
    }

    const telefono = String(empresaAviso.telefono).replace(/\D/g, "");

    if (!telefono) {
      alert("El teléfono de la empresa no es válido.");
      return;
    }

    const url =
      `https://wa.me/${telefono}?text=` + encodeURIComponent(mensajeAviso);

    window.open(url, "_blank");
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <div className="container mt-4">
        {/* =================================================
            ENCABEZADO
        ================================================= */}

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

        {/* =================================================
            LISTADO
        ================================================= */}

        {cargando ? (
          <div className="text-center py-5">Cargando empresas...</div>
        ) : (
          <div className="card shadow-sm">
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
                      <th>Mantenimiento</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {empresas.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          No hay empresas registradas
                        </td>
                      </tr>
                    ) : (
                      empresas.map((empresa) => {
                        const mantenimiento =
                          obtenerEstadoMantenimiento(empresa);

                        return (
                          <tr key={empresa.id}>
                            <td>{empresa.id}</td>

                            <td>
                              <strong>{empresa.nombre}</strong>

                              {empresa.slogan && (
                                <div className="small text-muted">
                                  {empresa.slogan}
                                </div>
                              )}
                            </td>

                            <td>{empresa.rnc || "-"}</td>

                            <td>{empresa.telefono || "-"}</td>

                            <td>{empresa.correo || "-"}</td>

                            <td>
                              {mantenimiento.estado === "SIN_CONFIGURAR" ? (
                                <span className="badge bg-secondary">
                                  Sin configurar
                                </span>
                              ) : mantenimiento.estado === "VENCIDO" ? (
                                <span className="badge bg-danger">Vencido</span>
                              ) : mantenimiento.estado === "HOY" ? (
                                <span className="badge bg-danger">Hoy</span>
                              ) : mantenimiento.estado === "PROXIMO" ? (
                                <span className="badge bg-warning text-dark">
                                  Próximo
                                </span>
                              ) : (
                                <span className="badge bg-success">Normal</span>
                              )}

                              {mantenimiento.fechaProximo && (
                                <div className="small text-muted mt-1">
                                  {formatearFecha(mantenimiento.fechaProximo)}
                                </div>
                              )}
                            </td>

                            <td>
                              {empresa.activo ? (
                                <span className="badge bg-success">Activa</span>
                              ) : (
                                <span className="badge bg-danger">
                                  Inactiva
                                </span>
                              )}
                            </td>

                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {/* EDITAR */}

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => abrirEditar(empresa)}
                                  title="Editar empresa"
                                >
                                  ✏️
                                </button>

                                {/* MÓDULOS */}

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark"
                                  onClick={() => abrirModulos(empresa)}
                                  title="Administrar módulos"
                                >
                                  ⚙️
                                </button>

                                {/* MANTENIMIENTO */}

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => abrirMantenimiento(empresa)}
                                  title="Configurar mantenimiento"
                                >
                                  🔧
                                </button>

                                {/* HISTORIAL */}

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-info"
                                  onClick={() => abrirHistorial(empresa)}
                                  title="Historial de mantenimiento"
                                >
                                  📋
                                </button>

                                {/* AVISO */}

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => abrirAviso(empresa)}
                                  title="Enviar aviso manual"
                                >
                                  📲
                                </button>

                                {/* DESACTIVAR */}

                                {empresa.activo ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => eliminarEmpresa(empresa)}
                                    title="Desactivar empresa"
                                  >
                                    🗑️
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-success"
                                    onClick={() => reactivarEmpresa(empresa)}
                                    title="Reactivar empresa"
                                  >
                                    ♻️
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          MODAL NUEVA / EDITAR EMPRESA
      ===================================================== */}

      {mostrarFormulario && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {empresaEditando ? "Editar empresa" : "Nueva empresa"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarFormulario}
                />
              </div>

              <div className="modal-body">
                <div className="row">
                  {/* NOMBRE */}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nombre</label>

                    <input
                      type="text"
                      className="form-control"
                      name="nombre"
                      value={form.nombre}
                      onChange={cambiarCampo}
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
                    />
                  </div>

                  {/* DIRECCIÓN */}

                  <div className="col-12 mb-3">
                    <label className="form-label">Dirección</label>

                    <textarea
                      className="form-control"
                      name="direccion"
                      rows="2"
                      value={form.direccion}
                      onChange={cambiarCampo}
                    />
                  </div>

                  {/* SLOGAN */}

                  <div className="col-12 mb-3">
                    <label className="form-label">Slogan</label>

                    <input
                      type="text"
                      className="form-control"
                      name="slogan"
                      value={form.slogan}
                      onChange={cambiarCampo}
                      placeholder="Ej. Calidad y servicio"
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
                    />
                  </div>

                  {/* COLOR */}

                  <div className="col-md-4 mb-3">
                    <label className="form-label">Color principal</label>

                    <input
                      type="color"
                      className="form-control form-control-color"
                      name="color_principal"
                      value={form.color_principal || "#198754"}
                      onChange={cambiarCampo}
                    />
                  </div>

                  {/* TIPO */}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Tipo de empresa</label>

                    <select
                      className="form-select"
                      name="tipo"
                      value={form.tipo}
                      onChange={cambiarCampo}
                    >
                      <option value="ESTANDAR">Estándar</option>

                      <option value="FERRETERIA">Ferretería</option>
                    </select>
                  </div>

                  {/* OPCIONES */}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Configuración</label>

                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="propina_ley"
                        name="propina_ley"
                        checked={form.propina_ley}
                        onChange={cambiarCampo}
                      />

                      <label className="form-check-label" htmlFor="propina_ley">
                        Aplicar propina de ley
                      </label>
                    </div>

                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="itbis_ley"
                        name="itbis_ley"
                        checked={form.itbis_ley}
                        onChange={cambiarCampo}
                      />

                      <label className="form-check-label" htmlFor="itbis_ley">
                        Aplicar ITBIS
                      </label>
                    </div>
                  </div>

                  {/* ADMINISTRADOR SOLO CREAR */}

                  {!empresaEditando && (
                    <>
                      <hr className="my-3" />

                      <div className="col-12">
                        <h6>Administrador de la empresa</h6>
                      </div>

                      <div className="col-md-4 mb-3">
                        <label className="form-label">Nombre</label>

                        <input
                          type="text"
                          className="form-control"
                          name="admin_nombre"
                          value={form.admin_nombre}
                          onChange={cambiarCampo}
                        />
                      </div>

                      <div className="col-md-4 mb-3">
                        <label className="form-label">Usuario</label>

                        <input
                          type="text"
                          className="form-control"
                          name="admin_usuario"
                          value={form.admin_usuario}
                          onChange={cambiarCampo}
                        />
                      </div>

                      <div className="col-md-4 mb-3">
                        <label className="form-label">Contraseña</label>

                        <input
                          type="password"
                          className="form-control"
                          name="admin_password"
                          value={form.admin_password}
                          onChange={cambiarCampo}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

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

      {/* =====================================================
          MODAL MÓDULOS
      ===================================================== */}

      {mostrarModalModulos && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">Módulos de la empresa</h5>

                  <div className="text-muted small">
                    {empresaModulosActual?.nombre}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarModulos}
                  disabled={guardandoModulo}
                />
              </div>

              <div className="modal-body">
                {cargandoModulos ? (
                  <div className="text-center py-4">Cargando módulos...</div>
                ) : modulos.length === 0 ? (
                  <div className="alert alert-warning">
                    No hay módulos disponibles.
                  </div>
                ) : (
                  <div className="row g-3">
                    {modulos.map((modulo) => {
                      const activo = moduloAsignado(modulo);

                      return (
                        <div className="col-12" key={modulo.id}>
                          <div
                            className={`border rounded p-3 ${
                              activo ? "border-success bg-light" : ""
                            }`}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-bold">
                                  {modulo.icono ? `${modulo.icono} ` : ""}

                                  {modulo.nombre}
                                </div>

                                {modulo.descripcion && (
                                  <div className="small text-muted mt-1">
                                    {modulo.descripcion}
                                  </div>
                                )}
                              </div>

                              <div className="form-check form-switch">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  checked={activo}
                                  disabled={guardandoModulo}
                                  onChange={() => cambiarModulo(modulo)}
                                />
                              </div>
                            </div>

                            <div className="mt-2">
                              {activo ? (
                                <span className="badge bg-success">Activo</span>
                              ) : (
                                <span className="badge bg-secondary">
                                  Inactivo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <div className="me-auto text-muted small">
                  Los cambios se guardan automáticamente.
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cerrarModulos}
                  disabled={guardandoModulo}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL CONFIGURACIÓN MANTENIMIENTO
      ===================================================== */}

      {mostrarMantenimiento && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Mantenimiento</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMostrarMantenimiento(false)}
                />
              </div>

              <div className="modal-body">
                <div className="alert alert-info">
                  <strong>{empresaMantenimiento?.nombre}</strong>
                  <br />
                  El sistema calcula el próximo mantenimiento a 6 meses de la
                  fecha indicada.
                </div>

                <div className="mb-3">
                  <label className="form-label">Fecha de mantenimiento</label>

                  <input
                    type="date"
                    className="form-control"
                    value={mantenimientoData.fecha_mantenimiento}
                    onChange={(e) =>
                      setMantenimientoData((anterior) => ({
                        ...anterior,
                        fecha_mantenimiento: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Monto de mantenimiento</label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={mantenimientoData.monto_mantenimiento}
                    onChange={(e) =>
                      setMantenimientoData((anterior) => ({
                        ...anterior,
                        monto_mantenimiento: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMostrarMantenimiento(false)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={guardarMantenimiento}
                  disabled={guardandoMantenimiento}
                >
                  {guardandoMantenimiento
                    ? "Guardando..."
                    : "Guardar configuración"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL HISTORIAL
      ===================================================== */}

      {mostrarHistorial && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Historial de mantenimiento</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMostrarHistorial(false)}
                />
              </div>

              <div className="modal-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <strong>{empresaMantenimiento?.nombre}</strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    onClick={() =>
                      abrirRegistrarMantenimiento(empresaMantenimiento)
                    }
                  >
                    + Registrar mantenimiento
                  </button>
                </div>

                {cargandoHistorial ? (
                  <div className="text-center py-4">Cargando historial...</div>
                ) : historialMantenimiento.length === 0 ? (
                  <div className="alert alert-info">
                    No hay mantenimientos registrados.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Próximo</th>
                          <th>Monto</th>
                          <th>Estado</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {historialMantenimiento.map((item) => (
                          <tr key={item.id}>
                            <td>{formatearFecha(item.fecha_mantenimiento)}</td>

                            <td>
                              {formatearFecha(item.proximo_mantenimiento)}
                            </td>

                            <td>
                              RD$
                              {formatearMonto(item.monto)}
                            </td>

                            <td>{item.estado || "-"}</td>

                            <td>{item.observaciones || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMostrarHistorial(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL REGISTRAR MANTENIMIENTO
      ===================================================== */}

      {mostrarRegistrarMantenimiento && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Registrar mantenimiento</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMostrarRegistrarMantenimiento(false)}
                />
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Fecha</label>

                  <input
                    type="date"
                    className="form-control"
                    value={registroMantenimiento.fecha_mantenimiento}
                    onChange={(e) =>
                      setRegistroMantenimiento((anterior) => ({
                        ...anterior,
                        fecha_mantenimiento: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Monto</label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={registroMantenimiento.monto}
                    onChange={(e) =>
                      setRegistroMantenimiento((anterior) => ({
                        ...anterior,
                        monto: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Observaciones</label>

                  <textarea
                    className="form-control"
                    rows="3"
                    value={registroMantenimiento.observaciones}
                    onChange={(e) =>
                      setRegistroMantenimiento((anterior) => ({
                        ...anterior,
                        observaciones: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMostrarRegistrarMantenimiento(false)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={registrarMantenimiento}
                  disabled={guardandoRegistro}
                >
                  {guardandoRegistro ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL AVISO MANUAL
      ===================================================== */}

      {mostrarAviso && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Aviso de mantenimiento</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMostrarAviso(false)}
                />
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <strong>Empresa:</strong> {empresaAviso?.nombre}
                </div>

                <label className="form-label">Mensaje</label>

                <textarea
                  className="form-control"
                  rows="7"
                  value={mensajeAviso}
                  onChange={(e) => setMensajeAviso(e.target.value)}
                />

                <div className="form-text">
                  Puedes modificar el mensaje antes de enviarlo.
                </div>
              </div>

              <div className="modal-footer d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={copiarMensaje}
                >
                  📋 Copiar
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={abrirWhatsApp}
                >
                  WhatsApp
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={enviarAvisoInterno}
                  disabled={enviandoAviso}
                >
                  {enviandoAviso ? "Enviando..." : "Enviar al sistema"}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMostrarAviso(false)}
                >
                  Cerrar
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
