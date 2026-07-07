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

  const cargarDatos = async () => {
    try {
      const clientesRes = await api.get("/clientes");
      const productosRes = await api.get("/productos");

      setClientes(clientesRes.data);
      setProductos(productosRes.data);
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
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: Number(precio),
      cantidad: Number(cantidad),
      descuento: Number(descuento),
    };

    setDetalle((anterior) => [...anterior, item]);

    // Limpiar formulario
    setProductoId("");
    setCantidad(1);
    setPrecio("");
    setDescuento(0);
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
          producto_id: item.producto_id,
          cantidad: item.cantidad,
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
                  <td>{item.nombre}</td>

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
    </>
  );
}

export default Facturas;
