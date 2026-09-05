import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import "../styles/ticket.css";
import api from "../services/api";

function ImprimirFacturaTicket() {
  const { id } = useParams();

  const [factura, setFactura] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // CARGAR DATOS
  // ==========================================

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [facturaRes, empresaRes] = await Promise.all([
        api.get(`/facturas/${id}`),
        api.get("/configuracion"),
      ]);

      setFactura(facturaRes.data);
      setEmpresa(empresaRes.data);
    } catch (error) {
      console.error("Error al cargar datos del ticket:", error);

      setError(
        error.response?.data?.mensaje || "No se pudo cargar la factura.",
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return (
      <div className="container mt-5 text-center">
        <h3>Cargando factura...</h3>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error) {
    return (
      <div className="container mt-5 text-center">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!factura || !empresa) {
    return (
      <div className="container mt-5 text-center">
        <h3>No se encontraron los datos.</h3>
      </div>
    );
  }

  const colorPrincipal = empresa.color_principal || "#198754";

  const datosFactura = factura.factura;

  // ==========================================
  // CÁLCULOS
  // ==========================================

  // Subtotal de productos/servicios
  const subtotalProductos = factura.detalle.reduce((total, item) => {
    return total + Number(item.subtotal || 0);
  }, 0);

  // Descuento general de la factura
  const descuento = Number(datosFactura.descuento || 0);

  const descuentoTipo = datosFactura.descuento_tipo || null;

  // Subtotal después del descuento
  const subtotalConDescuento = Math.max(0, subtotalProductos - descuento);

  // Propina
  const propina = Number(datosFactura.propina || 0);

  // ITBIS
  const itbis = Number(datosFactura.itbis || 0);

  // Total
  const total = Number(datosFactura.total || 0);

  // ==========================================
  // FORMATEAR MONEDA
  // ==========================================

  const formatearMoneda = (valor) => {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ==========================================
  // TICKET
  // ==========================================

  const Ticket = ({ titulo }) => (
    <div
      className="ticket"
      style={{
        "--color-principal": colorPrincipal,
      }}
    >
      {/* ======================================
          EMPRESA
      ====================================== */}

      <div className="empresa">
        {empresa.logo_url ? (
          <img
            src={empresa.logo_url}
            alt={`Logo de ${empresa.nombre}`}
            className="logo"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}

        <h2>{empresa.nombre}</h2>

        {empresa.rnc && <p>RNC: {empresa.rnc}</p>}

        {empresa.direccion && <p>{empresa.direccion}</p>}

        {empresa.telefono && <p>Tel: {empresa.telefono}</p>}

        {empresa.correo && <p>{empresa.correo}</p>}

        <hr />

        <h3>{titulo}</h3>

        <p className="cajero">
          Cajero:{" "}
          {datosFactura.usuario_nombre ||
            datosFactura.usuario ||
            "No identificado"}
        </p>
      </div>

      {/* ======================================
          INFORMACIÓN FACTURA
      ====================================== */}

      <div className="info-ticket">
        <div className="fila">
          <span>No. Factura</span>
          <span>#{datosFactura.id}</span>
        </div>

        <div className="fila">
          <span>Cliente</span>
          <span>{datosFactura.cliente || "Consumidor final"}</span>
        </div>

        <div className="fila">
          <span>Fecha</span>
          <span>
            {new Date(datosFactura.fecha).toLocaleString("es-DO", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
        </div>
      </div>

      <hr />

      {/* ======================================
          DETALLE
      ====================================== */}

      {factura.detalle.map((item, index) => (
        <div key={index} className="item">
          <div className="producto">{item.nombre}</div>

          <div className="detalle-producto">
            <span>
              {item.cantidad} × RD$
              {formatearMoneda(item.precio)}
            </span>

            <span>
              RD$
              {formatearMoneda(item.subtotal)}
            </span>
          </div>

          {/* Descuento individual del producto */}
          {Number(item.descuento || 0) > 0 && (
            <div className="detalle-producto">
              <span>Descuento</span>

              <span>
                - RD$
                {formatearMoneda(item.descuento)}
              </span>
            </div>
          )}

          <hr />
        </div>
      ))}

      {/* ======================================
          RESUMEN DE FACTURA
      ====================================== */}

      <div className="resumen-ticket">
        {/* SUBTOTAL */}
        <div className="fila">
          <span>Subtotal</span>

          <span>RD$ {formatearMoneda(subtotalProductos)}</span>
        </div>

        {/* DESCUENTO GENERAL */}
        {descuento > 0 && (
          <>
            <div
              className="fila"
              style={{
                color: "#dc3545",
              }}
            >
              <span>
                Descuento
                {descuentoTipo ? ` (${descuentoTipo})` : ""}
              </span>

              <span>- RD$ {formatearMoneda(descuento)}</span>
            </div>

            <div className="fila">
              <span>Subtotal con descuento</span>

              <span>RD$ {formatearMoneda(subtotalConDescuento)}</span>
            </div>
          </>
        )}

        {/* ITBIS */}
        {datosFactura.itbis_aplicado && itbis > 0 && (
          <div className="fila">
            <span>ITBIS (18%)</span>

            <span>RD$ {formatearMoneda(itbis)}</span>
          </div>
        )}

        {/* PROPINA */}
        {datosFactura.propina_aplicada && propina > 0 && (
          <div className="fila">
            <span>Propina de ley (10%)</span>

            <span>RD$ {formatearMoneda(propina)}</span>
          </div>
        )}

        {/* TOTAL */}
        <div
          className="total"
          style={{
            borderColor: colorPrincipal,
          }}
        >
          <div className="titulo-total">TOTAL</div>

          <div
            className="monto-total"
            style={{
              color: colorPrincipal,
            }}
          >
            RD$ {formatearMoneda(total)}
          </div>
        </div>
      </div>

      <hr />

      {/* ======================================
          FORMA DE PAGO
      ====================================== */}

      <div className="fila forma-pago">
        <strong>Forma de pago</strong>

        <span>
          {datosFactura.forma_pago === "EFECTIVO"
            ? "💵 Efectivo"
            : datosFactura.forma_pago === "TARJETA"
              ? "💳 Tarjeta"
              : datosFactura.forma_pago === "TRANSFERENCIA"
                ? "🏦 Transferencia"
                : datosFactura.forma_pago || "No especificada"}
        </span>
      </div>

      <hr />

      {/* ======================================
          FOOTER
      ====================================== */}

      <div className="footer">
        <strong>¡Gracias por su compra!</strong>
        <br />
        Esperamos verle nuevamente.
        <br />
        <br />
        <strong>{empresa.nombre}</strong>
        {empresa.telefono && (
          <>
            <br />
            {empresa.telefono}
          </>
        )}
        {empresa.correo && (
          <>
            <br />
            {empresa.correo}
          </>
        )}
      </div>
    </div>
  );

  // ==========================================
  // PANTALLA
  // ==========================================

  return (
    <>
      <div className="no-print text-center mb-3">
        <button className="btn btn-success" onClick={() => window.print()}>
          🖨️ Imprimir Factura
        </button>
      </div>

      <Ticket titulo="FACTURA" />
    </>
  );
}

export default ImprimirFacturaTicket;
