import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function ReportesCaja() {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    obtenerReportes();
  }, []);

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

  const resumen = useMemo(() => {
    return reportes.reduce(
      (acc, item) => {
        acc.ventas += Number(item.total_ventas || 0);
        acc.ganancias += Number(item.ganancia || 0);
        acc.facturas += Number(item.cantidad_facturas || 0);
        acc.productos += Number(item.cantidad_productos || 0);
        return acc;
      },
      {
        ventas: 0,
        ganancias: 0,
        facturas: 0,
        productos: 0,
      },
    );
  }, [reportes]);

  const dinero = (valor) =>
    Number(valor || 0).toLocaleString("es-DO", {
      style: "currency",
      currency: "DOP",
    });

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h2 className="mb-4">Reportes de Caja</h2>

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
        </div>

        <div className="card">
          <div className="card-header">Historial de cierres</div>

          <div className="card-body">
            {cargando ? (
              <p>Cargando...</p>
            ) : (
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
                    <th></th>
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
                        <button
                          className="btn btn-outline-primary btn-sm"
                          data-bs-toggle="modal"
                          data-bs-target="#modalReporte"
                          onClick={() => verReporte(r.id)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

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

                            {new Date(
                              reporteSeleccionado.fecha_cierre,
                            ).toLocaleString()}
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
