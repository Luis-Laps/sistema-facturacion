import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function formatearFecha(fecha) {
  if (!fecha) return "—";

  const fechaValida = new Date(fecha);

  if (Number.isNaN(fechaValida.getTime())) return "—";

  return fechaValida.toLocaleString("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatoMoneda(valor) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(Number(valor) || 0);
}

function obtenerObjeto(valor, predeterminado = {}) {
  if (!valor) return predeterminado;

  if (typeof valor === "object") {
    return valor;
  }

  try {
    return JSON.parse(valor);
  } catch {
    return predeterminado;
  }
}

function obtenerDetalles(valor) {
  const detalles = obtenerObjeto(valor, []);
  return Array.isArray(detalles) ? detalles : [];
}

function obtenerValor(valor) {
  return valor === null || valor === undefined || valor === "" ? "—" : valor;
}

function obtenerNumero(factura) {
  return (
    factura.numero_factura ||
    factura.factura_data?.numero_factura ||
    `Factura #${factura.factura_id}`
  );
}

function obtenerTotal(factura) {
  const datos = obtenerObjeto(factura.factura_data);

  return datos.total ?? factura.total ?? 0;
}

function FacturasEliminadas() {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => {
    cargarFacturasEliminadas();
  }, []);

  async function cargarFacturasEliminadas() {
    try {
      setCargando(true);
      setError("");

      const respuesta = await api.get("/facturas/eliminadas");

      const registros = Array.isArray(respuesta.data)
        ? respuesta.data
        : respuesta.data.facturas || respuesta.data.registros || [];

      setFacturas(registros);
    } catch (err) {
      console.error("Error cargando facturas eliminadas:", err);

      setError(
        err.response?.data?.mensaje ||
          "No se pudo cargar el historial de facturas eliminadas.",
      );
    } finally {
      setCargando(false);
    }
  }

  const facturasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return facturas.filter((factura) => {
      const datosFactura = obtenerObjeto(factura.factura_data);

      const coincideBusqueda =
        !termino ||
        String(obtenerNumero(factura)).toLowerCase().includes(termino) ||
        String(factura.usuario || "")
          .toLowerCase()
          .includes(termino) ||
        String(factura.usuario_nombre || "")
          .toLowerCase()
          .includes(termino) ||
        String(factura.motivo || "")
          .toLowerCase()
          .includes(termino) ||
        String(datosFactura.nombre_cliente || "")
          .toLowerCase()
          .includes(termino);

      const fecha = factura.eliminado_en
        ? new Date(factura.eliminado_en).toISOString().slice(0, 10)
        : "";

      const coincideDesde = !fechaDesde || fecha >= fechaDesde;
      const coincideHasta = !fechaHasta || fecha <= fechaHasta;

      return coincideBusqueda && coincideDesde && coincideHasta;
    });
  }, [facturas, busqueda, fechaDesde, fechaHasta]);

  const totalEliminado = facturasFiltradas.reduce(
    (suma, factura) => suma + Number(obtenerTotal(factura) || 0),
    0,
  );

  return (
    <div className="container-fluid py-4">
      {/* Encabezado */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Facturas eliminadas</h2>
          <p className="text-muted mb-0">
            Historial de eliminaciones, información original y auditoría.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={cargarFacturasEliminadas}
          disabled={cargando}
        >
          {cargando ? "Actualizando..." : "↻ Actualizar"}
        </button>
      </div>

      {/* Indicadores */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">Facturas encontradas</div>
              <div className="fs-3 fw-bold">{facturasFiltradas.length}</div>
              <div className="text-muted small">
                Según los filtros aplicados
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Total histórico de las facturas filtradas
              </div>
              <div className="fs-3 fw-bold text-danger">
                {formatoMoneda(totalEliminado)}
              </div>
              <div className="text-muted small">
                Importe original; no representa necesariamente una pérdida.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <label
                htmlFor="buscarFacturaEliminada"
                className="form-label fw-semibold"
              >
                Buscar factura, cliente, usuario o motivo
              </label>

              <input
                id="buscarFacturaEliminada"
                type="search"
                className="form-control"
                placeholder="Número, cliente, usuario o motivo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <label htmlFor="fechaDesde" className="form-label fw-semibold">
                Eliminadas desde
              </label>

              <input
                id="fechaDesde"
                type="date"
                className="form-control"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <label htmlFor="fechaHasta" className="form-label fw-semibold">
                Eliminadas hasta
              </label>

              <input
                id="fechaHasta"
                type="date"
                className="form-control"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Errores */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tabla */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="text-muted mt-3 mb-0">Cargando historial...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Factura</th>
                    <th>Fecha de eliminación</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Motivo</th>
                    <th className="text-end">Total</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {facturasFiltradas.map((factura) => (
                    <tr key={factura.id}>
                      <td className="fw-semibold">{obtenerNumero(factura)}</td>

                      <td className="text-nowrap">
                        {formatearFecha(factura.eliminado_en)}
                      </td>

                      <td>
                        {factura.usuario_nombre ||
                          factura.usuario ||
                          "Usuario desconocido"}
                      </td>

                      <td>
                        <span className="badge text-bg-secondary">
                          {factura.rol_usuario || "—"}
                        </span>
                      </td>

                      <td style={{ minWidth: 150 }}>
                        {factura.motivo || "Sin motivo"}
                      </td>

                      <td className="text-end text-nowrap">
                        {formatoMoneda(obtenerTotal(factura))}
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setSeleccionada(factura)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}

                  {facturasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <div className="fs-5 mb-2">
                          No hay registros para mostrar
                        </div>
                        <div className="text-muted small">
                          Prueba cambiando la búsqueda o las fechas.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalle */}
      {seleccionada &&
        (() => {
          const factura = obtenerObjeto(seleccionada.factura_data);
          const detalles = obtenerDetalles(seleccionada.detalle_data);

          const descuento = Number(factura.descuento ?? 0);
          const itbis = Number(factura.itbis ?? 0);
          const propina = Number(factura.propina ?? 0);
          const total = Number(factura.total ?? 0);

          const sumaDetalles = detalles.reduce((suma, item) => {
            return suma + Number(item.cantidad ?? 0) * Number(item.precio ?? 0);
          }, 0);

          const subtotal = Number(
            factura.subtotal ??
              factura.sub_total ??
              (detalles.length ? sumaDetalles : total + descuento),
          );

          return (
            <div
              className="modal d-block"
              tabIndex="-1"
              role="dialog"
              aria-modal="true"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.65)" }}
              onClick={() => setSeleccionada(null)}
            >
              <div
                className="modal-dialog modal-xl modal-dialog-scrollable"
                role="document"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-content border-0 shadow-lg rounded-4">
                  <div className="modal-header px-4 py-3">
                    <div>
                      <h5 className="modal-title fw-bold mb-1">
                        Detalle de eliminación
                      </h5>
                      <div className="text-muted small">
                        {obtenerNumero(seleccionada)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Cerrar"
                      onClick={() => setSeleccionada(null)}
                    />
                  </div>

                  <div className="modal-body p-4">
                    {/* Auditoría */}
                    <div className="card border-0 bg-light mb-4">
                      <div className="card-body">
                        <h6 className="fw-bold mb-3">
                          Información de auditoría
                        </h6>

                        <div className="row g-3">
                          <div className="col-12 col-md-6">
                            <div className="text-muted small">
                              Fecha de eliminación
                            </div>
                            <div className="fw-semibold">
                              {formatearFecha(seleccionada.eliminado_en)}
                            </div>
                          </div>

                          <div className="col-12 col-md-6">
                            <div className="text-muted small">
                              Usuario responsable
                            </div>
                            <div className="fw-semibold">
                              {seleccionada.usuario_nombre ||
                                seleccionada.usuario ||
                                "Usuario desconocido"}
                            </div>
                          </div>

                          <div className="col-12 col-md-6">
                            <div className="text-muted small">Rol</div>
                            <span className="badge text-bg-secondary">
                              {seleccionada.rol_usuario || "—"}
                            </span>
                          </div>

                          <div className="col-12 col-md-6">
                            <div className="text-muted small">Dirección IP</div>
                            <div className="fw-semibold">
                              {seleccionada.ip || "No registrada"}
                            </div>
                          </div>

                          <div className="col-12">
                            <div className="text-muted small">
                              Motivo de eliminación
                            </div>
                            <div className="fw-semibold">
                              {seleccionada.motivo || "Sin motivo registrado"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Factura original */}
                    <h6 className="fw-bold mb-3">
                      Información de la factura original
                    </h6>

                    <div className="row g-3 mb-4">
                      <div className="col-12 col-sm-6 col-lg-4">
                        <div className="border rounded-3 p-3 h-100">
                          <div className="text-muted small">Número</div>
                          <div className="fw-bold fs-5">
                            {obtenerNumero(seleccionada)}
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-4">
                        <div className="border rounded-3 p-3 h-100">
                          <div className="text-muted small">
                            Fecha de emisión
                          </div>
                          <div className="fw-semibold">
                            {formatearFecha(factura.fecha)}
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-4">
                        <div className="border rounded-3 p-3 h-100">
                          <div className="text-muted small">Cliente</div>
                          <div className="fw-semibold">
                            {obtenerValor(factura.nombre_cliente)}
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-4">
                        <div className="border rounded-3 p-3 h-100">
                          <div className="text-muted small">Forma de pago</div>
                          <div className="fw-semibold">
                            {obtenerValor(factura.forma_pago)}
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-4">
                        <div className="border rounded-3 p-3 h-100">
                          <div className="text-muted small">Descuento</div>
                          <div className="fw-semibold">
                            {formatoMoneda(descuento)}
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-sm-6 col-lg-4">
                        <div className="border rounded-3 p-3 h-100">
                          <div className="text-muted small">
                            ITBIS registrado
                          </div>
                          <div className="fw-semibold">
                            {formatoMoneda(itbis)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Productos */}
                    <h6 className="fw-bold mb-3">
                      Productos y servicios originales
                    </h6>

                    <div className="table-responsive mb-4">
                      <table className="table table-bordered table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Descripción</th>
                            <th className="text-end">Cantidad</th>
                            <th className="text-end">Precio unitario</th>
                            <th className="text-end">Importe</th>
                          </tr>
                        </thead>

                        <tbody>
                          {detalles.map((item, indice) => {
                            const cantidad = Number(item.cantidad ?? 0);
                            const precio = Number(item.precio ?? 0);
                            const importe = cantidad * precio;

                            return (
                              <tr key={item.id ?? indice}>
                                <td>
                                  <div className="fw-semibold">
                                    {item.nombre_producto ||
                                      item.producto_nombre ||
                                      item.descripcion ||
                                      item.descripcion_manual ||
                                      (item.producto_id
                                        ? `Producto #${item.producto_id}`
                                        : "Artículo sin descripción")}
                                  </div>

                                  {(item.es_servicio === true ||
                                    item.es_servicio === "true") && (
                                    <span className="badge text-bg-info mt-1">
                                      Servicio
                                    </span>
                                  )}
                                </td>

                                <td className="text-end">{cantidad}</td>

                                <td className="text-end text-nowrap">
                                  {formatoMoneda(precio)}
                                </td>

                                <td className="text-end fw-semibold text-nowrap">
                                  {formatoMoneda(importe)}
                                </td>
                              </tr>
                            );
                          })}

                          {detalles.length === 0 && (
                            <tr>
                              <td
                                colSpan="4"
                                className="text-center text-muted py-4"
                              >
                                No hay detalles de productos registrados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Resumen */}
                    <div className="row justify-content-end">
                      <div className="col-12 col-md-6 col-lg-5">
                        <div className="border rounded-3 p-3">
                          <div className="d-flex justify-content-between gap-3 mb-2">
                            <span className="text-muted">
                              Subtotal registrado
                            </span>
                            <span className="text-nowrap">
                              {formatoMoneda(subtotal)}
                            </span>
                          </div>

                          <div className="d-flex justify-content-between gap-3 mb-2">
                            <span className="text-muted">Descuento</span>
                            <span className="text-nowrap">
                              - {formatoMoneda(descuento)}
                            </span>
                          </div>

                          {itbis > 0 && (
                            <div className="d-flex justify-content-between gap-3 mb-2">
                              <span className="text-muted">ITBIS</span>
                              <span className="text-nowrap">
                                {formatoMoneda(itbis)}
                              </span>
                            </div>
                          )}

                          {propina > 0 && (
                            <div className="d-flex justify-content-between gap-3 mb-2">
                              <span className="text-muted">Propina</span>
                              <span className="text-nowrap">
                                {formatoMoneda(propina)}
                              </span>
                            </div>
                          )}

                          <hr />

                          <div className="d-flex justify-content-between align-items-center gap-3">
                            <span className="fw-bold">Total original</span>
                            <span className="fw-bold fs-4 text-nowrap">
                              {formatoMoneda(total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="alert alert-warning mt-4 mb-0">
                      <strong>Registro histórico:</strong> esta información
                      corresponde a la factura antes de ser eliminada. Consultar
                      este detalle no restaura la factura ni modifica el
                      inventario.
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSeleccionada(null)}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

export default FacturasEliminadas;
