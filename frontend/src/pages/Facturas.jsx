import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

function Facturas() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const navigate = useNavigate();

  const [clienteId, setClienteId] = useState("");

  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState("");
  const [descuento, setDescuento] = useState(0);

  const [formaPago, setFormaPago] = useState("EFECTIVO");

  const [detalle, setDetalle] = useState([]);
  const [mostrarModalServicio, setMostrarModalServicio] = useState(false);

  const [servicio, setServicio] = useState({
    descripcion: "",
    costo: "",
    precio: "",
    cantidad: 1,
    descuento: 0,
  });

  const cargarDatos = async () => {
    try {
      const clientesRes = await api.get("/clientes");

      // Traemos todos los productos para facturar
      const productosRes = await api.get("/productos?page=1&limit=10000");

      setClientes(clientesRes.data);
      setProductos(productosRes.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const agregarProducto = () => {
    if (!productoId) {
      alert("Seleccione un producto");
      return;
    }

    if (Number(cantidad) <= 0) {
      alert("La cantidad debe ser mayor que cero");
      return;
    }

    if (Number(precio) <= 0) {
      alert("Ingrese un precio válido");
      return;
    }

    const producto = productos.find((p) => p.id === Number(productoId));

    if (!producto) return;

    const item = {
      tipo: "PRODUCTO",
      producto_id: producto.id,
      descripcion: producto.nombre,
      costo: Number(producto.costo_compra),
      precio: Number(precio), // ← usa el precio ingresado
      cantidad: Number(cantidad),
      descuento: Number(descuento || 0),
    };

    setDetalle((anterior) => [...anterior, item]);

    // Limpiar formulario
    setProductoId("");
    setCantidad(1);
    setPrecio("");
    setDescuento(0);
  };

  const agregarServicio = () => {
    if (!servicio.descripcion.trim()) {
      alert("Debe escribir una descripción del servicio.");
      return;
    }

    if (!servicio.precio || Number(servicio.precio) <= 0) {
      alert("Debe indicar el precio del servicio.");
      return;
    }

    const item = {
      tipo: "SERVICIO",
      producto_id: null,
      descripcion: servicio.descripcion,
      costo: Number(servicio.costo),
      precio: Number(servicio.precio),
      cantidad: Number(servicio.cantidad),
      descuento: Number(servicio.descuento),
    };

    setDetalle([...detalle, item]);

    setServicio({
      descripcion: "",
      costo: "",
      precio: "",
      cantidad: 1,
      descuento: 0,
    });

    setMostrarModalServicio(false);
  };
  const eliminarItem = (index) => {
    setDetalle(detalle.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return detalle.reduce((total, item) => {
      return total + item.precio * item.cantidad - item.descuento;
    }, 0);
  };

  const facturar = async () => {
    try {
      if (!clienteId) {
        alert("Seleccione un cliente");
        return;
      }

      if (detalle.length === 0) {
        alert("Agregue productos");
        return;
      }

      const response = await api.post("/facturas", {
        cliente_id: Number(clienteId),
        forma_pago: formaPago,

        productos: detalle.map((item) => ({
          tipo: item.tipo,
          producto_id: item.producto_id,
          descripcion: item.descripcion,
          costo: item.costo,
          precio: item.precio,
          cantidad: item.cantidad,
          descuento: item.descuento,
        })),
      });

      const facturaId = response.data.factura_id;

      setClienteId("");
      setDetalle([]);

      const imprimir = window.confirm(
        `Factura #${facturaId} creada correctamente.\n\n¿Desea imprimirla ahora?`,
      );

      if (imprimir) {
        navigate(`/imprimir-factura/${facturaId}`);
      }
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.mensaje || "Error al facturar");
    }
  };

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h2>Facturación</h2>

        <div className="card p-3 mb-4">
          <h5>Cliente</h5>

          <select
            className="form-control mb-3"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Seleccione un cliente</option>

            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </option>
            ))}
          </select>

          <div className="mb-3">
            <label className="form-label">Forma de Pago</label>

            <select
              className="form-control"
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
            >
              <option value="EFECTIVO">💵 Efectivo</option>

              <option value="TARJETA">💳 Tarjeta</option>

              <option value="TRANSFERENCIA">🏦 Transferencia</option>
            </select>
          </div>

          <h5>Agregar Producto</h5>

          <select
            className="form-control mb-2"
            value={productoId}
            onChange={(e) => {
              const id = e.target.value;

              setProductoId(id);

              const prod = productos.find((p) => p.id === Number(id));

              if (prod) {
                setPrecio(prod.precio_venta);
              } else {
                setPrecio("");
              }
            }}
          >
            <option value="">Seleccione un producto</option>

            {productos.map((producto) => (
              <option key={producto.id} value={producto.id}>
                {producto.nombre}
              </option>
            ))}
          </select>

          <input
            type="number"
            className="form-control mb-2"
            placeholder="Cantidad"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />

          <input
            type="number"
            className="form-control mb-2"
            placeholder="Precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />

          <input
            type="number"
            className="form-control mb-3"
            placeholder="Descuento"
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
          />

          <button className="btn btn-primary" onClick={agregarProducto}>
            Agregar Producto
          </button>
        </div>
        <div className="d-flex gap-2 mt-2">
          <button className="btn btn-primary" onClick={agregarProducto}>
            Agregar Producto
          </button>

          <button
            className="btn btn-warning text-white"
            onClick={() => setMostrarModalServicio(true)}
          >
            🛠 Agregar Servicio
          </button>
        </div>

        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="text-end">Precio</th>
              <th className="text-center">Cantidad</th>
              <th className="text-end">Descuento</th>
              <th className="text-end">Subtotal</th>
              <th width="80" className="text-center">
                Acción
              </th>
            </tr>
          </thead>

          <tbody>
            {detalle.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">
                  No hay productos agregados.
                </td>
              </tr>
            ) : (
              detalle.map((item, index) => (
                <tr key={index}>
                  <td>
                    {item.tipo === "SERVICIO" ? "🛠 " : "📦 "}
                    {item.descripcion}
                  </td>

                  <td className="text-end">
                    RD$ {Number(item.precio).toLocaleString("es-DO")}
                  </td>

                  <td className="text-center">{item.cantidad}</td>

                  <td className="text-end">
                    RD$ {Number(item.descuento).toLocaleString("es-DO")}
                  </td>

                  <td className="text-end">
                    RD${" "}
                    {(
                      item.precio * item.cantidad -
                      item.descuento
                    ).toLocaleString("es-DO")}
                  </td>

                  <td className="text-center">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => eliminarItem(index)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <h4>Total: ${calcularTotal().toFixed(2)}</h4>

        <button className="btn btn-success" onClick={facturar}>
          Facturar
        </button>
      </div>
      {mostrarModalServicio && (
        <div
          className="modal fade show"
          style={{
            display: "block",
            backgroundColor: "rgba(0,0,0,.5)",
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning text-white">
                <h5 className="modal-title">🛠 Nuevo Servicio</h5>

                <button
                  className="btn-close"
                  onClick={() => setMostrarModalServicio(false)}
                />
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Descripción</label>

                  <input
                    type="text"
                    className="form-control"
                    value={servicio.descripcion}
                    onChange={(e) =>
                      setServicio({
                        ...servicio,
                        descripcion: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <label>Costo / Inversión</label>

                    <input
                      type="number"
                      className="form-control"
                      value={servicio.costo}
                      onChange={(e) =>
                        setServicio({
                          ...servicio,
                          costo: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label>Precio de Venta</label>

                    <input
                      type="number"
                      className="form-control"
                      value={servicio.precio}
                      onChange={(e) =>
                        setServicio({
                          ...servicio,
                          precio: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="row mt-3">
                  <div className="col-md-6">
                    <label>Cantidad</label>

                    <input
                      type="number"
                      className="form-control"
                      value={servicio.cantidad}
                      onChange={(e) =>
                        setServicio({
                          ...servicio,
                          cantidad: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label>Descuento</label>

                    <input
                      type="number"
                      className="form-control"
                      value={servicio.descuento}
                      onChange={(e) =>
                        setServicio({
                          ...servicio,
                          descuento: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <hr />

                <div className="alert alert-success text-center mt-3">
                  <h5 className="mb-1">Ganancia Esperada</h5>

                  <h2 className="fw-bold">
                    RD${" "}
                    {(
                      (Number(servicio.precio || 0) -
                        Number(servicio.costo || 0)) *
                        Number(servicio.cantidad || 1) -
                      Number(servicio.descuento || 0)
                    ).toLocaleString("es-DO")}
                  </h2>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setMostrarModalServicio(false)}
                >
                  Cancelar
                </button>

                <button
                  className="btn btn-warning text-white"
                  onClick={agregarServicio}
                >
                  Agregar Servicio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Facturas;
