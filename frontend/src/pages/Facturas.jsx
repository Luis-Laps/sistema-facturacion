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
  const [cantidad, setCantidad] = useState("");

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
    if (!productoId || !cantidad) {
      return;
    }

    const producto = productos.find((p) => p.id === Number(productoId));

    if (!producto) return;

    const item = {
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      cantidad: Number(cantidad),
    };

    setDetalle([...detalle, item]);

    setProductoId("");
    setCantidad("");
  };

  const calcularTotal = () => {
    return detalle.reduce(
      (total, item) => total + item.precio * item.cantidad,
      0,
    );
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

          <h5>Agregar Producto</h5>

          <select
            className="form-control mb-2"
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
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

          <button className="btn btn-primary" onClick={agregarProducto}>
            Agregar Producto
          </button>
        </div>

        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Cantidad</th>
              <th>Subtotal</th>
            </tr>
          </thead>

          <tbody>
            {detalle.map((item, index) => (
              <tr key={index}>
                <td>{item.nombre}</td>

                <td>${item.precio}</td>

                <td>{item.cantidad}</td>

                <td>${(item.precio * item.cantidad).toFixed(2)}</td>
              </tr>
            ))}
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
