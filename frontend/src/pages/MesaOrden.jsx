import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import api from "../services/api";

function MesaOrden() {
  const { mesaId } = useParams();

  const navigate = useNavigate();

  const [mesa, setMesa] = useState(null);

  const [cuentas, setCuentas] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [mostrarModal, setMostrarModal] = useState(false);

  const [nombreCuenta, setNombreCuenta] = useState("");

  const [productos, setProductos] = useState([]);
  const [buscarProducto, setBuscarProducto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [mostrarCerrar, setMostrarCerrar] = useState(false);
  const [formaPago, setFormaPago] = useState("EFECTIVO");
  const [cerrandoCuenta, setCerrandoCuenta] = useState(false);
  const [propinaLeyHabilitada, setPropinaLeyHabilitada] = useState(false);
  const [propinaAplicada, setPropinaAplicada] = useState(false);

  // ==========================================
  // CUENTA SELECCIONADA
  // ==========================================

  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);

  const [detalle, setDetalle] = useState([]);

  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargarMesa = async () => {
    try {
      setCargando(true);

      const response = await api.get(`/control-orden/mesas/${mesaId}`);

      setMesa(response.data.mesa);
      setCuentas(response.data.cuentas);
    } catch (error) {
      console.error("Error al cargar mesa:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.mensaje || "No se pudo cargar la mesa.",
      });
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // ABRIR CUENTA
  // ==========================================

  const abrirCuenta = async (cuenta) => {
    try {
      setCuentaSeleccionada(cuenta);
      setDetalle([]);
      setCargandoDetalle(true);

      const response = await api.get(`/control-orden/cuentas/${cuenta.id}`);

      setDetalle(response.data.detalle || []);
    } catch (error) {
      console.error("Error al cargar cuenta:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.mensaje || "No se pudo cargar la cuenta.",
      });
    } finally {
      setCargandoDetalle(false);
    }
  };
  // ==========================================
  // CARGAR PRODUCTOS
  // ==========================================

  const cargarProductos = async (buscar = "") => {
    try {
      const response = await api.get(
        `/productos?limit=100&buscar=${encodeURIComponent(buscar)}`,
      );

      setProductos(response.data.data || []);
    } catch (error) {
      console.error("Error al cargar productos:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los productos.",
      });
    }
  };

  // ==========================================
  // AGREGAR PRODUCTO A LA CUENTA
  // ==========================================

  const agregarProducto = async () => {
    if (!cuentaSeleccionada) {
      return;
    }

    if (!productoSeleccionado) {
      Swal.fire({
        icon: "warning",
        title: "Producto requerido",
        text: "Selecciona un producto.",
      });

      return;
    }

    if (Number(cantidadProducto) <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Cantidad inválida",
        text: "La cantidad debe ser mayor que cero.",
      });

      return;
    }

    try {
      await api.post(
        `/control-orden/cuentas/${cuentaSeleccionada.id}/detalle`,
        {
          producto_id: productoSeleccionado.id,
          cantidad: Number(cantidadProducto),
          precio: Number(productoSeleccionado.precio_venta),
          descuento: 0,
        },
      );

      setProductoSeleccionado(null);
      setBuscarProducto("");
      setCantidadProducto(1);

      await abrirCuenta(cuentaSeleccionada);
      await cargarMesa();
    } catch (error) {
      console.error("Error al agregar producto:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo agregar",
        text:
          error.response?.data?.mensaje ||
          "Ocurrió un error al agregar el producto.",
      });
    }
  };

  // ==========================================
  // CAMBIAR CANTIDAD DE PRODUCTO
  // ==========================================

  const cambiarCantidad = async (detalleId, nuevaCantidad) => {
    const cantidad = Number(nuevaCantidad);

    if (cantidad < 1) {
      return;
    }

    try {
      await api.put(
        `/control-orden/cuentas/${cuentaSeleccionada.id}/detalle/${detalleId}`,
        {
          cantidad,
        },
      );

      await abrirCuenta(cuentaSeleccionada);
      await cargarMesa();
    } catch (error) {
      console.error("Error al cambiar cantidad:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo actualizar",
        text:
          error.response?.data?.mensaje || "No se pudo actualizar la cantidad.",
      });
    }
  };

  // ==========================================
  // ELIMINAR PRODUCTO DE LA CUENTA
  // ==========================================

  const eliminarProductoCuenta = async (detalleId) => {
    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar producto?",
      text: "Se eliminará este producto de la cuenta.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    try {
      await api.delete(
        `/control-orden/cuentas/${cuentaSeleccionada.id}/detalle/${detalleId}`,
      );

      await abrirCuenta(cuentaSeleccionada);
      await cargarMesa();

      Swal.fire({
        icon: "success",
        title: "Producto eliminado",
        timer: 900,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error al eliminar producto:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo eliminar",
        text:
          error.response?.data?.mensaje ||
          "Ocurrió un error al eliminar el producto.",
      });
    }
  };
  useEffect(() => {
    cargarMesa();
  }, [mesaId]);

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const response = await api.get("/configuracion");

        setPropinaLeyHabilitada(response.data?.propina_ley === true);
      } catch (error) {
        console.error("Error al cargar configuración:", error);

        setPropinaLeyHabilitada(false);
      }
    };

    cargarConfiguracion();
  }, []);

  // ==========================================
  // ABRIR MODAL CERRAR CUENTA
  // ==========================================

  const abrirModalCerrar = () => {
    if (detalle.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Cuenta vacía",
        text: "Agrega productos antes de cerrar la cuenta.",
      });

      return;
    }

    setFormaPago("EFECTIVO");
    setPropinaAplicada(false);
    setMostrarCerrar(true);
  };

  // ==========================================
  // CERRAR CUENTA
  // ==========================================

  const cerrarCuenta = async () => {
    if (!cuentaSeleccionada) {
      return;
    }

    try {
      setCerrandoCuenta(true);

      const response = await api.post(
        `/control-orden/cuentas/${cuentaSeleccionada.id}/cerrar`,
        {
          forma_pago: formaPago,
          propina_aplicada: propinaAplicada,
        },
      );

      setMostrarCerrar(false);
      setCuentaSeleccionada(null);
      setDetalle([]);

      await cargarMesa();
      const resultado = await Swal.fire({
        icon: "success",
        title: "Cuenta cerrada",
        html: `
    <div style="text-align:center">

      <div style="font-size:16px;margin-bottom:10px">
        La cuenta fue cerrada correctamente.
      </div>

      <div style="font-size:18px;margin-bottom:12px">
        Factura <strong>#${response.data.factura_id}</strong>
      </div>

      <div style="margin-bottom:5px">
        Subtotal:
        <strong>
          RD$ ${formatearMoneda(response.data.subtotal)}
        </strong>
      </div>

      ${
        Number(response.data.propina || 0) > 0
          ? `
            <div style="margin-bottom:5px">
              Propina:
              <strong>
                RD$ ${formatearMoneda(response.data.propina)}
              </strong>
            </div>
          `
          : ""
      }

      <div style="font-size:21px;margin-top:10px">
        Total:
        <strong>
          RD$ ${formatearMoneda(response.data.total)}
        </strong>
      </div>

    </div>
  `,
        showCancelButton: true,
        confirmButtonText: "🖨️ Imprimir factura",
        cancelButtonText: "Aceptar",
        reverseButtons: true,
      });

      if (resultado.isConfirmed && response.data.factura_id) {
        navigate(`/imprimir-factura/${response.data.factura_id}`);
      }
    } catch (error) {
      console.error("Error al cerrar cuenta:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo cerrar",
        text:
          error.response?.data?.mensaje ||
          "Ocurrió un error al cerrar la cuenta.",
      });
    } finally {
      setCerrandoCuenta(false);
    }
  };

  const abrirModalCuenta = () => {
    setNombreCuenta("");
    setMostrarModal(true);
  };

  const cerrarModalCuenta = () => {
    setMostrarModal(false);
    setNombreCuenta("");
  };

  const crearCuenta = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post(
        `/control-orden/mesas/${mesaId}/cuentas`,
        {
          nombre: nombreCuenta.trim() || null,
        },
      );

      cerrarModalCuenta();

      await cargarMesa();

      Swal.fire({
        icon: "success",
        title: "Cuenta creada",
        text: `Cuenta #${response.data.id} creada correctamente.`,
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error al crear cuenta:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.mensaje || "No se pudo crear la cuenta.",
      });
    }
  };

  const formatearMoneda = (valor) => {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  const subtotalCuenta = detalle.reduce(
    (total, item) =>
      total + Number(item.cantidad || 0) * Number(item.precio || 0),
    0,
  );

  const montoPropina = propinaAplicada ? subtotalCuenta * 0.1 : 0;

  const totalConPropina = subtotalCuenta + montoPropina;

  if (cargando) {
    return (
      <div className="container-fluid px-4 py-5 text-center">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>

        <p className="text-muted mt-3">Cargando mesa...</p>
      </div>
    );
  }

  if (!mesa) {
    return (
      <div className="container-fluid px-4 py-5">
        <button
          className="btn btn-outline-secondary mb-4"
          onClick={() => navigate("/control-orden")}
        >
          ← Volver
        </button>

        <div className="alert alert-danger">No se encontró la mesa.</div>
      </div>
    );
  }

  const cuentasAbiertas = cuentas.filter(
    (cuenta) => cuenta.estado === "ABIERTA",
  );

  const cuentasCerradas = cuentas.filter(
    (cuenta) => cuenta.estado === "CERRADA",
  );

  const totalMesa = cuentasAbiertas.reduce(
    (total, cuenta) => total + Number(cuenta.total || 0),
    0,
  );

  return (
    <div className="container-fluid px-4 py-4">
      {/* ENCABEZADO */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button
            className="btn btn-outline-secondary btn-sm mb-3"
            onClick={() => navigate("/control-orden")}
          >
            ← Control de Orden
          </button>

          <h2 className="fw-bold mb-1">{mesa.nombre}</h2>

          <p className="text-muted mb-0">Gestiona las cuentas de esta mesa.</p>
        </div>

        <button className="btn btn-success" onClick={abrirModalCuenta}>
          + Nueva cuenta
        </button>
      </div>

      {/* RESUMEN */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <small className="text-muted">Cuentas abiertas</small>

              <h3 className="fw-bold mb-0">{cuentasAbiertas.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <small className="text-muted">Total pendiente</small>

              <h3 className="fw-bold text-success mb-0">
                RD$ {formatearMoneda(totalMesa)}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <small className="text-muted">Cuentas cerradas</small>

              <h3 className="fw-bold mb-0">{cuentasCerradas.length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* CUENTAS ABIERTAS */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">Cuentas abiertas</h4>
      </div>

      {cuentasAbiertas.length === 0 ? (
        <div
          className="text-center py-5 mb-4"
          style={{
            border: "2px dashed #dee2e6",
            borderRadius: "16px",
            backgroundColor: "#fafafa",
          }}
        >
          <div
            style={{
              fontSize: "45px",
            }}
          >
            👤
          </div>

          <h5 className="fw-bold mt-3">No hay cuentas abiertas</h5>

          <p className="text-muted">
            Crea una cuenta para comenzar a agregar productos.
          </p>

          <button className="btn btn-success" onClick={abrirModalCuenta}>
            + Crear cuenta
          </button>
        </div>
      ) : (
        <div className="row g-4 mb-5">
          {cuentasAbiertas.map((cuenta) => (
            <div className="col-12 col-md-6 col-lg-4" key={cuenta.id}>
              <div
                className="card h-100 border-0 shadow-sm"
                style={{
                  borderRadius: "18px",
                  overflow: "hidden",
                }}
              >
                <div
                  className="p-3"
                  style={{
                    backgroundColor: "#f1f9f4",
                    borderBottom: "1px solid #e9ecef",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="fw-bold mb-1">
                        {cuenta.nombre || `Cuenta #${cuenta.id}`}
                      </h5>

                      <small className="text-muted">Cuenta #{cuenta.id}</small>
                    </div>

                    <span className="badge bg-success">ABIERTA</span>
                  </div>
                </div>

                <div className="card-body p-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Productos</span>

                    <strong>{cuenta.cantidad_items || 0}</strong>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Total</span>

                    <span className="fs-4 fw-bold text-success">
                      RD$ {formatearMoneda(cuenta.total)}
                    </span>
                  </div>
                </div>

                <div className="card-footer bg-white border-0 p-3">
                  <button
                    className="btn btn-primary w-100"
                    onClick={() => abrirCuenta(cuenta)}
                  >
                    Ver cuenta
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CUENTAS CERRADAS */}
      {cuentasCerradas.length > 0 && (
        <>
          <h4 className="fw-bold mb-3">Cuentas cerradas</h4>

          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th>Cuenta</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {cuentasCerradas.map((cuenta) => (
                  <tr key={cuenta.id}>
                    <td>#{cuenta.id}</td>

                    <td>{cuenta.nombre || "-"}</td>

                    <td>
                      <span className="badge bg-secondary">CERRADA</span>
                    </td>

                    <td>RD$ {formatearMoneda(cuenta.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ==========================================
    PANEL DE CUENTA
========================================== */}

      {cuentaSeleccionada && (
        <div
          className="position-fixed top-0 end-0 h-100 bg-white shadow-lg"
          style={{
            width: "420px",
            maxWidth: "100%",
            zIndex: 1050,
            overflowY: "auto",
          }}
        >
          {/* ENCABEZADO */}
          <div className="p-4 border-bottom">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="fw-bold mb-1">
                  {cuentaSeleccionada.nombre ||
                    `Cuenta #${cuentaSeleccionada.id}`}
                </h4>

                <small className="text-muted">
                  {mesa.nombre} · Cuenta #{cuentaSeleccionada.id}
                </small>
              </div>

              <button
                className="btn-close"
                onClick={() => setCuentaSeleccionada(null)}
              />
            </div>
          </div>

          {/* CONTENIDO */}
          <div className="p-4">
            {cargandoDetalle ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" />
                <p className="text-muted mt-3">Cargando cuenta...</p>
              </div>
            ) : detalle.length === 0 ? (
              <div className="text-center py-5">
                <div style={{ fontSize: "45px" }}>🛒</div>

                <h5 className="fw-bold mt-3">Cuenta vacía</h5>

                <p className="text-muted">
                  Todavía no hay productos en esta cuenta.
                </p>
              </div>
            ) : (
              <>
                <h6 className="fw-bold mb-3">Productos</h6>

                {detalle.map((item) => {
                  const cantidad = Number(item.cantidad || 0);
                  const precio = Number(item.precio || 0);

                  const subtotalItem = cantidad * precio;

                  return (
                    <div key={item.id} className="border-bottom py-3">
                      {/* INFORMACIÓN DEL PRODUCTO */}

                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-semibold">
                            {item.producto_nombre ||
                              item.descripcion_manual ||
                              "Producto"}
                          </div>

                          <small className="text-muted">
                            RD$ {formatearMoneda(precio)} c/u
                          </small>
                        </div>

                        <strong>RD$ {formatearMoneda(subtotalItem)}</strong>
                      </div>

                      {/* CONTROLES */}

                      <div className="d-flex justify-content-between align-items-center mt-3">
                        {/* CANTIDAD */}

                        <div className="btn-group" role="group">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            disabled={cantidad <= 1}
                            onClick={() =>
                              cambiarCantidad(item.id, cantidad - 1)
                            }
                          >
                            −
                          </button>

                          <span
                            className="btn btn-outline-secondary"
                            style={{
                              minWidth: "55px",
                            }}
                          >
                            {cantidad}
                          </span>

                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() =>
                              cambiarCantidad(item.id, cantidad + 1)
                            }
                          >
                            +
                          </button>
                        </div>

                        {/* ELIMINAR */}

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => eliminarProductoCuenta(item.id)}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* PIE */}
          <div className="border-top p-4">
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Subtotal</span>

              <strong>
                RD${" "}
                {formatearMoneda(
                  detalle.reduce(
                    (total, item) =>
                      total +
                      Number(item.cantidad || 0) * Number(item.precio || 0),
                    0,
                  ),
                )}
              </strong>
            </div>

            {/* CERRAR CUENTA */}
            <button
              type="button"
              className="btn btn-danger w-100 mt-3"
              onClick={abrirModalCerrar}
              disabled={detalle.length === 0}
            >
              Cerrar cuenta
            </button>

            {/* AGREGAR PRODUCTO */}
            <div className="mt-4">
              <h6 className="fw-bold mb-3">Agregar producto</h6>

              <input
                type="text"
                className="form-control mb-2"
                placeholder="Buscar producto..."
                value={buscarProducto}
                onChange={(e) => {
                  const valor = e.target.value;

                  setBuscarProducto(valor);
                  cargarProductos(valor);
                }}
              />

              {buscarProducto && (
                <div
                  className="border rounded mb-3"
                  style={{
                    maxHeight: "220px",
                    overflowY: "auto",
                  }}
                >
                  {productos.length === 0 ? (
                    <div className="p-3 text-muted">
                      No se encontraron productos.
                    </div>
                  ) : (
                    productos.map((producto) => (
                      <button
                        key={producto.id}
                        type="button"
                        className={`w-100 text-start border-0 border-bottom p-3 ${
                          productoSeleccionado?.id === producto.id
                            ? "bg-success-subtle"
                            : "bg-white"
                        }`}
                        onClick={() => {
                          setProductoSeleccionado(producto);
                          setBuscarProducto(producto.nombre);
                        }}
                      >
                        <div className="fw-semibold">{producto.nombre}</div>

                        <small className="text-muted">
                          Código: {producto.codigo}
                        </small>

                        <div className="text-success fw-bold">
                          RD$ {formatearMoneda(producto.precio_venta)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="row g-2">
                <div className="col-4">
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={cantidadProducto}
                    onChange={(e) => setCantidadProducto(e.target.value)}
                  />
                </div>

                <div className="col-8">
                  <button
                    type="button"
                    className="btn btn-success w-100"
                    disabled={!productoSeleccionado}
                    onClick={agregarProducto}
                  >
                    + Agregar producto
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ==========================================
          MODAL CERRAR CUENTA
      ========================================== */}

      {mostrarCerrar && (
        <div
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1200,
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Cerrar cuenta</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setMostrarCerrar(false)}
                  disabled={cerrandoCuenta}
                />
              </div>

              <div className="modal-body">
                <div className="d-flex justify-content-between mb-3">
                  <span className="text-muted">Cuenta</span>

                  <strong>
                    {cuentaSeleccionada?.nombre ||
                      `Cuenta #${cuentaSeleccionada?.id}`}
                  </strong>
                </div>

                <div className="d-flex justify-content-between mb-4">
                  <span className="fw-semibold">Total</span>

                  <span className="fs-4 fw-bold text-success">
                    RD${" "}
                    {formatearMoneda(
                      detalle.reduce(
                        (total, item) =>
                          total +
                          Number(item.cantidad || 0) * Number(item.precio || 0),
                        0,
                      ),
                    )}
                  </span>
                </div>

                <label className="form-label fw-semibold">Forma de pago</label>

                <select
                  className="form-select"
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                  disabled={cerrandoCuenta}
                >
                  <option value="EFECTIVO">Efectivo</option>

                  <option value="TARJETA">Tarjeta</option>

                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
                {propinaLeyHabilitada && (
                  <div className="form-check mt-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="propinaLey"
                      checked={propinaAplicada}
                      onChange={(e) => setPropinaAplicada(e.target.checked)}
                      disabled={cerrandoCuenta}
                    />

                    <label className="form-check-label" htmlFor="propinaLey">
                      Aplicar propina de ley (10%)
                    </label>
                  </div>
                )}
                <div className="mt-4 border-top pt-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <strong>RD$ {formatearMoneda(subtotalCuenta)}</strong>
                  </div>

                  {propinaAplicada && (
                    <div className="d-flex justify-content-between mb-2">
                      <span>Propina de ley (10%)</span>
                      <strong>RD$ {formatearMoneda(montoPropina)}</strong>
                    </div>
                  )}

                  <div className="d-flex justify-content-between fs-5 mt-3">
                    <strong>Total</strong>
                    <strong className="text-success">
                      RD$ {formatearMoneda(totalConPropina)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMostrarCerrar(false)}
                  disabled={cerrandoCuenta}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={cerrarCuenta}
                  disabled={cerrandoCuenta}
                >
                  {cerrandoCuenta ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Procesando...
                    </>
                  ) : (
                    "Confirmar y cobrar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL NUEVA CUENTA */}
      {mostrarModal && (
        <div
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={crearCuenta}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Nueva cuenta</h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={cerrarModalCuenta}
                  />
                </div>

                <div className="modal-body">
                  <label className="form-label fw-semibold">
                    Nombre de la cuenta
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Juan, María, Cuenta 1..."
                    value={nombreCuenta}
                    onChange={(e) => setNombreCuenta(e.target.value)}
                    autoFocus
                  />

                  <small className="text-muted">
                    Es opcional. Puedes dejarlo vacío.
                  </small>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cerrarModalCuenta}
                  >
                    Cancelar
                  </button>

                  <button type="submit" className="btn btn-success">
                    Crear cuenta
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MesaOrden;
