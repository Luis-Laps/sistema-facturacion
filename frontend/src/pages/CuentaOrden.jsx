import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../services/api";

function CuentaOrden() {
  const { mesaId } = useParams();
  const navigate = useNavigate();

  const [mesa, setMesa] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [mostrarNuevaCuenta, setMostrarNuevaCuenta] = useState(false);
  const [nombreCuenta, setNombreCuenta] = useState("");

  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [productos, setProductos] = useState([]);
  const [buscarProducto, setBuscarProducto] = useState("");

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const [cantidad, setCantidad] = useState(1);

  const [mostrarCerrar, setMostrarCerrar] = useState(false);

  const [formaPago, setFormaPago] = useState("EFECTIVO");

  const [propinaLey, setPropinaLey] = useState(false);
  const [propinaAplicada, setPropinaAplicada] = useState(false);

  const [cerrandoCuenta, setCerrandoCuenta] = useState(false);

  // ==========================================
  // FORMATO MONEDA
  // ==========================================

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ==========================================
  // CARGAR MESA
  // ==========================================

  const cargarMesa = async () => {
    try {
      setCargando(true);

      const response = await api.get(`/control-orden/mesas/${mesaId}`);

      setMesa(response.data.mesa);
      setCuentas(response.data.cuentas || []);
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
  // CARGAR CONFIGURACIÓN
  // ==========================================

  const cargarConfiguracion = async () => {
    try {
      const response = await api.get("/configuracion");

      setPropinaLey(response.data?.propina_ley === true);
    } catch (error) {
      console.error("Error al cargar configuración:", error);
    }
  };

  // ==========================================
  // INICIO
  // ==========================================

  useEffect(() => {
    cargarMesa();
    cargarConfiguracion();
  }, [mesaId]);

  // ==========================================
  // CREAR CUENTA
  // ==========================================

  const crearCuenta = async (e) => {
    e.preventDefault();

    const nombre = nombreCuenta.trim();

    if (!nombre) {
      Swal.fire({
        icon: "warning",
        title: "Nombre requerido",
        text: "Escribe el nombre de la cuenta.",
      });

      return;
    }

    try {
      await api.post(`/control-orden/mesas/${mesaId}/cuentas`, {
        nombre,
      });

      setNombreCuenta("");
      setMostrarNuevaCuenta(false);

      await cargarMesa();

      Swal.fire({
        icon: "success",
        title: "Cuenta creada",
        text: "La cuenta fue creada correctamente.",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error al crear cuenta:", error);

      Swal.fire({
        icon: "error",
        title: "No se pudo crear",
        text:
          error.response?.data?.mensaje ||
          "Ocurrió un error al crear la cuenta.",
      });
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
  // CERRAR PANEL DE CUENTA
  // ==========================================

  const cerrarCuentaPanel = () => {
    setCuentaSeleccionada(null);
    setDetalle([]);
    setBuscarProducto("");
    setProductoSeleccionado(null);
    setCantidad(1);
  };

  // ==========================================
  // BUSCAR PRODUCTOS
  // ==========================================

  const cargarProductos = async (buscar = "") => {
    try {
      const response = await api.get(
        `/productos?limit=100&buscar=${encodeURIComponent(buscar)}`,
      );

      setProductos(response.data.data || []);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  useEffect(() => {
    if (cuentaSeleccionada) {
      cargarProductos("");
    }
  }, [cuentaSeleccionada]);

  // ==========================================
  // AGREGAR PRODUCTO
  // ==========================================

  const agregarProducto = async () => {
    if (!productoSeleccionado) {
      Swal.fire({
        icon: "warning",
        title: "Producto requerido",
        text: "Selecciona un producto.",
      });

      return;
    }

    if (Number(cantidad) <= 0) {
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
          cantidad: Number(cantidad),
          precio: Number(productoSeleccionado.precio_venta),
          descuento: 0,
        },
      );

      setProductoSeleccionado(null);
      setCantidad(1);
      setBuscarProducto("");

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
  // ELIMINAR PRODUCTO
  // ==========================================

  const eliminarDetalle = async (detalleId) => {
    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar producto?",
      text: "El producto será eliminado de esta cuenta.",
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
    } catch (error) {
      console.error("Error al eliminar producto:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.mensaje || "No se pudo eliminar el producto.",
      });
    }
  };

  // ==========================================
  // CALCULAR SUBTOTAL
  // ==========================================

  const calcularSubtotal = () => {
    return detalle.reduce((total, item) => {
      const subtotalItem =
        Number(item.cantidad) * Number(item.precio) -
        Number(item.descuento || 0);

      return total + subtotalItem;
    }, 0);
  };

  const subtotal = calcularSubtotal();

  // ==========================================
  // PROPINA
  // ==========================================

  const propina = propinaAplicada ? Math.round(subtotal * 0.1 * 100) / 100 : 0;

  const totalConPropina = subtotal + propina;

  // ==========================================
  // ABRIR MODAL CERRAR
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
          propina_aplicada: propinaLey && propinaAplicada,
        },
      );

      setMostrarCerrar(false);
      setCuentaSeleccionada(null);
      setDetalle([]);

      await cargarMesa();

      Swal.fire({
        icon: "success",
        title: "Cuenta cerrada",
        html: `
          <div style="text-align:center">
            <div style="font-size:16px;margin-bottom:8px">
              Factura #${response.data.factura_id}
            </div>

            <div>
              Subtotal:
              <strong>
                RD$ ${formatoMoneda(response.data.subtotal)}
              </strong>
            </div>

            <div>
              Propina:
              <strong>
                RD$ ${formatoMoneda(response.data.propina)}
              </strong>
            </div>

            <div style="font-size:20px;margin-top:8px">
              Total:
              <strong>
                RD$ ${formatoMoneda(response.data.total)}
              </strong>
            </div>
          </div>
        `,
        confirmButtonText: "Aceptar",
      });
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

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status" />

          <p className="text-muted mt-3">Cargando mesa...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MESA NO ENCONTRADA
  // ==========================================

  if (!mesa) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-danger">Mesa no encontrada.</div>
      </div>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="container-fluid px-4 py-4">
      {/* ======================================
          ENCABEZADO
      ====================================== */}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button
            className="btn btn-outline-secondary mb-3"
            onClick={() => navigate("/control-orden")}
          >
            ← Volver
          </button>

          <h2 className="fw-bold mb-1">{mesa.nombre}</h2>

          <p className="text-muted mb-0">
            Administra las cuentas de esta mesa.
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={() => setMostrarNuevaCuenta(true)}
        >
          + Nueva cuenta
        </button>
      </div>

      {/* ======================================
          CUENTAS
      ====================================== */}

      {cuentas.length === 0 ? (
        <div
          className="text-center py-5"
          style={{
            border: "2px dashed #dee2e6",
            borderRadius: "18px",
            backgroundColor: "#fafafa",
          }}
        >
          <div
            style={{
              fontSize: "55px",
            }}
          >
            👥
          </div>

          <h4 className="fw-bold mt-3">No hay cuentas abiertas</h4>

          <p className="text-muted">
            Crea una cuenta para comenzar a registrar productos.
          </p>

          <button
            className="btn btn-success"
            onClick={() => setMostrarNuevaCuenta(true)}
          >
            + Crear cuenta
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {cuentas.map((cuenta) => (
            <div className="col-12 col-md-6 col-lg-4" key={cuenta.id}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="fw-bold mb-1">👤 {cuenta.nombre}</h5>

                      <small className="text-muted">Cuenta #{cuenta.id}</small>
                    </div>

                    <span className="badge bg-success">ABIERTA</span>
                  </div>
                </div>

                <div className="card-body">
                  <small className="text-muted">Subtotal actual</small>

                  <div className="fs-3 fw-bold text-success">
                    RD$ {formatoMoneda(cuenta.subtotal)}
                  </div>
                </div>

                <div className="card-footer bg-white border-0 p-3">
                  <button
                    className="btn btn-primary w-100"
                    onClick={() => abrirCuenta(cuenta)}
                  >
                    Abrir cuenta
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================
          PANEL DE CUENTA
      ====================================== */}

      {cuentaSeleccionada && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            backgroundColor: "rgba(0,0,0,0.45)",
            zIndex: 1050,
          }}
        >
          <div
            className="position-absolute top-0 end-0 h-100 bg-white shadow"
            style={{
              width: "min(650px, 100%)",
              overflowY: "auto",
            }}
          >
            {/* HEADER */}

            <div className="p-4 border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="fw-bold mb-1">{cuentaSeleccionada.nombre}</h4>

                  <small className="text-muted">
                    {mesa.nombre} · Cuenta #{cuentaSeleccionada.id}
                  </small>
                </div>

                <button className="btn-close" onClick={cerrarCuentaPanel} />
              </div>
            </div>

            {/* PRODUCTOS */}

            <div className="p-4">
              <h5 className="fw-bold mb-3">Agregar producto</h5>

              <div className="input-group mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar producto..."
                  value={buscarProducto}
                  onChange={(e) => {
                    const valor = e.target.value;

                    setBuscarProducto(valor);
                    cargarProductos(valor);
                  }}
                />
              </div>

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

                        <small className="text-muted">{producto.codigo}</small>

                        <div className="text-success fw-bold">
                          RD$ {formatoMoneda(producto.precio_venta)}
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
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                </div>

                <div className="col-8">
                  <button
                    className="btn btn-success w-100"
                    disabled={!productoSeleccionado}
                    onClick={agregarProducto}
                  >
                    + Agregar producto
                  </button>
                </div>
              </div>
            </div>

            {/* DETALLE */}

            <div className="px-4">
              <h5 className="fw-bold mb-3">Productos de la cuenta</h5>

              {cargandoDetalle ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-success" />
                </div>
              ) : detalle.length === 0 ? (
                <div className="text-center text-muted py-4">
                  No hay productos agregados.
                </div>
              ) : (
                <div className="list-group">
                  {detalle.map((item) => {
                    const subtotalItem =
                      Number(item.cantidad) * Number(item.precio) -
                      Number(item.descuento || 0);

                    return (
                      <div className="list-group-item px-0" key={item.id}>
                        <div className="d-flex justify-content-between">
                          <div>
                            <div className="fw-semibold">
                              {item.producto_nombre}
                            </div>

                            <small className="text-muted">
                              {item.cantidad} × RD$ {formatoMoneda(item.precio)}
                            </small>
                          </div>

                          <div className="text-end">
                            <div className="fw-bold">
                              RD$ {formatoMoneda(subtotalItem)}
                            </div>

                            <button
                              className="btn btn-sm btn-outline-danger mt-1"
                              onClick={() => eliminarDetalle(item.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TOTALES */}

            <div className="p-4 mt-3 border-top">
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <strong>RD$ {formatoMoneda(subtotal)}</strong>
              </div>

              <div className="d-flex justify-content-between mb-3">
                <span>Propina de ley</span>
                <strong>RD$ {formatoMoneda(propina)}</strong>
              </div>

              <div className="d-flex justify-content-between">
                <span className="fs-5 fw-bold">Total</span>

                <span className="fs-4 fw-bold text-success">
                  RD$ {formatoMoneda(totalConPropina)}
                </span>
              </div>

              <button
                className="btn btn-success btn-lg w-100 mt-4"
                onClick={abrirModalCerrar}
              >
                Cerrar cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          MODAL NUEVA CUENTA
      ====================================== */}

      {mostrarNuevaCuenta && (
        <div
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1100,
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
                    onClick={() => setMostrarNuevaCuenta(false)}
                  />
                </div>

                <div className="modal-body">
                  <label className="form-label fw-semibold">
                    Nombre de la cuenta
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Juan, María, Pedro..."
                    value={nombreCuenta}
                    onChange={(e) => setNombreCuenta(e.target.value)}
                    autoFocus
                  />

                  <small className="text-muted">
                    Puedes usar el nombre del cliente o cualquier referencia.
                  </small>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setMostrarNuevaCuenta(false)}
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

      {/* ======================================
          MODAL CERRAR CUENTA
      ====================================== */}

      {mostrarCerrar && (
        <div
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
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
                />
              </div>

              <div className="modal-body">
                {/* RESUMEN */}

                <div
                  className="p-3 rounded mb-4"
                  style={{
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>

                    <strong>RD$ {formatoMoneda(subtotal)}</strong>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span>Propina</span>

                    <strong>RD$ {formatoMoneda(propina)}</strong>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between">
                    <span className="fw-bold">Total</span>

                    <span className="fs-4 fw-bold text-success">
                      RD$ {formatoMoneda(totalConPropina)}
                    </span>
                  </div>
                </div>

                {/* PROPINA */}

                {propinaLey && (
                  <div className="form-check p-3 bg-light rounded mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="propinaLey"
                      checked={propinaAplicada}
                      onChange={(e) => setPropinaAplicada(e.target.checked)}
                    />

                    <label
                      className="form-check-label fw-semibold"
                      htmlFor="propinaLey"
                    >
                      Aplicar propina de ley (10%)
                    </label>

                    <div className="small text-muted mt-1">
                      Se agregará el 10% al subtotal.
                    </div>
                  </div>
                )}

                {/* FORMA DE PAGO */}

                <label className="form-label fw-semibold">Forma de pago</label>

                <select
                  className="form-select"
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                >
                  <option value="EFECTIVO">💵 Efectivo</option>

                  <option value="TARJETA">💳 Tarjeta</option>

                  <option value="TRANSFERENCIA">🏦 Transferencia</option>
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={cerrandoCuenta}
                  onClick={() => setMostrarCerrar(false)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  disabled={cerrandoCuenta}
                  onClick={cerrarCuenta}
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
    </div>
  );
}

export default CuentaOrden;
