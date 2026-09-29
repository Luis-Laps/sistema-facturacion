import { useEffect, useState } from "react";
import api from "../services/api";

function Empresas() {
  // ==========================================
  // ESTADOS PRINCIPALES
  // ==========================================

  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // ==========================================
  // EMPRESA EN EDICIÓN
  // ==========================================

  const [empresaEditando, setEmpresaEditando] = useState(null);

  // ==========================================
  // MANTENIMIENTO
  // ==========================================

  const [mostrarMantenimiento, setMostrarMantenimiento] = useState(false);
  const [empresaMantenimiento, setEmpresaMantenimiento] = useState(null);

  const [mantenimientoData, setMantenimientoData] = useState({
    fecha_mantenimiento: "",
    monto_mantenimiento: 2000,
  });

  const [guardandoMantenimiento, setGuardandoMantenimiento] = useState(false);

  // ==========================================
  // AVISO DE MANTENIMIENTO
  // ==========================================

  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [empresaAviso, setEmpresaAviso] = useState(null);
  const [mensajeAviso, setMensajeAviso] = useState("");
  const [enviandoAviso, setEnviandoAviso] = useState(false);

  // ==========================================
  // HISTORIAL DE MANTENIMIENTO
  // ==========================================

  const [historialMantenimiento, setHistorialMantenimiento] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // ==========================================
  // REGISTRAR MANTENIMIENTO
  // ==========================================

  const [mostrarRegistrarMantenimiento, setMostrarRegistrarMantenimiento] =
    useState(false);

  const [registroMantenimiento, setRegistroMantenimiento] = useState({
    fecha_mantenimiento: "",
    monto: 2000,
    observaciones: "",
  });

  const [guardandoRegistro, setGuardandoRegistro] = useState(false);

  // ==========================================
  // FORMULARIO EMPRESA
  // ==========================================

  const [form, setForm] = useState({
    nombre: "",
    slogan: "",
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

  // ==========================================
  // CARGAR EMPRESAS
  // ==========================================

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

  useEffect(() => {
    cargarEmpresas();
  }, []);

  // ==========================================
  // CAMBIAR CAMPOS DEL FORMULARIO
  // ==========================================

  const cambiarCampo = (e) => {
    const { name, type, checked, value } = e.target;

    setForm((anterior) => ({
      ...anterior,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ==========================================
  // NUEVA EMPRESA
  // ==========================================

  const abrirFormulario = () => {
    setEmpresaEditando(null);

    setForm({
      nombre: "",
      slogan: "",
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
  // EDITAR EMPRESA
  // ==========================================

  const abrirEditar = (empresa) => {
    setEmpresaEditando(empresa);

    setForm({
      nombre: empresa.nombre || "",
      slogan: empresa.slogan || "",
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
  };

  // ==========================================
  // CERRAR FORMULARIO
  // ==========================================

  const cerrarFormulario = () => {
    if (guardando) {
      return;
    }

    setMostrarFormulario(false);
    setEmpresaEditando(null);
  };

  // ==========================================
  // GUARDAR EMPRESA
  // ==========================================

  const guardarEmpresa = async () => {
    if (!form.nombre.trim()) {
      alert("Debe indicar el nombre de la empresa.");
      return;
    }

    // ==========================================
    // VALIDACIONES AL CREAR
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
          slogan: form.slogan,
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
      }

      // ==========================================
      // CREAR
      // ==========================================
      else {
        await api.post("/empresas", form);

        alert("Empresa creada correctamente.");
      }

      setMostrarFormulario(false);
      setEmpresaEditando(null);

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
        slogan: empresa.slogan || "",
        rnc: empresa.rnc,
        telefono: empresa.telefono,
        direccion: empresa.direccion,
        correo: empresa.correo,
        logo_url: empresa.logo_url,
        color_principal: empresa.color_principal,
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

  // ==========================================
  // CALCULAR ESTADO DEL MANTENIMIENTO
  // ==========================================

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

  // ==========================================
  // FORMATEAR FECHA
  // ==========================================

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "-";
    }

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

  // ==========================================
  // FORMATEAR DINERO
  // ==========================================

  const formatearMonto = (monto) => {
    return Number(monto || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ==========================================
  // ABRIR CONFIGURACIÓN DE MANTENIMIENTO
  // ==========================================

  const abrirMantenimiento = async (empresa) => {
    try {
      setEmpresaMantenimiento(empresa);

      setMantenimientoData({
        fecha_mantenimiento: empresa.fecha_mantenimiento
          ? String(empresa.fecha_mantenimiento).substring(0, 10)
          : "",
        monto_mantenimiento: empresa.monto_mantenimiento ?? 2000,
      });

      try {
        const response = await api.get(`/mantenimientos/empresa/${empresa.id}`);

        if (response.data) {
          setMantenimientoData({
            fecha_mantenimiento: response.data.fecha_mantenimiento
              ? String(response.data.fecha_mantenimiento).substring(0, 10)
              : empresa.fecha_mantenimiento
                ? String(empresa.fecha_mantenimiento).substring(0, 10)
                : "",
            monto_mantenimiento:
              response.data.monto_mantenimiento ??
              empresa.monto_mantenimiento ??
              2000,
          });
        }
      } catch (error) {
        console.log("No existe configuración de mantenimiento previa.");
      }

      setMostrarMantenimiento(true);
    } catch (error) {
      console.error("Error al abrir mantenimiento:", error);
    }
  };

  // ==========================================
  // CERRAR MANTENIMIENTO
  // ==========================================

  const cerrarMantenimiento = () => {
    if (guardandoMantenimiento) {
      return;
    }

    setMostrarMantenimiento(false);
    setEmpresaMantenimiento(null);

    setMantenimientoData({
      fecha_mantenimiento: "",
      monto_mantenimiento: 2000,
    });
  };

  // ==========================================
  // CAMBIAR MANTENIMIENTO
  // ==========================================

  const cambiarMantenimiento = (e) => {
    const { name, value } = e.target;

    setMantenimientoData((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  // ==========================================
  // GUARDAR CONFIGURACIÓN DE MANTENIMIENTO
  // ==========================================

  const guardarConfiguracionMantenimiento = async () => {
    if (!empresaMantenimiento) {
      return;
    }

    if (!mantenimientoData.fecha_mantenimiento) {
      alert("Debe indicar la fecha del mantenimiento.");
      return;
    }

    const monto = Number(mantenimientoData.monto_mantenimiento);

    if (Number.isNaN(monto) || monto < 0) {
      alert("El monto del mantenimiento no es válido.");
      return;
    }

    try {
      setGuardandoMantenimiento(true);

      await api.put(`/mantenimientos/empresa/${empresaMantenimiento.id}`, {
        fecha_mantenimiento: mantenimientoData.fecha_mantenimiento,
        monto_mantenimiento: monto,
      });

      alert("Configuración de mantenimiento guardada correctamente.");

      cerrarMantenimiento();

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
  }; // ==========================================
  // CARGAR HISTORIAL DE MANTENIMIENTO
  // ==========================================

  const cargarHistorialMantenimiento = async (empresaId) => {
    if (!empresaId) {
      return;
    }

    try {
      setCargandoHistorial(true);

      const response = await api.get(
        `/mantenimientos/empresa/${empresaId}/historial`,
      );

      setHistorialMantenimiento(response.data || []);
    } catch (error) {
      console.error("Error al cargar historial de mantenimiento:", error);

      setHistorialMantenimiento([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // ==========================================
  // ABRIR REGISTRO / HISTORIAL
  // ==========================================

  const abrirRegistrarMantenimiento = async (empresa) => {
    if (!empresa) {
      return;
    }

    setEmpresaMantenimiento(empresa);

    setRegistroMantenimiento({
      fecha_mantenimiento: new Date().toISOString().substring(0, 10),
      monto: empresa.monto_mantenimiento || 2000,
      observaciones: "",
    });

    setHistorialMantenimiento([]);

    await cargarHistorialMantenimiento(empresa.id);

    setMostrarRegistrarMantenimiento(true);
  };

  // ==========================================
  // CERRAR REGISTRO / HISTORIAL
  // ==========================================

  const cerrarRegistrarMantenimiento = () => {
    if (guardandoRegistro) {
      return;
    }

    setMostrarRegistrarMantenimiento(false);
    setEmpresaMantenimiento(null);
    setHistorialMantenimiento([]);

    setRegistroMantenimiento({
      fecha_mantenimiento: "",
      monto: 2000,
      observaciones: "",
    });
  };

  // ==========================================
  // CAMBIAR REGISTRO DE MANTENIMIENTO
  // ==========================================

  const cambiarRegistroMantenimiento = (e) => {
    const { name, value } = e.target;

    setRegistroMantenimiento((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  // ==========================================
  // REGISTRAR MANTENIMIENTO
  // ==========================================

  const registrarMantenimiento = async () => {
    if (!empresaMantenimiento) {
      return;
    }

    if (!registroMantenimiento.fecha_mantenimiento) {
      alert("Debe indicar la fecha del mantenimiento.");
      return;
    }

    const monto = Number(registroMantenimiento.monto);

    if (Number.isNaN(monto) || monto < 0) {
      alert("El monto del mantenimiento no es válido.");
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

      await cargarHistorialMantenimiento(empresaMantenimiento.id);

      await cargarEmpresas();

      setRegistroMantenimiento({
        fecha_mantenimiento: "",
        monto: empresaMantenimiento.monto_mantenimiento || 2000,
        observaciones: "",
      });
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

  // ==========================================
  // ABRIR AVISO MANUAL
  // ==========================================

  const abrirAvisoMantenimiento = (empresa) => {
    if (!empresa) {
      return;
    }

    const estado = obtenerEstadoMantenimiento(empresa);

    const fechaProximo = estado.fechaProximo
      ? formatearFecha(estado.fechaProximo)
      : "No configurado";

    const monto = formatearMonto(empresa.monto_mantenimiento || 0);

    let detalle = "";

    if (estado.estado === "VENCIDO") {
      detalle =
        `El mantenimiento se encuentra vencido hace ` +
        `${Math.abs(estado.dias)} día(s).`;
    } else if (estado.estado === "HOY") {
      detalle = "El mantenimiento corresponde realizarlo hoy.";
    } else if (estado.estado === "PROXIMO") {
      detalle = `Faltan ${estado.dias} día(s) para el mantenimiento.`;
    } else if (estado.estado === "NORMAL") {
      detalle = "El mantenimiento se encuentra programado.";
    } else {
      detalle = "El mantenimiento aún no ha sido configurado.";
    }

    const mensaje = `Hola, ${empresa.nombre || ""}.

Le recordamos que el mantenimiento de su sistema está programado.

📅 Próximo mantenimiento: ${fechaProximo}

💰 Monto: RD$${monto}

${detalle}

Quedamos atentos para coordinar el mantenimiento.

Saludos.`;

    setEmpresaAviso(empresa);
    setMensajeAviso(mensaje);
    setMostrarAviso(true);
  };

  // ==========================================
  // CERRAR AVISO
  // ==========================================

  const cerrarAvisoMantenimiento = () => {
    if (enviandoAviso) {
      return;
    }

    setMostrarAviso(false);
    setEmpresaAviso(null);
    setMensajeAviso("");
  };

  // ==========================================
  // COPIAR MENSAJE
  // ==========================================

  const copiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(mensajeAviso);

      alert("Mensaje copiado correctamente.");
    } catch (error) {
      console.error("Error al copiar mensaje:", error);

      alert("No fue posible copiar automáticamente el mensaje.");
    }
  };

  // ==========================================
  // ENVIAR NOTIFICACIÓN INTERNA
  // ==========================================

  const enviarAvisoMantenimiento = async () => {
    if (!empresaAviso) {
      alert("No se ha seleccionado ninguna empresa.");
      return;
    }

    if (!mensajeAviso.trim()) {
      alert("Debe escribir un mensaje.");
      return;
    }

    try {
      setEnviandoAviso(true);

      await api.post("/notificaciones/enviar", {
        empresa_id: empresaAviso.id,
        titulo: "Mantenimiento",
        mensaje: mensajeAviso.trim(),
      });

      alert(
        `Mensaje enviado correctamente a los administradores de ${empresaAviso.nombre}.`,
      );

      cerrarAvisoMantenimiento();
    } catch (error) {
      console.error("Error al enviar aviso:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible enviar el mensaje.",
      );
    } finally {
      setEnviandoAviso(false);
    }
  };

  // ==========================================
  // ABRIR WHATSAPP
  // ==========================================

  const abrirWhatsAppMantenimiento = () => {
    if (!empresaAviso) {
      return;
    }

    if (!empresaAviso.telefono) {
      alert("Esta empresa no tiene un número de teléfono registrado.");

      return;
    }

    const telefono = String(empresaAviso.telefono).replace(/\D/g, "");

    if (!telefono) {
      alert("El teléfono registrado de esta empresa no es válido.");

      return;
    }

    // República Dominicana
    // Si tiene 10 dígitos agregamos +1
    const telefonoWhatsApp = telefono.length === 10 ? `1${telefono}` : telefono;

    const url =
      `https://wa.me/${telefonoWhatsApp}?text=` +
      encodeURIComponent(mensajeAviso);

    window.open(url, "_blank");
  };

  // ==========================================
  // CAMBIAR MENSAJE
  // ==========================================

  const cambiarMensajeAviso = (e) => {
    setMensajeAviso(e.target.value);
  };

  // ==========================================
  // RENDER
  // ==========================================

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
          <div className="text-center py-5">Cargando empresas...</div>
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
                      <th>Mantenimiento</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {empresas.length > 0 ? (
                      empresas.map((empresa) => {
                        const mantenimiento =
                          obtenerEstadoMantenimiento(empresa);

                        return (
                          <tr key={empresa.id}>
                            {/* ID */}
                            <td>{empresa.id}</td>

                            {/* EMPRESA */}
                            <td>
                              <strong>{empresa.nombre}</strong>

                              {empresa.slogan && (
                                <div className="small text-muted">
                                  {empresa.slogan}
                                </div>
                              )}

                              {empresa.created_at && (
                                <div className="small text-muted">
                                  Creada: {formatearFecha(empresa.created_at)}
                                </div>
                              )}
                            </td>

                            {/* RNC */}
                            <td>{empresa.rnc || "-"}</td>

                            {/* TELÉFONO */}
                            <td>{empresa.telefono || "-"}</td>

                            {/* CORREO */}
                            <td>{empresa.correo || "-"}</td>

                            {/* MANTENIMIENTO */}
                            <td>
                              {mantenimiento.estado === "SIN_CONFIGURAR" ? (
                                <span className="badge bg-secondary">
                                  Sin configurar
                                </span>
                              ) : (
                                <>
                                  {mantenimiento.estado === "VENCIDO" && (
                                    <span className="badge bg-danger">
                                      🔴 Vencido
                                    </span>
                                  )}

                                  {mantenimiento.estado === "HOY" && (
                                    <span className="badge bg-danger">
                                      🔴 Hoy
                                    </span>
                                  )}

                                  {mantenimiento.estado === "PROXIMO" && (
                                    <span className="badge bg-warning text-dark">
                                      🟡 Próximo
                                    </span>
                                  )}

                                  {mantenimiento.estado === "NORMAL" && (
                                    <span className="badge bg-success">
                                      🟢 Al día
                                    </span>
                                  )}

                                  <div className="small mt-1">
                                    {mantenimiento.fechaProximo
                                      ? formatearFecha(
                                          mantenimiento.fechaProximo,
                                        )
                                      : "-"}
                                  </div>

                                  {empresa.monto_mantenimiento !== undefined &&
                                    empresa.monto_mantenimiento !== null && (
                                      <div className="small text-muted">
                                        RD$
                                        {formatearMonto(
                                          empresa.monto_mantenimiento,
                                        )}
                                      </div>
                                    )}
                                </>
                              )}
                            </td>

                            {/* ESTADO EMPRESA */}
                            <td>
                              {empresa.activo ? (
                                <span className="badge bg-success">Activa</span>
                              ) : (
                                <span className="badge bg-danger">
                                  Inactiva
                                </span>
                              )}
                            </td>

                            {/* ACCIONES */}
                            <td>
                              <div className="d-flex gap-2 flex-wrap">
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => abrirEditar(empresa)}
                                  disabled={guardando}
                                >
                                  ✏️ Editar
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-warning btn-sm"
                                  onClick={() => abrirMantenimiento(empresa)}
                                  disabled={guardando}
                                >
                                  🔧 Mantenimiento
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-info btn-sm"
                                  onClick={() =>
                                    abrirRegistrarMantenimiento(empresa)
                                  }
                                  disabled={guardando}
                                >
                                  📋 Historial
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-success btn-sm"
                                  onClick={() =>
                                    abrirAvisoMantenimiento(empresa)
                                  }
                                  disabled={guardando}
                                >
                                  📱 Avisar
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
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
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
            MODAL NUEVA / EDITAR EMPRESA
        ========================================== */}

        {mostrarFormulario && (
          <div
            className="modal d-block"
            tabIndex="-1"
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 1050,
            }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {empresaEditando ? "Editar empresa" : "Nueva empresa"}
                  </h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={cerrarFormulario}
                    disabled={guardando}
                  />
                </div>

                <div className="modal-body">
                  {/* INFORMACIÓN DE LA EMPRESA */}

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
                        disabled={guardando}
                      />
                    </div>

                    {/* SLOGAN */}

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Slogan</label>

                      <input
                        type="text"
                        className="form-control"
                        name="slogan"
                        value={form.slogan}
                        onChange={cambiarCampo}
                        placeholder="Ej. Calidad y confianza"
                        disabled={guardando}
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
                        disabled={guardando}
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
                        placeholder="809-000-0000"
                        disabled={guardando}
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
                        disabled={guardando}
                      />
                    </div>

                    {/* DIRECCIÓN */}

                    <div className="col-md-12 mb-3">
                      <label className="form-label">Dirección</label>

                      <textarea
                        className="form-control"
                        name="direccion"
                        rows="2"
                        value={form.direccion}
                        onChange={cambiarCampo}
                        placeholder="Dirección de la empresa"
                        disabled={guardando}
                      />
                    </div>

                    {/* LOGO */}

                    <div className="col-md-8 mb-3">
                      <label className="form-label">Logo URL</label>

                      <input
                        type="text"
                        className="form-control"
                        name="logo_url"
                        value={form.logo_url}
                        onChange={cambiarCampo}
                        placeholder="https://..."
                        disabled={guardando}
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
                        disabled={guardando}
                      />
                    </div>

                    {/* TIPO */}

                    <div className="col-md-12 mb-3">
                      <label className="form-label">Tipo de empresa *</label>

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
                        Define los módulos y el menú que tendrá esta empresa.
                      </div>
                    </div>
                  </div>

                  <hr />

                  {/* CARACTERÍSTICAS */}

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
                          disabled={guardando}
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
                        10%.
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
                          disabled={guardando}
                        />

                        <label
                          className="form-check-label fw-semibold"
                          htmlFor="itbis_ley"
                        >
                          Habilitar ITBIS (18%)
                        </label>
                      </div>

                      <div className="form-text">
                        Permite que esta empresa pueda aplicar ITBIS del 18%.
                      </div>
                    </div>
                  </div>

                  {/* ADMINISTRADOR */}

                  {!empresaEditando && (
                    <>
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
                            disabled={guardando}
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
                            disabled={guardando}
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
                            disabled={guardando}
                          />
                        </div>
                      </div>
                    </>
                  )}
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
                    className={
                      empresaEditando ? "btn btn-primary" : "btn btn-success"
                    }
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

        {/* ==========================================
            MODAL CONFIGURACIÓN DE MANTENIMIENTO
        ========================================== */}

        {mostrarMantenimiento && empresaMantenimiento && (
          <div
            className="modal d-block"
            tabIndex="-1"
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              zIndex: 1100,
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">🔧 Mantenimiento</h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={cerrarMantenimiento}
                    disabled={guardandoMantenimiento}
                  />
                </div>

                <div className="modal-body">
                  <div className="alert alert-light border">
                    <strong>{empresaMantenimiento.nombre}</strong>

                    <div className="small text-muted mt-1">
                      ID: {empresaMantenimiento.id}
                    </div>

                    {empresaMantenimiento.created_at && (
                      <div className="small text-muted">
                        Creada:{" "}
                        {formatearFecha(empresaMantenimiento.created_at)}
                      </div>
                    )}
                  </div>

                  {/* FECHA */}

                  <div className="mb-3">
                    <label className="form-label">
                      Fecha del último mantenimiento
                    </label>

                    <input
                      type="date"
                      className="form-control"
                      name="fecha_mantenimiento"
                      value={mantenimientoData.fecha_mantenimiento}
                      onChange={cambiarMantenimiento}
                      disabled={guardandoMantenimiento}
                    />

                    <div className="form-text">
                      El sistema calculará el próximo mantenimiento 6 meses
                      después de esta fecha.
                    </div>
                  </div>

                  {/* MONTO */}

                  <div className="mb-3">
                    <label className="form-label">
                      Monto del mantenimiento
                    </label>

                    <div className="input-group">
                      <span className="input-group-text">RD$</span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        name="monto_mantenimiento"
                        value={mantenimientoData.monto_mantenimiento}
                        onChange={cambiarMantenimiento}
                        disabled={guardandoMantenimiento}
                      />
                    </div>
                  </div>

                  {/* PRÓXIMO */}

                  {empresaMantenimiento.fecha_mantenimiento && (
                    <div className="alert alert-info">
                      <strong>Próximo mantenimiento:</strong>

                      <br />

                      {formatearFecha(
                        obtenerEstadoMantenimiento(empresaMantenimiento)
                          .fechaProximo,
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cerrarMantenimiento}
                    disabled={guardandoMantenimiento}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={guardarConfiguracionMantenimiento}
                    disabled={guardandoMantenimiento}
                  >
                    {guardandoMantenimiento
                      ? "Guardando..."
                      : "💾 Guardar mantenimiento"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL HISTORIAL / REGISTRAR MANTENIMIENTO
        ========================================== */}

        {mostrarRegistrarMantenimiento && empresaMantenimiento && (
          <div
            className="modal d-block"
            tabIndex="-1"
            style={{
              backgroundColor: "rgba(0,0,0,0.65)",
              zIndex: 1150,
            }}
          >
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title">
                      📋 Historial de mantenimiento
                    </h5>

                    <div className="small text-muted">
                      {empresaMantenimiento.nombre}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={cerrarRegistrarMantenimiento}
                    disabled={guardandoRegistro}
                  />
                </div>

                <div className="modal-body">
                  {/* REGISTRAR NUEVO */}

                  <div className="card mb-4">
                    <div className="card-header">
                      <strong>Registrar mantenimiento</strong>
                    </div>

                    <div className="card-body">
                      <div className="row">
                        {/* FECHA */}

                        <div className="col-md-4 mb-3">
                          <label className="form-label">
                            Fecha del mantenimiento
                          </label>

                          <input
                            type="date"
                            className="form-control"
                            name="fecha_mantenimiento"
                            value={registroMantenimiento.fecha_mantenimiento}
                            onChange={cambiarRegistroMantenimiento}
                            disabled={guardandoRegistro}
                          />
                        </div>

                        {/* MONTO */}

                        <div className="col-md-4 mb-3">
                          <label className="form-label">Monto</label>

                          <div className="input-group">
                            <span className="input-group-text">RD$</span>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-control"
                              name="monto"
                              value={registroMantenimiento.monto}
                              onChange={cambiarRegistroMantenimiento}
                              disabled={guardandoRegistro}
                            />
                          </div>
                        </div>

                        {/* OBSERVACIONES */}

                        <div className="col-md-4 mb-3">
                          <label className="form-label">Observaciones</label>

                          <input
                            type="text"
                            className="form-control"
                            name="observaciones"
                            value={registroMantenimiento.observaciones}
                            onChange={cambiarRegistroMantenimiento}
                            placeholder="Ej. Mantenimiento realizado"
                            disabled={guardandoRegistro}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={registrarMantenimiento}
                        disabled={guardandoRegistro}
                      >
                        {guardandoRegistro
                          ? "Registrando..."
                          : "💾 Registrar mantenimiento"}
                      </button>
                    </div>
                  </div>
                  {/* ==========================================
                        HISTORIAL
                    ========================================== */}

                  <div className="card">
                    <div className="card-header">
                      <strong>Historial</strong>
                    </div>

                    <div className="card-body">
                      {cargandoHistorial ? (
                        <div className="text-center py-3">
                          Cargando historial...
                        </div>
                      ) : historialMantenimiento.length === 0 ? (
                        <div className="alert alert-light border mb-0">
                          No hay mantenimientos registrados para esta empresa.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-striped table-hover align-middle mb-0">
                            <thead>
                              <tr>
                                <th>Fecha</th>
                                <th>Próximo</th>
                                <th>Monto</th>
                                <th>Estado</th>
                                <th>Observaciones</th>
                                <th>Registrado</th>
                              </tr>
                            </thead>

                            <tbody>
                              {historialMantenimiento.map((registro, index) => (
                                <tr key={registro.id || index}>
                                  <td>
                                    {formatearFecha(
                                      registro.fecha_mantenimiento,
                                    )}
                                  </td>

                                  <td>
                                    {formatearFecha(
                                      registro.proximo_mantenimiento,
                                    )}
                                  </td>

                                  <td>
                                    RD$
                                    {formatearMonto(registro.monto)}
                                  </td>

                                  <td>
                                    {registro.estado === "VENCIDO" ? (
                                      <span className="badge bg-danger">
                                        Vencido
                                      </span>
                                    ) : registro.estado === "PROXIMO" ? (
                                      <span className="badge bg-warning text-dark">
                                        Próximo
                                      </span>
                                    ) : (
                                      <span className="badge bg-success">
                                        Completado
                                      </span>
                                    )}
                                  </td>

                                  <td>{registro.observaciones || "-"}</td>

                                  <td>{formatearFecha(registro.created_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cerrarRegistrarMantenimiento}
                    disabled={guardandoRegistro}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            POPUP AVISO MANUAL
        ========================================== */}

        {mostrarAviso && empresaAviso && (
          <div
            className="modal d-block"
            tabIndex="-1"
            style={{
              backgroundColor: "rgba(0,0,0,0.65)",
              zIndex: 1200,
            }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                {/* HEADER */}

                <div className="modal-header">
                  <div>
                    <h5 className="modal-title">📱 Avisar mantenimiento</h5>

                    <div className="small text-muted">Aviso manual</div>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={cerrarAvisoMantenimiento}
                    disabled={enviandoAviso}
                  />
                </div>

                {/* BODY */}

                <div className="modal-body">
                  {/* INFORMACIÓN EMPRESA */}

                  <div className="alert alert-primary">
                    <div className="fw-bold fs-5">{empresaAviso.nombre}</div>

                    <div className="mt-2">
                      <strong>Teléfono:</strong>{" "}
                      {empresaAviso.telefono || "No registrado"}
                    </div>

                    {empresaAviso.correo && (
                      <div>
                        <strong>Correo:</strong> {empresaAviso.correo}
                      </div>
                    )}
                  </div>

                  {/* INFORMACIÓN DEL MANTENIMIENTO */}

                  <div className="row mb-3">
                    {/* PRÓXIMO */}

                    <div className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <div className="text-muted small">
                            PRÓXIMO MANTENIMIENTO
                          </div>

                          <div className="fw-bold fs-5">
                            {empresaAviso.fecha_mantenimiento
                              ? formatearFecha(
                                  obtenerEstadoMantenimiento(empresaAviso)
                                    .fechaProximo,
                                )
                              : "No configurado"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MONTO */}

                    <div className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <div className="text-muted small">MONTO</div>

                          <div className="fw-bold fs-5">
                            RD$
                            {formatearMonto(empresaAviso.monto_mantenimiento)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ESTADO */}

                  <div className="mb-3">
                    <label className="form-label fw-bold">Estado actual</label>

                    {(() => {
                      const estado = obtenerEstadoMantenimiento(empresaAviso);

                      if (estado.estado === "VENCIDO") {
                        return (
                          <div className="alert alert-danger mb-0">
                            🔴 El mantenimiento está vencido hace{" "}
                            {Math.abs(estado.dias)} día(s).
                          </div>
                        );
                      }

                      if (estado.estado === "HOY") {
                        return (
                          <div className="alert alert-danger mb-0">
                            🔴 El mantenimiento corresponde realizarlo hoy.
                          </div>
                        );
                      }

                      if (estado.estado === "PROXIMO") {
                        return (
                          <div className="alert alert-warning mb-0">
                            🟡 Faltan {estado.dias} día(s) para el
                            mantenimiento.
                          </div>
                        );
                      }

                      if (estado.estado === "SIN_CONFIGURAR") {
                        return (
                          <div className="alert alert-secondary mb-0">
                            ⚪ El mantenimiento todavía no está configurado.
                          </div>
                        );
                      }

                      return (
                        <div className="alert alert-success mb-0">
                          🟢 El mantenimiento está programado.
                        </div>
                      );
                    })()}
                  </div>

                  {/* MENSAJE */}

                  <div className="mb-3">
                    <label className="form-label fw-bold">Mensaje</label>

                    <textarea
                      className="form-control"
                      rows="10"
                      value={mensajeAviso}
                      onChange={cambiarMensajeAviso}
                      disabled={enviandoAviso}
                    />

                    <div className="form-text">
                      Puedes modificar el mensaje antes de enviarlo.
                    </div>
                  </div>
                </div>

                {/* FOOTER */}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cerrarAvisoMantenimiento}
                    disabled={enviandoAviso}
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={copiarMensaje}
                    disabled={enviandoAviso}
                  >
                    📋 Copiar mensaje
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={enviarAvisoMantenimiento}
                    disabled={enviandoAviso || !mensajeAviso.trim()}
                  >
                    {enviandoAviso ? "Enviando..." : "📩 Enviar mensaje"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={abrirWhatsAppMantenimiento}
                    disabled={enviandoAviso || !empresaAviso.telefono}
                  >
                    💬 Abrir WhatsApp
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
