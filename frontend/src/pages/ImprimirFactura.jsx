import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function ImprimirFactura() {
  const { id } = useParams();

  const [factura, setFactura] = useState(null);
  const [empresa, setEmpresa] = useState(null);

  const cargarDatos = async () => {
    try {
      const facturaRes = await api.get(`/facturas/${id}`);
      const empresaRes = await api.get("/configuracion");

      setFactura(facturaRes.data);
      setEmpresa(empresaRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (!factura || !empresa) {
    return (
      <div className="container mt-5">
        <h3>Cargando...</h3>
      </div>
    );
  }

  return (
    <>
      <div
        className="container mt-4"
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div className="text-center mb-4">
          <img
            src="/logo.png"
            alt="Logo"
            className="img-fluid mb-3"
            style={{
              maxWidth: "300px",
              maxHeight: "180px",
            }}
          />

          <h2>{empresa.nombre}</h2>

          <p className="mb-1">{empresa.telefono}</p>

          <p className="mb-1">{empresa.direccion}</p>

          <p>{empresa.correo}</p>

          <p className="text-muted">Reparación, Brillo y Pintura</p>

          <hr />

          <h3>Factura #{factura.factura.id}</h3>
        </div>

        <div className="row mb-4">
          <div className="col-6">
            <strong>Cliente:</strong> {factura.factura.cliente}
          </div>

          <div className="col-6 text-end">
            <strong>Fecha:</strong>{" "}
            {new Date(factura.factura.fecha).toLocaleDateString()}
          </div>
        </div>

        <table className="table table-bordered">
          <thead className="table-light">
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Subtotal</th>
            </tr>
          </thead>

          <tbody>
            {factura.detalle.map((item, index) => (
              <tr key={index}>
                <td>{item.nombre}</td>

                <td>{item.cantidad}</td>

                <td>
                  RD$
                  {Number(item.precio).toLocaleString()}
                </td>

                <td>
                  RD$
                  {Number(item.subtotal).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2
          className="text-end mt-4"
          style={{
            color: "#198754",
            fontWeight: "bold",
          }}
        >
          Total: RD$
          {Number(factura.factura.total).toLocaleString()}
        </h2>

        <hr />

        <p className="text-center mt-4">
          Gracias por confiar en Byron Reparaciones
        </p>

        <p className="text-center">Tel: {empresa.telefono}</p>

        <div className="text-center mt-4">
          <button
            className="btn btn-success no-print"
            onClick={() => window.print()}
          >
            Imprimir Factura
          </button>
        </div>
      </div>

      <style>
        {`
          @media print {

            .no-print {
              display: none !important;
            }

            body {
              margin: 0;
              padding: 0;
            }

            .container {
              max-width: 100% !important;
            }

          }
        `}
      </style>
    </>
  );
}

export default ImprimirFactura;
