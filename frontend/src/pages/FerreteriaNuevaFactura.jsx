import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import api from "../services/api";

function FerreteriaNuevaFactura() {
  const navigate = useNavigate();

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  const [carrito, setCarrito] = useState([]);

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [descuento, setDescuento] = useState(0);

  const [formaPago, setFormaPago] = useState("EFECTIVO");

  const [itbisHabilitado, setItbisHabilitado] = useState(false);
  const [aplicarItbis, setAplicarItbis] = useState(false);

  const [nombreCliente, setNombreCliente] = useState("");
  const [nota, setNota] = useState("");

  const [procesando, setProcesando] = useState(false);

  // ==========================================
  // FORMATO DINERO
  // ==========================================

  const formatearDinero = (valor) =>
    Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ==========================================
  // CARGAR PRODUCTOS
  // ==========================================

  const cargarProductos = async (texto = "") => {
    try {
      const response = await api.get(
        `/ferreteria/productos?buscar=${encodeURIComponent(texto)}`,
      );

      setProductos(response.data || []);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.mensaje ||
          "No se pudieron cargar los productos.",
      });
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // CONFIGURACIÓN
  // ==========================================

  const cargarConfiguracion = async () => {
    try {
      const response = await api.get("/configuracion");

      setItbisHabilitado(response.data?.itbis_ley === true);
    } catch (error) {
      console.error("Error al obtener configuración:", error);
    }
  };

  useEffect(() => {
    cargarProductos();
    cargarConfiguracion();
  }, []);

  // ==========================================
  // BUSCAR
  // ==========================================

  useEffect(() => {
    const tiempo = setTimeout(() => {
      cargarProductos(busqueda);
    }, 300);

    return () => clearTimeout(tiempo);
  }, [busqueda]);

  // ==========================================
  // AGREGAR PRODUCTO
  // ==========================================

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      Swal.fire("Atención", "Seleccione un producto.", "warning");
      return;
    }

    const cantidadFinal = Number(cantidad);
    const descuentoFinal = Number(descuento || 0);

    if (!Number.isInteger(cantidadFinal) || cantidadFinal <= 0) {
      Swal.fire(
        "Atención",
        "La cantidad debe ser un número entero mayor que cero.",
        "warning",
      );
      return;
    }

    if (cantidadFinal > Number(productoSeleccionado.stock)) {
      Swal.fire(
        "Stock insuficiente",
        `Disponible: ${productoSeleccionado.stock}`,
        "warning",
      );
      return;
    }

    if (Number.isNaN(descuentoFinal) || descuentoFinal < 0) {
      Swal.fire("Atención", "El descuento no es válido.", "warning");
      return;
    }

    const existente = carrito.find(
      (item) => item.producto_id === productoSeleccionado.id,
    );

    if (existente) {
      const nuevaCantidad = existente.cantidad + cantidadFinal;

      if (nuevaCantidad > Number(productoSeleccionado.stock)) {
        Swal.fire(
          "Stock insuficiente",
          `Disponible: ${productoSeleccionado.stock}`,
          "warning",
        );
        return;
      }

      setCarrito((anterior) =>
        anterior.map((item) =>
          item.producto_id === productoSeleccionado.id
            ? {
                ...item,
                cantidad: nuevaCantidad,
                descuento: item.descuento + descuentoFinal,
              }
            : item,
        ),
      );
    } else {
      setCarrito((anterior) => [
        ...anterior,
        {
          producto_id: productoSeleccionado.id,
          codigo: productoSeleccionado.codigo,
          nombre: productoSeleccionado.nombre,
          costo_compra: Number(productoSeleccionado.costo_compra),
          precio: Number(productoSeleccionado.precio_venta),
          cantidad: cantidadFinal,
          descuento: descuentoFinal,
          stock: Number(productoSeleccionado.stock),
        },
      ]);
    }

    setProductoSeleccionado(null);
    setCantidad(1);
    setDescuento(0);
  };

  // ==========================================
  // ELIMINAR
  // ==========================================

  const eliminarProducto = (productoId) => {
    setCarrito((anterior) =>
      anterior.filter((item) => item.producto_id !== productoId),
    );
  };

  // ==========================================
  // TOTALES
  // ==========================================

  const subtotal = useMemo(() => {
    return carrito.reduce(
      (total, item) =>
        total + item.precio * item.cantidad - Number(item.descuento || 0),
      0,
    );
  }, [carrito]);

  const subtotalRedondeado =
    Math.round((subtotal + Number.EPSILON) * 100) / 100;

  const itbis = aplicarItbis
    ? Math.round((subtotalRedondeado * 0.18 + Number.EPSILON) * 100) / 100
    : 0;

  const total =
    Math.round((subtotalRedondeado + itbis + Number.EPSILON) * 100) / 100;

  // ==========================================
  // VALIDAR FACTURA
  // ==========================================

  const validarFactura = () => {
    if (carrito.length === 0) {
      Swal.fire("Atención", "Agregue al menos un producto.", "warning");

      return false;
    }

    return true;
  };

  // ==========================================
  // LIMPIAR FORMULARIO
  // ==========================================

  const limpiarFormulario = () => {
    setCarrito([]);
    setProductoSeleccionado(null);
    setCantidad(1);
    setDescuento(0);
    setAplicarItbis(false);
    setBusqueda("");
    setNombreCliente("");
    setNota("");
    setFormaPago("EFECTIVO");
  };

  // ==========================================
  // FACTURAR DIRECTAMENTE
  // ==========================================

  const facturar = async () => {
    if (!validarFactura()) {
      return;
    }

    try {
      setProcesando(true);

      const response = await api.post("/ferreteria/facturas", {
        productos: carrito.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          descuento: Number(item.descuento || 0),
        })),
        forma_pago: formaPago,
        itbis_aplicado: aplicarItbis,
      });

      const facturaId = response.data.factura_id;

      limpiarFormulario();

      const resultado = await Swal.fire({
        icon: "success",
        title: "Factura creada",
        html: `
          <div style="text-align:center">
            <div style="font-size:18px;margin-bottom:10px">
              Factura <strong>#${facturaId}</strong>
            </div>

            <div style="margin-bottom:5px">
              Subtotal:
              <strong>
                RD$ ${formatearDinero(response.data.subtotal)}
              </strong>
            </div>

            ${
              Number(response.data.itbis || 0) > 0
                ? `
                  <div style="margin-bottom:5px">
                    ITBIS:
                    <strong>
                      RD$ ${formatearDinero(response.data.itbis)}
                    </strong>
                  </div>
                `
                : ""
            }

            <div style="font-size:21px;margin-top:10px">
              Total:
              <strong>
                RD$ ${formatearDinero(response.data.total)}
              </strong>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "🖨️ Imprimir factura",
        cancelButtonText: "Aceptar",
        reverseButtons: true,
      });

      if (resultado.isConfirmed && facturaId) {
        navigate(`/imprimir-factura/${facturaId}`);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "No se pudo facturar",
        text:
          error.response?.data?.mensaje ||
          "Ocurrió un error al crear la factura.",
      });
    } finally {
      setProcesando(false);
    }
  };

  // ==========================================
  // GUARDAR COMO ABIERTA
  // ==========================================

  const guardarComoAbierta = async () => {
    if (!validarFactura()) {
      return;
    }

    const seleccionTipo = await Swal.fire({
      icon: "question",
      title: "Tipo de factura abierta",
      text: "Seleccione cómo desea clasificar esta factura.",
      input: "select",
      inputOptions: {
        PENDIENTE_PAGO: "🟡 Pendiente de pago",
        PENDIENTE_ENTREGA: "🔵 Pendiente de entrega",
        ABIERTA: "⚪ Abierta",
      },
      inputValue: "ABIERTA",
      inputPlaceholder: "Seleccione un tipo",
      showCancelButton: true,
      confirmButtonText: "Guardar factura",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value) {
          return "Seleccione un tipo de factura.";
        }
      },
    });

    if (!seleccionTipo.isConfirmed) {
      return;
    }

    try {
      setProcesando(true);

      const response = await api.post("/ferreteria-abiertas", {
        nombre_cliente: nombreCliente.trim() || null,
        nota: nota.trim() || null,
        productos: carrito.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          descuento: Number(item.descuento || 0),
        })),
        itbis_aplicado: aplicarItbis,
        tipo: seleccionTipo.value,
      });

      const facturaAbiertaId = response.data.factura?.id;

      limpiarFormulario();

      await Swal.fire({
        icon: "success",
        title: "Factura abierta guardada",
        html: `
          <div style="text-align:center">
            <div style="font-size:18px;margin-bottom:10px">
              Factura abierta
              <strong>#${facturaAbiertaId}</strong>
            </div>

            <div>
              Total:
              <strong>
                RD$ ${formatearDinero(response.data.factura?.total)}
              </strong>
            </div>
          </div>
        `,
        confirmButtonText: "Ver facturas abiertas",
      });

      navigate("/ferreteria/facturas-abiertas");
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text:
          error.response?.data?.mensaje ||
          "Ocurrió un error al guardar la factura abierta.",
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Nueva Factura</h2>

          <p className="text-muted mb-0">
            Facturación de productos de ferretería
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => navigate("/ferreteria/facturas-abiertas")}
        >
          📂 Facturas abiertas
        </button>
      </div>

      <div className="row g-4">
        {/* ==================================
            PRODUCTOS
        ================================== */}

        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Productos</h5>

              <div className="mb-3">
                <label className="form-label">Buscar producto</label>

                <input
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Buscar por código o nombre..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              {cargando ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-success" role="status" />

                  <div className="mt-2 text-muted">Cargando productos...</div>
                </div>
              ) : (
                <div
                  className="list-group"
                  style={{
                    maxHeight: "380px",
                    overflowY: "auto",
                  }}
                >
                  {productos.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      No se encontraron productos.
                    </div>
                  ) : (
                    productos.map((producto) => (
                      <button
                        key={producto.id}
                        type="button"
                        className={`list-group-item list-group-item-action ${
                          productoSeleccionado?.id === producto.id
                            ? "active"
                            : ""
                        }`}
                        onClick={() => setProductoSeleccionado(producto)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="text-start">
                            <div className="fw-bold">{producto.nombre}</div>

                            <small>
                              Código: {producto.codigo || "Sin código"}
                            </small>
                          </div>

                          <div className="text-end">
                            <div className="fw-bold">
                              RD$ {formatearDinero(producto.precio_venta)}
                            </div>

                            <small>Stock: {producto.stock}</small>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {productoSeleccionado && (
                <div className="border rounded p-3 mt-3">
                  <h6 className="mb-3">Producto seleccionado</h6>

                  <div className="mb-3">
                    <strong>{productoSeleccionado.nombre}</strong>

                    <div className="text-muted">
                      Código: {productoSeleccionado.codigo || "Sin código"}
                    </div>

                    <div className="text-success fw-bold mt-1">
                      Precio: RD${" "}
                      {formatearDinero(productoSeleccionado.precio_venta)}
                    </div>

                    <div className="text-muted">
                      Disponible: {productoSeleccionado.stock}
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Cantidad</label>

                      <input
                        type="number"
                        min="1"
                        max={productoSeleccionado.stock}
                        className="form-control"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Descuento</label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={descuento}
                        onChange={(e) => setDescuento(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-success w-100 mt-3"
                    onClick={agregarProducto}
                  >
                    ➕ Agregar al detalle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================================
            FACTURA
        ================================== */}

        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Detalle de factura</h5>

              {carrito.length === 0 ? (
                <div className="text-center text-muted py-5">
                  No hay productos agregados.
                </div>
              ) : (
                <div
                  className="table-responsive"
                  style={{
                    maxHeight: "340px",
                    overflowY: "auto",
                  }}
                >
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="text-center">Cant.</th>
                        <th className="text-end">Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {carrito.map((item) => (
                        <tr key={item.producto_id}>
                          <td>
                            <div className="fw-semibold">{item.nombre}</div>

                            <small className="text-muted">
                              RD$ {formatearDinero(item.precio)}
                            </small>

                            {Number(item.descuento) > 0 && (
                              <small className="d-block text-danger">
                                Desc.: RD$ {formatearDinero(item.descuento)}
                              </small>
                            )}
                          </td>

                          <td className="text-center">{item.cantidad}</td>

                          <td className="text-end fw-semibold">
                            RD${" "}
                            {formatearDinero(
                              item.precio * item.cantidad -
                                Number(item.descuento || 0),
                            )}
                          </td>

                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => eliminarProducto(item.producto_id)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <hr />

              {/* CLIENTE / REFERENCIA */}

              <div className="mb-3">
                <label className="form-label">Cliente / Referencia</label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Juan Pérez / Constructor X"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                />
              </div>

              {/* NOTA */}

              <div className="mb-3">
                <label className="form-label">Nota</label>

                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Observaciones de la factura..."
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
              </div>

              {/* FORMA DE PAGO */}

              <div className="mb-3">
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

              {/* ITBIS */}

              {itbisHabilitado && (
                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="itbisFerreteria"
                    checked={aplicarItbis}
                    onChange={(e) => setAplicarItbis(e.target.checked)}
                  />

                  <label className="form-check-label" htmlFor="itbisFerreteria">
                    Aplicar ITBIS (18%)
                  </label>
                </div>
              )}

              {/* TOTALES */}

              <div className="border rounded p-3 bg-light">
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal</span>

                  <strong>RD$ {formatearDinero(subtotalRedondeado)}</strong>
                </div>

                {aplicarItbis && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>ITBIS</span>

                    <strong>RD$ {formatearDinero(itbis)}</strong>
                  </div>
                )}

                <hr />

                <div className="d-flex justify-content-between">
                  <span className="fw-bold">TOTAL</span>

                  <span className="fw-bold fs-4 text-success">
                    RD$ {formatearDinero(total)}
                  </span>
                </div>
              </div>

              {/* BOTONES */}

              <div className="d-grid gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-lg"
                  onClick={guardarComoAbierta}
                  disabled={procesando || carrito.length === 0}
                >
                  📂 Guardar como abierta
                </button>

                <button
                  type="button"
                  className="btn btn-success btn-lg"
                  onClick={facturar}
                  disabled={procesando || carrito.length === 0}
                >
                  {procesando ? "Procesando..." : "🧾 Facturar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FerreteriaNuevaFactura;
