import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../styles/ticket.css";
import api from "../services/api";

function ImprimirFacturaTicket() {
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
      <div className="ticket">
        <div className="empresa">
          <img
            src="/logo.png"
            alt="Logo"
            className="logo"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />

          <h2>{empresa.nombre}</h2>

          <p>{empresa.direccion}</p>

          <p>Tel: {empresa.telefono}</p>

          <p>{empresa.correo}</p>

          <hr />

          <h3>FACTURA</h3>

          <p className="cajero">Cajero: Administrador</p>
        </div>

        <div className="info-ticket">
          <div className="fila">
            <span>No. Factura</span>
            <span>#{factura.factura.id}</span>
          </div>

          <div className="fila">
            <span>Cliente</span>
            <span>{factura.factura.cliente}</span>
          </div>

          <div className="fila">
            <span>Fecha</span>

            <span>
              {new Date(factura.factura.fecha).toLocaleString("es-DO", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          </div>
        </div>

        <hr />

        {factura.detalle.map((item, index) => (
          <div key={index} className="item">
            <div className="producto">{item.nombre}</div>

            <div className="detalle-producto">
              <span>
                {item.cantidad} × RD$
                {Number(item.precio).toLocaleString()}
              </span>

              <span>
                RD$
                {Number(item.subtotal).toLocaleString()}
              </span>
            </div>

            <hr />
          </div>
        ))}

        <div className="total">
          <div className="titulo-total">TOTAL</div>

          <div className="monto-total">
            RD$ {Number(factura.factura.total).toLocaleString()}
          </div>
        </div>

        <hr />

        <div className="footer">
          <strong>¡Gracias por su compra!</strong>
          <br />
          Esperamos verle nuevamente.
          <br />
          <br />
          <strong>{empresa.nombre}</strong>
          <br />
          {empresa.telefono}
        </div>
      </div>

      <div className="text-center mt-4 no-print">
        <button
          className="btn btn-success w-100"
          onClick={() => window.print()}
        >
          🖨️ Imprimir Ticket
        </button>
      </div>
    </>
  );
}

export default ImprimirFacturaTicket;
