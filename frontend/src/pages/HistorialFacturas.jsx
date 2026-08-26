import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";

import api from "../services/api";

import Swal from "sweetalert2";

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

  const eliminarFactura = async (id) => {
    const confirmar = await Swal.fire({
      title: "¿Eliminar factura?",
      text: "Esta acción devolverá el inventario y eliminará la venta.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
    });

    if (!confirmar.isConfirmed) return;

    try {
      await api.delete(`/facturas/${id}`);

      Swal.fire({
        icon: "success",
        title: "Factura eliminada",
        timer: 1500,
        showConfirmButton: false,
      });

      cargarFacturas();
    } catch (error) {
      console.error(error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No se pudo eliminar la factura.",
        "error",
      );
    }
  };

  const mostrarFormaPago = (formaPago) => {
    switch (formaPago) {
      case "EFECTIVO":
        return "💵 Efectivo";

      case "TARJETA":
        return "💳 Tarjeta";

      case "TRANSFERENCIA":
        return "🏦 Transferencia";

      default:
        return formaPago || "No especificada";
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

        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Forma de pago</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {facturas.map((factura) => (
                <tr key={factura.id}>
                  <td>{factura.id}</td>

                  <td>{factura.cliente}</td>

                  <td>{new Date(factura.fecha).toLocaleDateString()}</td>

                  <td>
                    RD${" "}
                    {Number(factura.total).toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        factura.forma_pago === "EFECTIVO"
                          ? "bg-success"
                          : factura.forma_pago === "TARJETA"
                            ? "bg-primary"
                            : factura.forma_pago === "TRANSFERENCIA"
                              ? "bg-info text-dark"
                              : "bg-secondary"
                      }`}
                    >
                      {mostrarFormaPago(factura.forma_pago)}
                    </span>
                  </td>

                  <td>
                    <div className="btn-group">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => verDetalle(factura.id)}
                      >
                        👁 Ver
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => eliminarFactura(factura.id)}
                      >
                        🗑 Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                <div className="row mb-3">
                  <div className="col-md-4">
                    <strong>Cliente:</strong> {detalleFactura.factura.cliente}
                  </div>

                  <div className="col-md-4">
                    <strong>Fecha:</strong>{" "}
                    {new Date(
                      detalleFactura.factura.fecha,
                    ).toLocaleDateString()}
                  </div>

                  <div className="col-md-4">
                    <strong>Forma de pago:</strong>{" "}
                    {mostrarFormaPago(detalleFactura.factura.forma_pago)}
                  </div>
                </div>

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

                        <td>
                          RD${" "}
                          {Number(item.precio).toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td>
                          RD${" "}
                          {Number(item.subtotal).toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h4 className="text-end">
                  Total: RD${" "}
                  {Number(detalleFactura.factura.total).toLocaleString(
                    "es-DO",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
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
