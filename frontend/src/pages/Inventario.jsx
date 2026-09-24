import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import Navbar from "../components/Navbar";
import api from "../services/api";

function Inventario() {
  // ==========================================
  // ESTADOS
  // ==========================================

  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  const [buscar, setBuscar] = useState("");
  const [tipoMovimiento, setTipoMovimiento] = useState("");

  const [cargando, setCargando] = useState(false);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);

  const [modal, setModal] = useState(null);

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const [cantidad, setCantidad] = useState("");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // ==========================================
  // CARGAR EXISTENCIAS
  // ==========================================

  const cargarExistencias = async () => {
    try {
      setCargando(true);

      const response = await api.get("/inventario/existencias", {
        params: {
          buscar,
        },
      });

      setProductos(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error cargando existencias:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.mensaje ||
          "No se pudieron cargar las existencias.",
      });
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // CARGAR MOVIMIENTOS
  // ==========================================

  const cargarMovimientos = async () => {
    try {
      setCargandoMovimientos(true);

      const response = await api.get("/inventario/movimientos", {
        params: {
          tipo: tipoMovimiento || undefined,
          fecha_desde: fechaDesde || undefined,
          fecha_hasta: fechaHasta || undefined,
        },
      });

      setMovimientos(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error cargando movimientos:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.mensaje ||
          "No se pudieron cargar los movimientos.",
      });
    } finally {
      setCargandoMovimientos(false);
    }
  };

  // ==========================================
  // CARGA INICIAL
  // ==========================================

  useEffect(() => {
    cargarExistencias();
  }, []);

  useEffect(() => {
    cargarMovimientos();
  }, []);

  // ==========================================
  // BUSCAR
  // ==========================================

  const ejecutarBusqueda = () => {
    cargarExistencias();
  };

  // ==========================================
  // ABRIR MODAL
  // ==========================================

  const abrirMovimiento = (tipo, producto = null) => {
    setModal(tipo);
    setProductoSeleccionado(producto);
    setCantidad("");
  };

  // ==========================================
  // CERRAR MODAL
  // ==========================================

  const cerrarModal = () => {
    setModal(null);
    setProductoSeleccionado(null);
    setCantidad("");
  };

  // ==========================================
  // REGISTRAR MOVIMIENTO
  // ==========================================

  const registrarMovimiento = async () => {
    if (!productoSeleccionado) {
      Swal.fire("Atención", "Seleccione un producto.", "warning");

      return;
    }

    const cantidadNumero = Number(cantidad);

    if (!Number.isInteger(cantidadNumero) || cantidadNumero <= 0) {
      Swal.fire(
        "Cantidad inválida",
        "La cantidad debe ser un número entero mayor que cero.",
        "warning",
      );

      return;
    }

    try {
      let endpoint = "";

      if (modal === "ENTRADA") {
        endpoint = "/inventario/entrada";
      }

      if (modal === "SALIDA") {
        endpoint = "/inventario/salida";
      }

      if (modal === "AJUSTE") {
        endpoint = "/inventario/ajuste";
      }

      await api.post(endpoint, {
        producto_id: productoSeleccionado.id,
        cantidad: cantidadNumero,
      });

      await cargarExistencias();
      await cargarMovimientos();

      Swal.fire({
        icon: "success",
        title: "Movimiento registrado",
        text:
          modal === "ENTRADA"
            ? "La entrada fue registrada correctamente."
            : modal === "SALIDA"
              ? "La salida fue registrada correctamente."
              : "El ajuste fue registrado correctamente.",
        timer: 1800,
        showConfirmButton: false,
      });

      cerrarModal();
    } catch (error) {
      console.error("Error registrando movimiento:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo registrar",
        text:
          error.response?.data?.mensaje ||
          "Ocurrió un error al registrar el movimiento.",
      });
    }
  };

  // ==========================================
  // VER KARDEX
  // ==========================================

  const verKardex = async (producto) => {
    try {
      const response = await api.get(`/inventario/kardex/${producto.id}`);

      const data = response.data;

      let html = "";

      if (!data.movimientos || data.movimientos.length === 0) {
        html = `
          <div class="text-muted py-3">
            Este producto todavía no tiene movimientos.
          </div>
        `;
      } else {
        html = `
          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                ${data.movimientos
                  .map((movimiento) => {
                    const clase =
                      movimiento.tipo === "ENTRADA"
                        ? "text-success"
                        : movimiento.tipo === "SALIDA"
                          ? "text-danger"
                          : "text-primary";

                    const signo =
                      movimiento.tipo === "ENTRADA"
                        ? "+"
                        : movimiento.tipo === "SALIDA"
                          ? "-"
                          : Number(movimiento.cantidad) >= 0
                            ? "+"
                            : "";

                    return `
                      <tr>
                        <td>
                          ${formatearFecha(movimiento.fecha)}
                        </td>

                        <td>
                          ${obtenerEtiquetaTipo(movimiento.tipo)}
                        </td>

                        <td class="${clase} fw-bold">
                          ${signo}${movimiento.cantidad}
                        </td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        `;
      }

      Swal.fire({
        title: `Kardex: ${producto.nombre}`,
        html: `
          <div class="text-start mb-3">
            <strong>Código:</strong>
            ${producto.codigo || "Sin código"}
            <br />
            <strong>Stock actual:</strong>
            ${producto.stock ?? 0}
          </div>

          ${html}
        `,
        width: "800px",
        confirmButtonText: "Cerrar",
      });
    } catch (error) {
      console.error("Error obteniendo Kardex:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.mensaje || "No se pudo obtener el Kardex.",
      });
    }
  };

  // ==========================================
  // ETIQUETA DE MOVIMIENTO
  // ==========================================

  const obtenerEtiquetaTipo = (tipo) => {
    switch (tipo) {
      case "ENTRADA":
        return `
          <span class="badge bg-success">
            Entrada
          </span>
        `;

      case "SALIDA":
        return `
          <span class="badge bg-danger">
            Salida
          </span>
        `;

      case "AJUSTE":
        return `
          <span class="badge bg-primary">
            Ajuste
          </span>
        `;

      default:
        return `
          <span class="badge bg-secondary">
            ${tipo}
          </span>
        `;
    }
  };

  // ==========================================
  // FORMATO FECHA
  // ==========================================

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "—";
    }

    const fechaObjeto = new Date(fecha);

    if (Number.isNaN(fechaObjeto.getTime())) {
      return "—";
    }

    return fechaObjeto.toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

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
  // PRODUCTOS CON STOCK BAJO
  // ==========================================

  const productosStockBajo = productos.filter(
    (producto) => Number(producto.stock || 0) <= 5,
  ).length;

  // ==========================================
  // TOTAL UNIDADES
  // ==========================================

  const totalUnidades = productos.reduce(
    (total, producto) => total + Number(producto.stock || 0),
    0,
  );

  // ==========================================
  // VALOR DEL INVENTARIO
  // ==========================================

  const valorInventario = productos.reduce(
    (total, producto) =>
      total + Number(producto.stock || 0) * Number(producto.costo_compra || 0),
    0,
  );

  return (
    <>
      <Navbar />

      <div className="container-fluid mt-4 px-4">
        {/* ==========================================
            ENCABEZADO
        ========================================== */}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">📦 Inventario</h2>

            <p className="text-muted mb-0">
              Control de existencias y movimientos
            </p>
          </div>
        </div>

        {/* ==========================================
            RESUMEN
        ========================================== */}

        <div className="row g-3 mb-4">
          {/* PRODUCTOS */}

          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <small className="text-muted">Productos</small>

                <h3 className="fw-bold mt-2 mb-0">{productos.length}</h3>
              </div>
            </div>
          </div>

          {/* UNIDADES */}

          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <small className="text-muted">Unidades en inventario</small>

                <h3 className="fw-bold mt-2 mb-0">{totalUnidades}</h3>
              </div>
            </div>
          </div>

          {/* STOCK BAJO */}

          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <small className="text-muted">Stock bajo</small>

                <h3 className="fw-bold text-warning mt-2 mb-0">
                  {productosStockBajo}
                </h3>
              </div>
            </div>
          </div>

          {/* VALOR */}

          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <small className="text-muted">Valor del inventario</small>

                <h3 className="fw-bold mt-2 mb-0">
                  RD$
                  {formatearDinero(valorInventario)}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            EXISTENCIAS
        ========================================== */}

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <div className="row g-2 align-items-center">
              <div className="col-md-7">
                <h5 className="mb-0 fw-bold">Existencias</h5>
              </div>

              <div className="col-md-5">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar producto..."
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        ejecutarBusqueda();
                      }
                    }}
                  />

                  <button
                    className="btn btn-primary"
                    onClick={ejecutarBusqueda}
                  >
                    🔎 Buscar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {cargando ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : productos.length === 0 ? (
              <div className="text-center text-muted py-5">
                No hay productos en inventario.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Stock</th>
                      <th>Costo</th>
                      <th>Valor</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {productos.map((producto) => {
                      const stock = Number(producto.stock || 0);

                      const valor = stock * Number(producto.costo_compra || 0);

                      return (
                        <tr key={producto.id}>
                          <td>
                            <span className="fw-semibold">
                              {producto.codigo || "—"}
                            </span>
                          </td>

                          <td>
                            <strong>{producto.nombre}</strong>
                          </td>

                          <td>{producto.categoria || "Sin categoría"}</td>

                          <td>
                            <span
                              className={
                                stock <= 5
                                  ? "badge bg-warning text-dark fs-6"
                                  : "badge bg-success fs-6"
                              }
                            >
                              {stock}
                            </span>
                          </td>

                          <td>
                            RD$
                            {formatearDinero(producto.costo_compra)}
                          </td>

                          <td>
                            <strong>
                              RD$
                              {formatearDinero(valor)}
                            </strong>
                          </td>

                          <td>
                            <div className="d-flex justify-content-center gap-1 flex-wrap">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() =>
                                  abrirMovimiento("ENTRADA", producto)
                                }
                                title="Entrada"
                              >
                                ➕
                              </button>

                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() =>
                                  abrirMovimiento("SALIDA", producto)
                                }
                                title="Salida"
                              >
                                ➖
                              </button>

                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() =>
                                  abrirMovimiento("AJUSTE", producto)
                                }
                                title="Ajustar"
                              >
                                🔧
                              </button>

                              <button
                                className="btn btn-sm btn-outline-dark"
                                onClick={() => verKardex(producto)}
                                title="Kardex"
                              >
                                📋
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

        {/* ==========================================
            MOVIMIENTOS
        ========================================== */}

        <div className="card border-0 shadow-sm mb-5">
          <div className="card-header bg-white py-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-3">
                <h5 className="mb-0 fw-bold">Movimientos</h5>
              </div>

              <div className="col-md-2">
                <label className="form-label mb-1">Tipo</label>

                <select
                  className="form-select"
                  value={tipoMovimiento}
                  onChange={(e) => setTipoMovimiento(e.target.value)}
                >
                  <option value="">Todos</option>

                  <option value="ENTRADA">Entradas</option>

                  <option value="SALIDA">Salidas</option>

                  <option value="AJUSTE">Ajustes</option>
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label mb-1">Desde</label>

                <input
                  type="date"
                  className="form-control"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label mb-1">Hasta</label>

                <input
                  type="date"
                  className="form-control"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <button
                  className="btn btn-dark w-100"
                  onClick={cargarMovimientos}
                >
                  🔎 Filtrar movimientos
                </button>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {cargandoMovimientos ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
              </div>
            ) : movimientos.length === 0 ? (
              <div className="text-center text-muted py-5">
                No hay movimientos registrados.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Fecha</th>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                    </tr>
                  </thead>

                  <tbody>
                    {movimientos.map((movimiento) => {
                      const cantidad = Number(movimiento.cantidad);

                      let cantidadMostrar = cantidad;

                      let claseCantidad = "text-primary";

                      if (movimiento.tipo === "ENTRADA") {
                        cantidadMostrar = `+${cantidad}`;
                        claseCantidad = "text-success";
                      }

                      if (movimiento.tipo === "SALIDA") {
                        cantidadMostrar = `-${cantidad}`;
                        claseCantidad = "text-danger";
                      }

                      if (movimiento.tipo === "AJUSTE" && cantidad > 0) {
                        cantidadMostrar = `+${cantidad}`;
                      }

                      return (
                        <tr key={movimiento.id}>
                          <td>{formatearFecha(movimiento.fecha)}</td>

                          <td>{movimiento.codigo || "—"}</td>

                          <td>{movimiento.nombre}</td>

                          <td
                            dangerouslySetInnerHTML={{
                              __html: obtenerEtiquetaTipo(movimiento.tipo),
                            }}
                          />

                          <td className={`fw-bold ${claseCantidad}`}>
                            {cantidadMostrar}
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

      {/* ==========================================
          MODAL MOVIMIENTO
      ========================================== */}

      {modal && productoSeleccionado && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modal === "ENTRADA" && "➕ Entrada de inventario"}

                  {modal === "SALIDA" && "➖ Salida de inventario"}

                  {modal === "AJUSTE" && "🔧 Ajuste de inventario"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarModal}
                />
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label text-muted">Producto</label>

                  <div className="form-control bg-light">
                    <strong>{productoSeleccionado.nombre}</strong>

                    <br />

                    <small className="text-muted">
                      Código: {productoSeleccionado.codigo || "—"}
                    </small>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-muted">Stock actual</label>

                  <div className="form-control bg-light">
                    <strong>{productoSeleccionado.stock ?? 0}</strong> unidades
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    {modal === "AJUSTE" ? "Nuevo stock" : "Cantidad"}
                  </label>

                  <input
                    type="number"
                    min={modal === "AJUSTE" ? 0 : 1}
                    step="1"
                    className="form-control form-control-lg"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    autoFocus
                  />

                  {modal === "AJUSTE" && (
                    <small className="text-muted">
                      Escriba la cantidad física real que existe actualmente.
                    </small>
                  )}
                </div>

                {/* PREVISUALIZACIÓN */}

                {cantidad !== "" && (
                  <div className="alert alert-light border">
                    <strong>Stock después del movimiento:</strong>

                    <div className="fs-4 mt-1">
                      {modal === "ENTRADA" &&
                        Number(productoSeleccionado.stock || 0) +
                          Number(cantidad || 0)}

                      {modal === "SALIDA" &&
                        Number(productoSeleccionado.stock || 0) -
                          Number(cantidad || 0)}

                      {modal === "AJUSTE" && Number(cantidad || 0)}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className={
                    modal === "ENTRADA"
                      ? "btn btn-success"
                      : modal === "SALIDA"
                        ? "btn btn-danger"
                        : "btn btn-primary"
                  }
                  onClick={registrarMovimiento}
                >
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Inventario;
