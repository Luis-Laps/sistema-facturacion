import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import jsPDF from "jspdf";

function ReportesCaja() {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);

  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [descargandoPDF, setDescargandoPDF] = useState(null);

  // ==========================================
  // DINERO
  // ==========================================

  const dinero = (valor) =>
    Number(valor || 0).toLocaleString("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ==========================================
  // FECHA SIN DESPLAZAR ZONA HORARIA
  // ==========================================

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "-";
    }

    const texto = String(fecha);

    const match = texto.match(
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/,
    );

    if (!match) {
      return texto;
    }

    const [, year, month, day, hora, minutos, segundos] = match;

    const horaNumero = Number(hora);

    const periodo = horaNumero >= 12 ? "p. m." : "a. m.";

    let hora12 = horaNumero % 12;

    if (hora12 === 0) {
      hora12 = 12;
    }

    const horaFormateada = `${String(hora12).padStart(2, "0")}:${minutos}`;

    return `${day}/${month}/${year} ${horaFormateada} ${periodo}`;
  };

  // ==========================================
  // REPORTES
  // ==========================================

  useEffect(() => {
    obtenerReportes();
  }, []);

  const obtenerReportes = async () => {
    try {
      setCargando(true);

      const response = await api.get("/cajas/reportes");

      setReportes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error al obtener reportes:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible obtener los reportes.",
      );
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // VER REPORTE
  // ==========================================

  const verReporte = async (id) => {
    try {
      setCargandoDetalle(true);

      const response = await api.get(`/cajas/reportes/${id}`);

      setReporteSeleccionado(response.data);
    } catch (error) {
      console.error("Error al obtener reporte:", error);

      alert(
        error.response?.data?.mensaje || "No fue posible obtener el reporte.",
      );
    } finally {
      setCargandoDetalle(false);
    }
  };

  // ==========================================
  // RESUMEN
  // ==========================================

  const resumen = useMemo(() => {
    return reportes.reduce(
      (acc, item) => {
        acc.ventas += Number(item.total_ventas || 0);

        acc.ganancias += Number(item.ganancia || 0);

        acc.facturas += Number(item.cantidad_facturas || 0);

        acc.productos += Number(item.cantidad_productos || 0);

        acc.propinas += Number(item.cantidad_propinas_aplicadas || 0);

        acc.totalPropinas += Number(item.total_propinas || 0);

        return acc;
      },
      {
        ventas: 0,
        ganancias: 0,
        facturas: 0,
        productos: 0,
        propinas: 0,
        totalPropinas: 0,
      },
    );
  }, [reportes]);

  // ==========================================
  // DESCARGAR PDF
  // ==========================================

  const descargarPDF = async (cajaId) => {
    try {
      setDescargandoPDF(cajaId);

      const response = await api.get(`/cajas/reportes/${cajaId}/ventas`);

      const { caja, ventas } = response.data;

      // ========================================
      // DOCUMENTO
      // ========================================

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const margen = 15;

      const anchoPagina = 210;

      const anchoUtil = anchoPagina - margen * 2;

      let y = 18;

      // ========================================
      // ENCABEZADO
      // ========================================

      doc.setFont("helvetica", "bold");

      doc.setFontSize(18);

      doc.text("REPORTE DE CAJA", anchoPagina / 2, y, {
        align: "center",
      });

      y += 9;

      doc.setFontSize(12);

      doc.text(`Caja #${caja.id}`, anchoPagina / 2, y, {
        align: "center",
      });

      y += 10;

      doc.setDrawColor(180, 180, 180);

      doc.line(margen, y, anchoPagina - margen, y);

      y += 8;

      // ========================================
      // INFORMACIÓN
      // ========================================

      doc.setFont("helvetica", "normal");

      doc.setFontSize(10);

      doc.text(`Empresa: ${caja.empresa || "Empresa"}`, margen, y);

      y += 6;

      doc.text(`Cajero: ${caja.usuario_nombre || "N/A"}`, margen, y);

      y += 6;

      doc.text(`Apertura: ${formatearFecha(caja.fecha_apertura)}`, margen, y);

      y += 6;

      doc.text(`Cierre: ${formatearFecha(caja.fecha_cierre)}`, margen, y);

      y += 10;

      // ========================================
      // VENTAS
      // ========================================

      doc.setFont("helvetica", "bold");

      doc.setFontSize(13);

      doc.text("VENTAS", margen, y);

      y += 7;

      doc.setDrawColor(180, 180, 180);

      doc.line(margen, y, anchoPagina - margen, y);

      y += 7;

      // ========================================
      // AGRUPAR FACTURAS
      // ========================================

      const ventasAgrupadas = {};

      ventas.forEach((item) => {
        if (!ventasAgrupadas[item.factura_id]) {
          ventasAgrupadas[item.factura_id] = {
            id: item.factura_id,
            fecha: item.fecha,
            total: Number(item.total || 0),
            forma_pago: item.forma_pago,
            propina_aplicada: item.propina_aplicada,
            propina: Number(item.propina || 0),
            productos: [],
          };
        }

        ventasAgrupadas[item.factura_id].productos.push({
          nombre: item.producto || "Producto",
          cantidad: Number(item.cantidad || 0),
        });
      });

      const listaVentas = Object.values(ventasAgrupadas);

      // ========================================
      // MOSTRAR VENTAS
      // ========================================

      doc.setFont("helvetica", "normal");

      doc.setFontSize(10);

      listaVentas.forEach((venta) => {
        const descripcion = venta.productos
          .map((producto) => `${producto.nombre} x${producto.cantidad}`)
          .join(" + ");

        const linea = `#${venta.id}  ${descripcion}`;

        const lineasTexto = doc.splitTextToSize(linea, anchoUtil - 45);

        if (y + lineasTexto.length * 5 + 15 > 280) {
          doc.addPage();

          y = 18;
        }

        doc.text(lineasTexto, margen, y);

        doc.text(dinero(venta.total), anchoPagina - margen, y, {
          align: "right",
        });

        y += lineasTexto.length * 5;

        doc.setFontSize(8);

        doc.setTextColor(100, 100, 100);

        let informacionVenta = `${venta.forma_pago || "N/A"} · ${formatearFecha(
          venta.fecha,
        )}`;

        if (venta.propina_aplicada === true && venta.propina > 0) {
          informacionVenta += ` · Propina ${dinero(venta.propina)}`;
        }

        doc.text(informacionVenta, margen, y);

        doc.setFontSize(10);

        doc.setTextColor(0, 0, 0);

        y += 7;
      });

      // ========================================
      // RESUMEN
      // ========================================

      if (y + 100 > 280) {
        doc.addPage();

        y = 18;
      }

      y += 2;

      doc.setDrawColor(180, 180, 180);

      doc.line(margen, y, anchoPagina - margen, y);

      y += 9;

      doc.setFont("helvetica", "bold");

      doc.setFontSize(12);

      doc.text("RESUMEN", margen, y);

      y += 8;

      doc.setFont("helvetica", "normal");

      doc.setFontSize(10);

      // Total ventas

      doc.text(`Total ventas: ${dinero(caja.total_ventas)}`, margen, y);

      y += 6;

      // Efectivo

      doc.text(`Efectivo: ${dinero(caja.efectivo)}`, margen, y);

      y += 6;

      // Tarjeta

      doc.text(`Tarjeta: ${dinero(caja.tarjeta)}`, margen, y);

      y += 6;

      // Transferencia

      doc.text(`Transferencia: ${dinero(caja.transferencia)}`, margen, y);

      y += 8;

      // Facturas

      doc.text(
        `Facturas: ${caja.cantidad_facturas || listaVentas.length}`,
        margen,
        y,
      );

      y += 6;

      // Propinas cantidad

      doc.text(
        `Propinas aplicadas: ${caja.cantidad_propinas_aplicadas || 0}`,
        margen,
        y,
      );

      y += 6;

      // Propinas monto

      doc.text(`Total propinas: ${dinero(caja.total_propinas)}`, margen, y);

      y += 6;

      // Productos

      doc.text(
        `Productos vendidos: ${
          caja.cantidad_productos ||
          ventas.reduce((total, item) => total + Number(item.cantidad || 0), 0)
        }`,
        margen,
        y,
      );

      y += 6;

      // Ganancia

      doc.text(`Ganancia: ${dinero(caja.ganancia)}`, margen, y);

      // ========================================
      // PIE
      // ========================================

      y += 14;

      doc.setDrawColor(180, 180, 180);

      doc.line(margen, y, anchoPagina - margen, y);

      y += 7;

      doc.setFontSize(8);

      doc.setTextColor(100, 100, 100);

      doc.text("Sistema de Facturación", anchoPagina / 2, y, {
        align: "center",
      });

      // ========================================
      // GUARDAR
      // ========================================

      doc.save(`Reporte-Caja-${caja.id}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);

      alert(error.response?.data?.mensaje || "No fue posible generar el PDF.");
    } finally {
      setDescargandoPDF(null);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      <Navbar />

      <div className="container-fluid px-3 px-md-4 py-4">
        {/* ======================================
            ENCABEZADO
        ====================================== */}

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1">Reportes de Caja</h2>

            <p className="text-muted mb-0">Historial de cajas de la empresa</p>
          </div>
        </div>

        {/* ======================================
            RESUMEN
        ====================================== */}

        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small mb-2">Total vendido</div>

                <div className="fs-3 fw-bold">{dinero(resumen.ventas)}</div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small mb-2">Ganancias</div>

                <div className="fs-3 fw-bold text-success">
                  {dinero(resumen.ganancias)}
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small mb-2">Facturas</div>

                <div className="fs-3 fw-bold">{resumen.facturas}</div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small mb-2">Propinas</div>

                <div className="fs-3 fw-bold text-primary">
                  {dinero(resumen.totalPropinas)}
                </div>

                <div className="small text-muted mt-2">
                  {resumen.propinas}{" "}
                  {resumen.propinas === 1
                    ? "propina aplicada"
                    : "propinas aplicadas"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================
            HISTORIAL
        ====================================== */}

        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="p-4 border-bottom">
              <h5 className="fw-bold mb-1">Historial de cajas</h5>

              <div className="small text-muted">
                Cajas registradas por todos los cajeros de la empresa
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4">Caja</th>

                    <th>Cajero</th>

                    <th>Apertura</th>

                    <th>Cierre</th>

                    <th>Ventas</th>

                    <th>Ganancia</th>

                    <th>Facturas</th>

                    <th>Propinas</th>

                    <th>Estado</th>

                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {cargando ? (
                    <tr>
                      <td colSpan="10" className="text-center py-5">
                        Cargando reportes...
                      </td>
                    </tr>
                  ) : reportes.length > 0 ? (
                    reportes.map((reporte) => (
                      <tr key={reporte.id}>
                        <td className="px-4 fw-semibold">#{reporte.id}</td>

                        <td>{reporte.usuario_nombre || "N/A"}</td>

                        <td>{formatearFecha(reporte.fecha_apertura)}</td>

                        <td>{formatearFecha(reporte.fecha_cierre)}</td>

                        <td>{dinero(reporte.total_ventas)}</td>

                        <td>{dinero(reporte.ganancia)}</td>

                        <td>{reporte.cantidad_facturas || 0}</td>

                        <td>
                          <div className="fw-semibold">
                            {reporte.cantidad_propinas_aplicadas || 0}
                          </div>

                          <div className="small text-muted">
                            {dinero(reporte.total_propinas)}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              reporte.estado === "CERRADA"
                                ? "text-bg-secondary"
                                : "text-bg-success"
                            }`}
                          >
                            {reporte.estado}
                          </span>
                        </td>

                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              data-bs-toggle="modal"
                              data-bs-target="#modalReporte"
                              onClick={() => verReporte(reporte.id)}
                            >
                              Ver
                            </button>

                            <button
                              className="btn btn-outline-success btn-sm"
                              onClick={() => descargarPDF(reporte.id)}
                              disabled={descargandoPDF === reporte.id}
                            >
                              {descargandoPDF === reporte.id
                                ? "Generando..."
                                : "⬇ PDF"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="text-center py-5 text-muted">
                        No hay cajas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL DETALLE
      ========================================== */}

      <div className="modal fade" id="modalReporte" tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                Detalle de Caja
                {reporteSeleccionado ? ` #${reporteSeleccionado.id}` : ""}
              </h5>

              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              />
            </div>

            <div className="modal-body">
              {cargandoDetalle ? (
                <div className="text-center py-5">
                  <div className="spinner-border" />

                  <div className="mt-3 text-muted">Cargando reporte...</div>
                </div>
              ) : reporteSeleccionado ? (
                <div className="row g-3">
                  {/* CAJERO */}

                  <div className="col-12">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Cajero</div>

                      <div className="fw-semibold mt-1">
                        {reporteSeleccionado.usuario_nombre || "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* APERTURA */}

                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Apertura</div>

                      <div className="fw-semibold mt-1">
                        {formatearFecha(reporteSeleccionado.fecha_apertura)}
                      </div>
                    </div>
                  </div>

                  {/* CIERRE */}

                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Cierre</div>

                      <div className="fw-semibold mt-1">
                        {formatearFecha(reporteSeleccionado.fecha_cierre)}
                      </div>
                    </div>
                  </div>

                  {/* TOTAL VENTAS */}

                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Total ventas</div>

                      <div className="fs-4 fw-bold mt-1">
                        {dinero(reporteSeleccionado.total_ventas)}
                      </div>
                    </div>
                  </div>

                  {/* GANANCIA */}

                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Ganancia</div>

                      <div className="fs-4 fw-bold text-success mt-1">
                        {dinero(reporteSeleccionado.ganancia)}
                      </div>
                    </div>
                  </div>

                  {/* EFECTIVO */}

                  <div className="col-12 col-md-4">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Efectivo</div>

                      <div className="fw-bold mt-1">
                        {dinero(reporteSeleccionado.efectivo)}
                      </div>
                    </div>
                  </div>

                  {/* TARJETA */}

                  <div className="col-12 col-md-4">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Tarjeta</div>

                      <div className="fw-bold mt-1">
                        {dinero(reporteSeleccionado.tarjeta)}
                      </div>
                    </div>
                  </div>

                  {/* TRANSFERENCIA */}

                  <div className="col-12 col-md-4">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Transferencia</div>

                      <div className="fw-bold mt-1">
                        {dinero(reporteSeleccionado.transferencia)}
                      </div>
                    </div>
                  </div>

                  {/* FACTURAS */}

                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Facturas</div>

                      <div className="fs-4 fw-bold mt-1">
                        {reporteSeleccionado.cantidad_facturas || 0}
                      </div>
                    </div>
                  </div>

                  {/* PRODUCTOS */}

                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Productos vendidos</div>

                      <div className="fs-4 fw-bold mt-1">
                        {reporteSeleccionado.cantidad_productos || 0}
                      </div>
                    </div>
                  </div>

                  {/* PROPINAS */}

                  <div className="col-12">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Propinas</div>

                      <div className="d-flex flex-column flex-md-row gap-4 mt-1">
                        <div>
                          <div className="small text-muted">Cantidad</div>

                          <div className="fs-5 fw-bold">
                            {reporteSeleccionado.cantidad_propinas_aplicadas ||
                              0}
                          </div>
                        </div>

                        <div>
                          <div className="small text-muted">Total</div>

                          <div className="fs-5 fw-bold text-primary">
                            {dinero(reporteSeleccionado.total_propinas)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DINERO CONTADO */}

                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Dinero contado</div>

                      <div className="fs-4 fw-bold mt-1">
                        {dinero(reporteSeleccionado.dinero_contado)}
                      </div>
                    </div>
                  </div>

                  {/* DIFERENCIA */}

                  <div className="col-12 col-md-6">
                    <div className="border rounded p-3">
                      <div className="small text-muted">Diferencia</div>

                      <div className="fs-4 fw-bold mt-1">
                        {dinero(reporteSeleccionado.diferencia)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted py-5">
                  No se pudo cargar el reporte.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ReportesCaja;
