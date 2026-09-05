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

  useEffect(() => {
    obtenerReportes();
  }, []);

  // ==========================================
  // OBTENER REPORTES
  // ==========================================

  const obtenerReportes = async () => {
    try {
      const res = await api.get("/cajas/reportes");
      setReportes(res.data);
    } catch (error) {
      console.error(error);
      alert("No fue posible obtener los reportes.");
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

      const res = await api.get(`/cajas/reportes/${id}`);

      setReporteSeleccionado(res.data);
    } catch (error) {
      console.error(error);
      alert("No fue posible obtener el reporte.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  // ==========================================
  // FORMATO DINERO
  // ==========================================

  const dinero = (valor) =>
    Number(valor || 0).toLocaleString("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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
        acc.descuentos += Number(item.total_descuentos || 0);
        acc.propinas += Number(item.total_propinas || 0);

        return acc;
      },
      {
        ventas: 0,
        ganancias: 0,
        facturas: 0,
        productos: 0,
        descuentos: 0,
        propinas: 0,
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
      // CREAR DOCUMENTO
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
      // INFORMACIÓN DE LA CAJA
      // ========================================

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(`Empresa: ${caja.empresa || "Empresa"}`, margen, y);

      y += 6;

      doc.text(`Cajero: ${caja.usuario_nombre || "N/A"}`, margen, y);

      y += 6;

      doc.text(
        `Apertura: ${
          caja.fecha_apertura
            ? new Date(caja.fecha_apertura).toLocaleString("es-DO")
            : "-"
        }`,
        margen,
        y,
      );

      y += 6;

      doc.text(
        `Cierre: ${
          caja.fecha_cierre
            ? new Date(caja.fecha_cierre).toLocaleString("es-DO")
            : "-"
        }`,
        margen,
        y,
      );

      y += 10;

      // ========================================
      // TÍTULO VENTAS
      // ========================================

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      doc.text("VENTAS", margen, y);

      y += 7;

      doc.setDrawColor(180, 180, 180);

      doc.line(margen, y, anchoPagina - margen, y);

      y += 7;

      // ========================================
      // AGRUPAR VENTAS
      // ========================================

      const ventasAgrupadas = {};

      ventas.forEach((item) => {
        if (!ventasAgrupadas[item.factura_id]) {
          ventasAgrupadas[item.factura_id] = {
            id: item.factura_id,
            fecha: item.fecha,
            total: Number(item.total || 0),
            forma_pago: item.forma_pago,

            descuento_tipo: item.descuento_tipo,

            descuento_general: Number(item.descuento_general || 0),

            propina_aplicada: item.propina_aplicada === true,

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
      // MOSTRAR CADA VENTA
      // ========================================

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      listaVentas.forEach((venta) => {
        const descripcion = venta.productos
          .map((producto) => `${producto.nombre} x${producto.cantidad}`)
          .join(" + ");

        const linea = `#${venta.id}  ${descripcion}`;

        const lineasTexto = doc.splitTextToSize(linea, anchoUtil - 45);

        // Revisar espacio antes de imprimir
        if (y + lineasTexto.length * 5 + 15 > 280) {
          doc.addPage();

          y = 18;
        }

        doc.text(lineasTexto, margen, y);

        doc.text(dinero(venta.total), anchoPagina - margen, y, {
          align: "right",
        });

        y += lineasTexto.length * 5;

        // ----------------------------------------
        // DESCUENTO
        // ----------------------------------------

        if (venta.descuento_general > 0) {
          doc.setFontSize(8);

          doc.text(
            `Descuento: -${dinero(venta.descuento_general)}${
              venta.descuento_tipo ? ` (${venta.descuento_tipo})` : ""
            }`,
            margen,
            y,
          );

          y += 4;
        }

        // ----------------------------------------
        // PROPINA
        // ----------------------------------------

        if (venta.propina > 0) {
          doc.setFontSize(8);

          doc.text(`Propina: ${dinero(venta.propina)}`, margen, y);

          y += 4;
        }

        doc.setFontSize(8);

        doc.setTextColor(100, 100, 100);

        doc.text(
          `${venta.forma_pago || "N/A"} · ${
            venta.fecha ? new Date(venta.fecha).toLocaleString("es-DO") : ""
          }`,
          margen,
          y,
        );

        doc.setFontSize(10);

        doc.setTextColor(0, 0, 0);

        y += 7;
      });

      // ========================================
      // RESUMEN FINAL
      // ========================================

      if (y + 90 > 280) {
        doc.addPage();

        y = 18;
      }

      y += 2;

      doc.setDrawColor(180, 180, 180);

      doc.line(margen, y, anchoPagina - margen, y);

      y += 9;

      const totalVentas = listaVentas.reduce(
        (total, venta) => total + Number(venta.total || 0),
        0,
      );

      const totalDescuentos = listaVentas.reduce(
        (total, venta) => total + Number(venta.descuento_general || 0),
        0,
      );

      const totalPropinas = listaVentas.reduce(
        (total, venta) => total + Number(venta.propina || 0),
        0,
      );

      doc.setFont("helvetica", "bold");

      doc.setFontSize(12);

      doc.text("RESUMEN", margen, y);

      y += 8;

      doc.setFont("helvetica", "normal");

      doc.setFontSize(10);

      doc.text(`Total ventas: ${dinero(totalVentas)}`, margen, y);

      y += 6;

      doc.text(`Descuentos: ${dinero(totalDescuentos)}`, margen, y);

      y += 6;

      doc.text(`Propinas: ${dinero(totalPropinas)}`, margen, y);

      y += 6;

      doc.text(
        `Efectivo: ${dinero(reportes.find((r) => r.id === caja.id)?.efectivo)}`,
        margen,
        y,
      );

      y += 6;

      doc.text(
        `Tarjeta: ${dinero(reportes.find((r) => r.id === caja.id)?.tarjeta)}`,
        margen,
        y,
      );

      y += 6;

      doc.text(
        `Transferencia: ${dinero(
          reportes.find((r) => r.id === caja.id)?.transferencia,
        )}`,
        margen,
        y,
      );

      y += 9;

      doc.text(`Facturas: ${listaVentas.length}`, margen, y);

      y += 6;

      const cantidadProductos = ventas.reduce(
        (total, item) => total + Number(item.cantidad || 0),
        0,
      );

      doc.text(`Productos vendidos: ${cantidadProductos}`, margen, y);

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
      // DESCARGAR
      // ========================================

      doc.save(`Reporte-Caja-${caja.id}.pdf`);
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.mensaje || "No fue posible generar el PDF.");
    } finally {
      setDescargandoPDF(null);
    }
  };

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h2 className="mb-4">Reportes de Caja</h2>

        {/* ==========================================
            TARJETAS DE RESUMEN
        ========================================== */}

        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-bg-success">
              <div className="card-body">
                <h6>Total vendido</h6>

                <h3>{dinero(resumen.ventas)}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card text-bg-primary">
              <div className="card-body">
                <h6>Ganancias</h6>

                <h3>{dinero(resumen.ganancias)}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card text-bg-warning">
              <div className="card-body">
                <h6>Facturas</h6>

                <h3>{resumen.facturas}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card text-bg-info">
              <div className="card-body">
                <h6>Productos</h6>

                <h3>{resumen.productos}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3 mt-3">
            <div className="card text-bg-danger">
              <div className="card-body">
                <h6>Descuentos</h6>

                <h3>{dinero(resumen.descuentos)}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-3 mt-3">
            <div className="card text-bg-warning">
              <div className="card-body">
                <h6>Propinas</h6>

                <h3>{dinero(resumen.propinas)}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            HISTORIAL
        ========================================== */}

        <div className="card">
          <div className="card-header">Historial de cierres</div>

          <div className="card-body">
            {cargando ? (
              <p>Cargando...</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Apertura</th>
                      <th>Cierre</th>
                      <th>Ventas</th>
                      <th>Ganancia</th>
                      <th>Facturas</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reportes.map((r) => (
                      <tr key={r.id}>
                        <td>{r.id}</td>

                        <td>{new Date(r.fecha_apertura).toLocaleString()}</td>

                        <td>
                          {r.fecha_cierre
                            ? new Date(r.fecha_cierre).toLocaleString()
                            : "-"}
                        </td>

                        <td>{dinero(r.total_ventas)}</td>

                        <td>{dinero(r.ganancia)}</td>

                        <td>{r.cantidad_facturas}</td>

                        <td>{r.estado}</td>

                        <td>
                          <div className="d-flex gap-2">
                            {/* VER */}

                            <button
                              className="btn btn-outline-primary btn-sm"
                              data-bs-toggle="modal"
                              data-bs-target="#modalReporte"
                              onClick={() => verReporte(r.id)}
                            >
                              Ver
                            </button>

                            {/* PDF */}

                            <button
                              className="btn btn-outline-success btn-sm"
                              onClick={() => descargarPDF(r.id)}
                              disabled={descargandoPDF === r.id}
                            >
                              {descargandoPDF === r.id
                                ? "Generando..."
                                : "⬇ Descargar PDF"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL
      ========================================== */}

      <div className="modal fade" id="modalReporte" tabIndex="-1">
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Reporte de Caja</h5>

              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              />
            </div>

            <div className="modal-body">
              {cargandoDetalle ? (
                <div className="text-center p-5">
                  <div className="spinner-border"></div>
                </div>
              ) : (
                reporteSeleccionado && (
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <div className="card">
                        <div className="card-body">
                          <h5>Caja #{reporteSeleccionado.id}</h5>

                          <p>
                            <strong>Estado:</strong>{" "}
                            {reporteSeleccionado.estado}
                          </p>

                          <p>
                            <strong>Apertura:</strong>

                            <br />

                            {new Date(
                              reporteSeleccionado.fecha_apertura,
                            ).toLocaleString()}
                          </p>

                          <p>
                            <strong>Cierre:</strong>

                            <br />

                            {reporteSeleccionado.fecha_cierre
                              ? new Date(
                                  reporteSeleccionado.fecha_cierre,
                                ).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6 mb-3">
                      <div className="card">
                        <div className="card-body">
                          <h5>Resumen</h5>

                          <p>
                            <strong>Monto inicial:</strong>{" "}
                            {dinero(reporteSeleccionado.monto_inicial)}
                          </p>

                          <p>
                            <strong>Total vendido:</strong>{" "}
                            {dinero(reporteSeleccionado.total_ventas)}
                          </p>

                          <p>
                            <strong>Ganancia:</strong>{" "}
                            {dinero(reporteSeleccionado.ganancia)}
                          </p>

                          <p>
                            <strong>Facturas:</strong>{" "}
                            {reporteSeleccionado.cantidad_facturas}
                          </p>

                          <p>
                            <strong>Productos:</strong>{" "}
                            {reporteSeleccionado.cantidad_productos}
                          </p>

                          <hr />

                          <p>
                            <strong>Descuentos:</strong>{" "}
                            {dinero(reporteSeleccionado.total_descuentos)}
                          </p>

                          <p>
                            <strong>Propinas:</strong>{" "}
                            {dinero(reporteSeleccionado.total_propinas)}
                          </p>

                          <p>
                            <strong>Facturas con descuento:</strong>{" "}
                            {reporteSeleccionado.cantidad_descuentos}
                          </p>

                          <p>
                            <strong>Facturas con propina:</strong>{" "}
                            {reporteSeleccionado.cantidad_propinas_aplicadas}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <h6>Efectivo</h6>

                          <h3>{dinero(reporteSeleccionado.efectivo)}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <h6>Tarjeta</h6>

                          <h3>{dinero(reporteSeleccionado.tarjeta)}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <h6>Transferencia</h6>

                          <h3>{dinero(reporteSeleccionado.transferencia)}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6 mt-3">
                      <div className="card border-success">
                        <div className="card-body">
                          <h5>Dinero contado</h5>

                          <h2>{dinero(reporteSeleccionado.dinero_contado)}</h2>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6 mt-3">
                      <div className="card border-danger">
                        <div className="card-body">
                          <h5>Diferencia</h5>

                          <h2>{dinero(reporteSeleccionado.diferencia)}</h2>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ReportesCaja;
