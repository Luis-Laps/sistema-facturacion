import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";

function HistorialFacturas() {
  const [facturas, setFacturas] = useState([]);
  const [detalleFactura, setDetalleFactura] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const cargarFacturas = async () => {
    try {
      const response = await api.get("/facturas");

      setFacturas(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const verDetalle = async (id) => {
    try {
      const response = await api.get(`/facturas/${id}`);

      setDetalleFactura(response.data);

      setMostrarDetalle(true);
    } catch (error) {
      console.error(error);

      alert("Error al cargar factura");
    }
  };

  useEffect(() => {
    cargarFacturas();
  }, []);

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h2>Historial de Facturas</h2>

        <table className="table table-striped">
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {facturas.map((factura) => (
              <tr key={factura.id}>
                <td>{factura.id}</td>

                <td>{factura.cliente}</td>

                <td>{new Date(factura.fecha).toLocaleDateString()}</td>

                <td>RD$ {Number(factura.total).toLocaleString()}</td>

                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => verDetalle(factura.id)}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mostrarDetalle && detalleFactura && (
        <div
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5>Factura #{detalleFactura.factura.id}</h5>

                <button
                  className="btn-close"
                  onClick={() => setMostrarDetalle(false)}
                />
              </div>

              <div className="modal-body">
                <p>
                  <strong>Cliente:</strong> {detalleFactura.factura.cliente}
                </p>

                <p>
                  <strong>Fecha:</strong>{" "}
                  {new Date(detalleFactura.factura.fecha).toLocaleDateString()}
                </p>

                <table className="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>

                  <tbody>
                    {detalleFactura.detalle.map((item, index) => (
                      <tr key={index}>
                        <td>{item.nombre}</td>

                        <td>{item.cantidad}</td>

                        <td>RD$ {item.precio}</td>

                        <td>RD$ {item.subtotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h4>
                  Total: RD$
                  {detalleFactura.factura.total}
                </h4>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HistorialFacturas;
