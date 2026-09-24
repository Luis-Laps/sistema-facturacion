import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import api from "../services/api";

function FerreteriaFacturaAbierta() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [factura, setFactura] = useState(null);
  const [detalle, setDetalle] = useState([]);

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [descuentoProducto, setDescuentoProducto] = useState(0);

  const [nombreCliente, setNombreCliente] = useState("");
  const [nota, setNota] = useState("");

  // Tipo de factura abierta:
  // ABIERTA | PENDIENTE_PAGO | PENDIENTE_ENTREGA
  const [tipoFactura, setTipoFactura] = useState("ABIERTA");

  const [aplicarItbis, setAplicarItbis] = useState(false);
  const [itbisHabilitado, setItbisHabilitado] = useState(false);

  const [formaPago, setFormaPago] = useState("EFECTIVO");

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const dinero = (valor) =>
    Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const cargarFactura = async () => {
    try {
      setCargando(true);

      const response = await api.get(`/ferreteria-abiertas/${id}`);

      setFactura(response.data.factura);
      setDetalle(
        (response.data.detalle || []).map((item) => ({
          id: item.id,
          producto_id: item.producto_id,
          codigo: item.codigo,
          nombre: item.nombre,
          cantidad: Number(item.cantidad),
          precio: Number(item.precio),
          descuento: Number(item.descuento || 0),
          stock: Number(item.stock),
          costo_compra: Number(item.costo_compra || 0),
        })),
      );

      setNombreCliente(response.data.factura?.nombre_cliente || "");

      setNota(response.data.factura?.nota || "");

      setTipoFactura(response.data.factura?.tipo || "ABIERTA");

      setAplicarItbis(response.data.factura?.itbis_aplicado === true);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "No se pudo cargar",
        text:
          error.response?.data?.mensaje ||
          "No se pudo obtener la factura abierta.",
      }).then(() => {
        navigate("/ferreteria/facturas-abiertas");
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarConfiguracion = async () => {
    try {
      const response = await api.get("/configuracion");
      setItbisHabilitado(response.data?.itbis_ley === true);
    } catch (error) {
      console.error(error);
    }
  };

  const cargarProductos = async (texto = "") => {
    try {
      const response = await api.get(
        `/ferreteria/productos?buscar=${encodeURIComponent(texto)}`,
      );

      setProductos(response.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarFactura();
    cargarConfiguracion();
    cargarProductos();
  }, [id]);

  useEffect(() => {
    const tiempo = setTimeout(() => {
      cargarProductos(busqueda);
    }, 300);

    return () => clearTimeout(tiempo);
  }, [busqueda]);

  const subtotal = useMemo(() => {
    return detalle.reduce(
      (total, item) =>
        total +
        Number(item.precio) * Number(item.cantidad) -
        Number(item.descuento || 0),
      0,
    );
  }, [detalle]);

  const subtotalRedondeado =
    Math.round((subtotal + Number.EPSILON) * 100) / 100;

  const itbis = aplicarItbis
    ? Math.round((subtotalRedondeado * 0.18 + Number.EPSILON) * 100) / 100
    : 0;

  const total =
    Math.round((subtotalRedondeado + itbis + Number.EPSILON) * 100) / 100;

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      Swal.fire("Atención", "Seleccione un producto.", "warning");
      return;
    }

    const cantidad = Number(cantidadProducto);
    const descuento = Number(descuentoProducto || 0);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      Swal.fire(
        "Atención",
        "La cantidad debe ser un número entero mayor que cero.",
        "warning",
      );
      return;
    }

    if (Number.isNaN(descuento) || descuento < 0) {
      Swal.fire("Atención", "El descuento no es válido.", "warning");
      return;
    }

    const existente = detalle.find(
      (item) => item.producto_id === productoSeleccionado.id,
    );

    const nuevaCantidad = existente ? existente.cantidad + cantidad : cantidad;

    if (nuevaCantidad > Number(productoSeleccionado.stock)) {
      Swal.fire(
        "Stock insuficiente",
        `Disponible: ${productoSeleccionado.stock}`,
        "warning",
      );
      return;
    }

    if (existente) {
      setDetalle((anterior) =>
        anterior.map((item) =>
          item.producto_id === productoSeleccionado.id
            ? {
                ...item,
                cantidad: nuevaCantidad,
                descuento: item.descuento + descuento,
              }
            : item,
        ),
      );
    } else {
      setDetalle((anterior) => [
        ...anterior,
        {
          id: `nuevo-${productoSeleccionado.id}-${Date.now()}`,
          producto_id: productoSeleccionado.id,
          codigo: productoSeleccionado.codigo,
          nombre: productoSeleccionado.nombre,
          cantidad,
          precio: Number(productoSeleccionado.precio_venta),
          descuento,
          stock: Number(productoSeleccionado.stock),
          costo_compra: Number(productoSeleccionado.costo_compra || 0),
        },
      ]);
    }

    setProductoSeleccionado(null);
    setCantidadProducto(1);
    setDescuentoProducto(0);
  };

  const eliminarProducto = async (item) => {
    const confirmar = await Swal.fire({
      icon: "warning",
      title: "Eliminar producto",
      text: `¿Desea eliminar "${item.nombre}" de la factura?`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!confirmar.isConfirmed) {
      return;
    }

    setDetalle((anterior) =>
      anterior.filter((producto) => producto.producto_id !== item.producto_id),
    );
  };

  const cambiarCantidad = (productoId, valor) => {
    const cantidad = Number(valor);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return;
    }

    setDetalle((anterior) =>
      anterior.map((item) =>
        item.producto_id === productoId
          ? {
              ...item,
              cantidad,
            }
          : item,
      ),
    );
  };

  const cambiarDescuento = (productoId, valor) => {
    const descuento = Number(valor);

    if (Number.isNaN(descuento) || descuento < 0) {
      return;
    }

    setDetalle((anterior) =>
      anterior.map((item) =>
        item.producto_id === productoId
          ? {
              ...item,
              descuento,
            }
          : item,
      ),
    );
  };

  const guardarCambios = async () => {
    if (!detalle.length) {
      Swal.fire(
        "Atención",
        "La factura debe contener al menos un producto.",
        "warning",
      );
      return;
    }

    try {
      setProcesando(true);

      const response = await api.put(`/ferreteria-abiertas/${id}`, {
        nombre_cliente: nombreCliente.trim() || null,
        nota: nota.trim() || null,
        tipo: tipoFactura,
        itbis_aplicado: aplicarItbis,
        productos: detalle.map((item) => ({
          producto_id: item.producto_id,
          cantidad: Number(item.cantidad),
          descuento: Number(item.descuento || 0),
        })),
      });

      setFactura(response.data.factura);

      await Swal.fire({
        icon: "success",
        title: "Cambios guardados",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "No se pudieron guardar los cambios",
        text:
          error.response?.data?.mensaje ||
          "Ocurrió un error al actualizar la factura.",
      });
    } finally {
      setProcesando(false);
    }
  };

  const cobrarFactura = async () => {
    if (!detalle.length) {
      Swal.fire(
        "Atención",
        "La factura debe contener al menos un producto.",
        "warning",
      );
      return;
    }

    const confirmar = await Swal.fire({
      icon: "question",
      title: "Cobrar factura",
      html: `
        <div style="text-align:center">
          <div style="font-size:16px;margin-bottom:8px">
            Factura abierta #${id}
          </div>
          <div style="font-size:24px;font-weight:bold">
            RD$ ${dinero(total)}
          </div>
          <div style="margin-top:8px">
            Forma de pago: <strong>${formaPago}</strong>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Cobrar factura",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!confirmar.isConfirmed) {
      return;
    }

    try {
      setProcesando(true);

      // Primero guardamos cualquier modificación pendiente.
      await api.put(`/ferreteria-abiertas/${id}`, {
        nombre_cliente: nombreCliente.trim() || null,
        nota: nota.trim() || null,
        tipo: tipoFactura,
        itbis_aplicado: aplicarItbis,
        productos: detalle.map((item) => ({
          producto_id: item.producto_id,
          cantidad: Number(item.cantidad),
          descuento: Number(item.descuento || 0),
        })),
      });

      const response = await api.post(`/ferreteria-abiertas/${id}/cerrar`, {
        forma_pago: formaPago,
      });

      const facturaId = response.data.factura_id;

      const resultado = await Swal.fire({
        icon: "success",
        title: "Factura cobrada",
        html: `
          <div style="text-align:center">
            <div style="font-size:18px;margin-bottom:10px">
              Factura <strong>#${facturaId}</strong>
            </div>

            <div style="margin-bottom:5px">
              Subtotal:
              <strong>
                RD$ ${dinero(response.data.subtotal)}
              </strong>
            </div>

            ${
              Number(response.data.itbis || 0) > 0
                ? `
                  <div style="margin-bottom:5px">
                    ITBIS:
                    <strong>
                      RD$ ${dinero(response.data.itbis)}
                    </strong>
                  </div>
                `
                : ""
            }

            <div style="font-size:22px;margin-top:10px">
              Total:
              <strong>
                RD$ ${dinero(response.data.total)}
              </strong>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "🖨️ Imprimir factura",
        cancelButtonText: "Volver a facturas abiertas",
        reverseButtons: true,
      });

      if (resultado.isConfirmed && facturaId) {
        navigate(`/imprimir-factura/${facturaId}`);
      } else {
        navigate("/ferreteria/facturas-abiertas");
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "No se pudo cobrar",
        text:
          error.response?.data?.mensaje ||
          "Ocurrió un error al cobrar la factura.",
      });
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return (
      <div className="container-fluid px-4 py-5 text-center">
        <div className="spinner-border text-success" role="status" />
        <p className="text-muted mt-3">Cargando factura abierta...</p>
      </div>
    );
  }

  if (!factura) {
    return null;
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Factura Abierta #{factura.id}</h2>

          <p className="text-muted mb-0">
            Modificar la venta antes de cobrarla
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => navigate("/ferreteria/facturas-abiertas")}
        >
          ← Volver
        </button>
      </div>

      <div className="row g-4">
        {/* ==================================
            PRODUCTOS
        ================================== */}

        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Agregar productos</h5>

              <input
                type="text"
                className="form-control form-control-lg mb-3"
                placeholder="Buscar por código o nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />

              <div
                className="list-group mb-3"
                style={{
                  maxHeight: "260px",
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
                        productoSeleccionado?.id === producto.id ? "active" : ""
                      }`}
                      onClick={() => setProductoSeleccionado(producto)}
                    >
                      <div className="d-flex justify-content-between">
                        <div className="text-start">
                          <strong>{producto.nombre}</strong>
                          <div>
                            <small>
                              Código: {producto.codigo || "Sin código"}
                            </small>
                          </div>
                        </div>

                        <div className="text-end">
                          <strong>RD$ {dinero(producto.precio_venta)}</strong>
                          <div>
                            <small>Stock: {producto.stock}</small>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {productoSeleccionado && (
                <div className="border rounded p-3">
                  <h6>Producto seleccionado</h6>

                  <strong>{productoSeleccionado.nombre}</strong>

                  <div className="text-muted mb-3">
                    Stock disponible: {productoSeleccionado.stock}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Cantidad</label>

                      <input
                        type="number"
                        min="1"
                        max={productoSeleccionado.stock}
                        className="form-control"
                        value={cantidadProducto}
                        onChange={(e) => setCantidadProducto(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Descuento</label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        value={descuentoProducto}
                        onChange={(e) => setDescuentoProducto(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-success w-100 mt-3"
                    onClick={agregarProducto}
                  >
                    ➕ Agregar producto
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ==================================
              DETALLE ACTUAL
          ================================== */}

          <div className="card shadow-sm mt-4">
            <div className="card-body">
              <h5 className="mb-3">Productos de la factura</h5>

              {detalle.length === 0 ? (
                <div className="text-center text-muted py-4">
                  No hay productos.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th style={{ width: "110px" }}>Cant.</th>
                        <th style={{ width: "150px" }}>Descuento</th>
                        <th className="text-end">Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {detalle.map((item) => (
                        <tr key={`${item.producto_id}`}>
                          <td>
                            <div className="fw-semibold">{item.nombre}</div>

                            <small className="text-muted">
                              RD$ {dinero(item.precio)}
                            </small>
                          </td>

                          <td>
                            <input
                              type="number"
                              min="1"
                              className="form-control form-control-sm"
                              value={item.cantidad}
                              onChange={(e) =>
                                cambiarCantidad(
                                  item.producto_id,
                                  e.target.value,
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={item.descuento}
                              onChange={(e) =>
                                cambiarDescuento(
                                  item.producto_id,
                                  e.target.value,
                                )
                              }
                            />
                          </td>

                          <td className="text-end fw-semibold">
                            RD${" "}
                            {dinero(
                              item.precio * item.cantidad -
                                Number(item.descuento || 0),
                            )}
                          </td>

                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => eliminarProducto(item)}
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
            </div>
          </div>
        </div>

        {/* ==================================
            INFORMACIÓN Y COBRO
        ================================== */}

        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">Información</h5>

              <div className="mb-3">
                <label className="form-label">Cliente / Referencia</label>

                <input
                  type="text"
                  className="form-control"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Nota</label>

                <textarea
                  rows="3"
                  className="form-control"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Tipo de factura abierta</label>

                <select
                  className="form-select"
                  value={tipoFactura}
                  onChange={(e) => setTipoFactura(e.target.value)}
                  disabled={procesando}
                >
                  <option value="PENDIENTE_PAGO">🟡 Pendiente de pago</option>
                  <option value="PENDIENTE_ENTREGA">
                    🔵 Pendiente de entrega
                  </option>
                  <option value="ABIERTA">⚪ Abierta</option>
                </select>

                <small className="text-muted">
                  Puedes cambiar el tipo mientras la factura permanezca abierta.
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label">Forma de pago</label>

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

              {itbisHabilitado && (
                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="itbisAbierta"
                    checked={aplicarItbis}
                    onChange={(e) => setAplicarItbis(e.target.checked)}
                  />

                  <label className="form-check-label" htmlFor="itbisAbierta">
                    Aplicar ITBIS (18%)
                  </label>
                </div>
              )}

              <div className="border rounded p-3 bg-light">
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal</span>

                  <strong>RD$ {dinero(subtotalRedondeado)}</strong>
                </div>

                {aplicarItbis && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>ITBIS</span>

                    <strong>RD$ {dinero(itbis)}</strong>
                  </div>
                )}

                <hr />

                <div className="d-flex justify-content-between">
                  <span className="fw-bold">TOTAL</span>

                  <span className="fw-bold fs-4 text-success">
                    RD$ {dinero(total)}
                  </span>
                </div>
              </div>

              <div className="d-grid gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-lg"
                  onClick={guardarCambios}
                  disabled={procesando}
                >
                  💾 Guardar cambios
                </button>

                <button
                  type="button"
                  className="btn btn-success btn-lg"
                  onClick={cobrarFactura}
                  disabled={procesando || detalle.length === 0}
                >
                  {procesando ? "Procesando..." : "💰 Cobrar factura"}
                </button>
              </div>

              <div className="alert alert-warning mt-3 mb-0">
                <strong>Importante:</strong> el inventario y la caja solo se
                actualizan al cobrar la factura.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FerreteriaFacturaAbierta;
