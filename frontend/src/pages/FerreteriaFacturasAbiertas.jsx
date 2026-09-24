import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import api from "../services/api";

function FerreteriaFacturasAbiertas() {
  const navigate = useNavigate();

  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Filtro por tipo de factura abierta
  const [filtroTipo, setFiltroTipo] = useState("TODAS");

  // ==========================================
  // FORMATO DINERO
  // ==========================================

  const formatearDinero = (valor) => {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ==========================================
  // FORMATO FECHA
  // ==========================================

  const formatearFecha = (valor) => {
    if (!valor) {
      return "—";
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return "—";
    }

    return fecha.toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // ==========================================
  // TIPO DE FACTURA
  // ==========================================

  const obtenerTipoFactura = (tipo) => {
    switch (tipo) {
      case "PENDIENTE_PAGO":
        return {
          texto: "Pendiente de pago",
          clase: "bg-warning text-dark",
          icono: "🟡",
        };

      case "PENDIENTE_ENTREGA":
        return {
          texto: "Pendiente de entrega",
          clase: "bg-info text-dark",
          icono: "🔵",
        };

      default:
        return {
          texto: "Abierta",
          clase: "bg-secondary",
          icono: "⚪",
        };
    }
  };

  const facturasFiltradas = facturas.filter((factura) => {
    if (filtroTipo === "TODAS") {
      return true;
    }

    return (factura.tipo || "ABIERTA") === filtroTipo;
  });

  // ==========================================
  // CARGAR FACTURAS
  // ==========================================

  const cargarFacturas = async () => {
    try {
      setCargando(true);

      const response = await api.get("/ferreteria-abiertas");

      console.log("RESPUESTA FACTURAS ABIERTAS:", response.data);

      if (!Array.isArray(response.data)) {
        console.error("La respuesta no es un arreglo:", response.data);

        setFacturas([]);
        return;
      }

      setFacturas(response.data);
    } catch (error) {
      console.error("ERROR CARGANDO FACTURAS ABIERTAS:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo cargar",
        text:
          error.response?.data?.mensaje ||
          "No se pudieron cargar las facturas abiertas.",
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarFacturas();
  }, []);

  // ==========================================
  // ABRIR FACTURA
  // ==========================================

  const abrirFactura = (id) => {
    console.log("ID RECIBIDO PARA ABRIR:", id);

    // Evita enviar undefined, null o vacío
    if (id === undefined || id === null || id === "") {
      Swal.fire({
        icon: "error",
        title: "ID inválido",
        text: "La factura seleccionada no tiene un ID válido.",
      });

      return;
    }

    navigate(`/ferreteria/facturas-abiertas/${id}`);
  };
  // ==========================================
  // IMPRIMIR FACTURA
  // ==========================================

  const imprimirFactura = (id) => {
    console.log("ID RECIBIDO PARA IMPRIMIR:", id);

    if (id === undefined || id === null || id === "") {
      Swal.fire({
        icon: "error",
        title: "ID inválido",
        text: "La factura seleccionada no tiene un ID válido.",
      });

      return;
    }

    navigate(`/ferreteria/facturas-abiertas/${id}/imprimir`);
  };
  // ==========================================
  // CANCELAR FACTURA
  // ==========================================

  const cancelarFactura = async (id) => {
    console.log("ID RECIBIDO PARA CANCELAR:", id);

    if (id === undefined || id === null || id === "") {
      Swal.fire({
        icon: "error",
        title: "ID inválido",
        text: "La factura seleccionada no tiene un ID válido.",
      });

      return;
    }

    const confirmar = await Swal.fire({
      icon: "warning",
      title: "Cancelar factura abierta",
      html: `
        <div>
          ¿Desea cancelar la factura
          <strong>#${id}</strong>?
        </div>
        <div class="text-muted mt-2">
          La factura será retirada del listado de pendientes.
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No",
      reverseButtons: true,
    });

    if (!confirmar.isConfirmed) {
      return;
    }

    try {
      await api.delete(`/ferreteria-abiertas/${id}`);

      await cargarFacturas();

      await Swal.fire({
        icon: "success",
        title: "Factura cancelada",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("ERROR CANCELANDO FACTURA:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo cancelar",
        text:
          error.response?.data?.mensaje || "No se pudo cancelar la factura.",
      });
    }
  };

  // ==========================================
  // NUEVA FACTURA
  // ==========================================

  const nuevaFactura = () => {
    navigate("/ferreteria/nueva-factura");
  };

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return (
      <div className="container-fluid px-4 py-5">
        <div className="text-center">
          <div className="spinner-border text-success" role="status" />

          <p className="text-muted mt-3 mb-0">Cargando facturas abiertas...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA
  // ==========================================

  return (
    <div className="container-fluid px-4 py-4">
      {/* ======================================
          ENCABEZADO
      ====================================== */}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Facturas Abiertas</h2>

          <p className="text-muted mb-0">Ventas pendientes de cobro</p>
        </div>

        <button
          type="button"
          className="btn btn-success"
          onClick={nuevaFactura}
        >
          + Nueva factura
        </button>
      </div>

      {/* ======================================
          FILTROS
      ====================================== */}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="fw-semibold me-2">Filtrar:</span>

            <button
              type="button"
              className={`btn btn-sm ${
                filtroTipo === "TODAS" ? "btn-dark" : "btn-outline-dark"
              }`}
              onClick={() => setFiltroTipo("TODAS")}
            >
              Todas
              <span className="ms-2 badge bg-light text-dark">
                {facturas.length}
              </span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${
                filtroTipo === "PENDIENTE_PAGO"
                  ? "btn-warning"
                  : "btn-outline-warning"
              }`}
              onClick={() => setFiltroTipo("PENDIENTE_PAGO")}
            >
              🟡 Pendiente de pago
              <span className="ms-2 badge bg-light text-dark">
                {
                  facturas.filter(
                    (factura) =>
                      (factura.tipo || "ABIERTA") === "PENDIENTE_PAGO",
                  ).length
                }
              </span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${
                filtroTipo === "PENDIENTE_ENTREGA"
                  ? "btn-info"
                  : "btn-outline-info"
              }`}
              onClick={() => setFiltroTipo("PENDIENTE_ENTREGA")}
            >
              🔵 Pendiente de entrega
              <span className="ms-2 badge bg-light text-dark">
                {
                  facturas.filter(
                    (factura) =>
                      (factura.tipo || "ABIERTA") === "PENDIENTE_ENTREGA",
                  ).length
                }
              </span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${
                filtroTipo === "ABIERTA"
                  ? "btn-secondary"
                  : "btn-outline-secondary"
              }`}
              onClick={() => setFiltroTipo("ABIERTA")}
            >
              ⚪ Abiertas
              <span className="ms-2 badge bg-light text-dark">
                {
                  facturas.filter(
                    (factura) => (factura.tipo || "ABIERTA") === "ABIERTA",
                  ).length
                }
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================
          TABLA
      ====================================== */}

      <div className="card shadow-sm">
        <div className="card-body p-0">
          {facturasFiltradas.length === 0 ? (
            <div className="text-center py-5">
              <div
                style={{
                  fontSize: "52px",
                }}
              >
                📂
              </div>

              <h5 className="mt-3">
                {facturas.length === 0
                  ? "No hay facturas abiertas"
                  : "No hay facturas de este tipo"}
              </h5>

              <p className="text-muted">
                {facturas.length === 0
                  ? "Las ventas pendientes aparecerán aquí."
                  : "Prueba seleccionando otro filtro."}
              </p>

              {facturas.length === 0 ? (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={nuevaFactura}
                >
                  Crear factura
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setFiltroTipo("TODAS")}
                >
                  Ver todas
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>

                    <th>Cliente / Referencia</th>

                    <th>Vendedor</th>

                    <th>Tipo</th>

                    <th>Actualización</th>

                    <th className="text-end">Subtotal</th>

                    <th className="text-end">ITBIS</th>

                    <th className="text-end">Total</th>

                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {facturasFiltradas.map((factura) => {
                    // =====================================
                    // OBTENER ID DIRECTAMENTE DEL OBJETO
                    // =====================================

                    const facturaId = factura.id;

                    return (
                      <tr key={facturaId}>
                        <td>
                          <strong>#{facturaId}</strong>
                        </td>

                        <td>
                          <div className="fw-semibold">
                            {factura.nombre_cliente || "Sin referencia"}
                          </div>

                          {factura.nota && (
                            <small className="text-muted">{factura.nota}</small>
                          )}
                        </td>

                        <td>
                          {factura.usuario_nombre ||
                            factura.usuario ||
                            "Usuario"}
                        </td>

                        <td>
                          {(() => {
                            const tipoFactura = obtenerTipoFactura(
                              factura.tipo || "ABIERTA",
                            );

                            return (
                              <span className={`badge ${tipoFactura.clase}`}>
                                {tipoFactura.icono} {tipoFactura.texto}
                              </span>
                            );
                          })()}
                        </td>

                        <td>
                          {formatearFecha(
                            factura.updated_at || factura.created_at,
                          )}
                        </td>

                        <td className="text-end">
                          RD$ {formatearDinero(factura.subtotal)}
                        </td>

                        <td className="text-end">
                          RD$ {formatearDinero(factura.itbis)}
                        </td>

                        <td className="text-end">
                          <strong>RD$ {formatearDinero(factura.total)}</strong>
                        </td>

                        <td>
                          <div className="d-flex justify-content-center gap-2">
                            {/* ==============================
      ABRIR
  ============================== */}

                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => abrirFactura(facturaId)}
                            >
                              Abrir
                            </button>

                            {/* ==============================
      IMPRIMIR
  ============================== */}

                            <button
                              type="button"
                              className="btn btn-outline-dark btn-sm"
                              onClick={() => imprimirFactura(facturaId)}
                              title="Imprimir factura"
                            >
                              🖨️
                            </button>

                            {/* ==============================
      CANCELAR
  ============================== */}

                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => cancelarFactura(facturaId)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FerreteriaFacturasAbiertas;
