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
  // PREPARAR MODO IMPRESIÓN
  // ==========================================
  useEffect(() => {
    document.body.classList.add("ticket-printing");

    return () => {
      document.body.classList.remove("ticket-printing");
    };
  }, []);

  // ==========================================
  // CARGAR DATOS
  // ==========================================
  useEffect(() => {
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

    cargarDatos();
  }, [id]);

  // ==========================================
  // HELPERS
  // ==========================================
  const formatearMoneda = (valor) => {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "";

    return new Date(fecha).toLocaleString("es-DO", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Santo_Domingo",
    });
  };

  // ==========================================
  // ESTADOS DE CARGA
  // ==========================================
  if (cargando) {
    return (
      <div className="ticket-loading-screen">
        <h3>Cargando factura...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ticket-loading-screen">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  if (!factura?.factura || !empresa) {
    return (
      <div className="ticket-loading-screen">
        <h3>No se encontraron los datos de la factura.</h3>
      </div>
    );
  }

  const datosFactura = factura.factura;
  const detalle = factura.detalle || [];

  const colorPrincipal = empresa.color_principal || "#198754";

  // ==========================================
  // DATOS GUARDADOS EN LA FACTURA
  // ==========================================

  // Cada detalle ya representa su subtotal de línea.
  // No recalculamos descuentos generales ni impuestos
  // a partir de parámetros externos: imprimimos lo que
  // realmente quedó guardado en la factura.
  const subtotalProductos = detalle.reduce(
    (total, item) => total + Number(item.subtotal || 0),
    0,
  );

  const descuento = Number(datosFactura.descuento || 0);
  const descuentoTipo = datosFactura.descuento_tipo || null;

  const subtotalConDescuento = Math.max(0, subtotalProductos - descuento);

  const propina = Number(datosFactura.propina || 0);
  const itbis = Number(datosFactura.itbis || 0);
  const total = Number(datosFactura.total || 0);

  const mostrarDescuento = descuento > 0 || Boolean(descuentoTipo);

  const nombreFormaPago = {
    EFECTIVO: "💵 Efectivo",
    TARJETA: "💳 Tarjeta",
    TRANSFERENCIA: "🏦 Transferencia",
  };

  return (
    <>
      {/* BOTÓN SOLO PARA PANTALLA */}
      <div className="ticket-toolbar no-print">
        <button
          type="button"
          className="ticket-print-button"
          onClick={() => window.print()}
        >
          🖨️ Imprimir Factura
        </button>
      </div>

      {/* TICKET */}
      <main
        className="ticket-page"
        style={{
          "--color-principal": colorPrincipal,
        }}
      >
        <section className="ticket" aria-label="Factura">
          {/* ======================================
              EMPRESA
          ====================================== */}
          <header className="empresa">
            {empresa.logo_url && (
              <img
                src={empresa.logo_url}
                alt={`Logo de ${empresa.nombre || ""}`}
                className="logo"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}

            <h2>{empresa.nombre}</h2>

            {empresa.rnc && <p>RNC: {empresa.rnc}</p>}
            {empresa.direccion && <p>{empresa.direccion}</p>}
            {empresa.telefono && <p>Tel: {empresa.telefono}</p>}
            {empresa.correo && <p>{empresa.correo}</p>}
          </header>

          <div className="ticket-separator" />

          <div className="ticket-heading">
            <h3>FACTURA</h3>

            <p className="cajero">
              Cajero:{" "}
              {datosFactura.usuario_nombre ||
                datosFactura.usuario ||
                "No identificado"}
            </p>
          </div>

          {/* ======================================
              INFORMACIÓN
          ====================================== */}
          <section className="info-ticket">
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
              <span>{formatearFecha(datosFactura.fecha)}</span>
            </div>
          </section>

          <div className="ticket-separator" />

          {/* ======================================
              DETALLE
          ====================================== */}
          <section className="ticket-items">
            {detalle.map((item, index) => {
              const cantidad = Number(item.cantidad || 0);
              const precio = Number(item.precio || 0);
              const descuentoItem = Number(item.descuento || 0);
              const subtotalItem = Number(item.subtotal || 0);

              return (
                <div className="item" key={item.id || index}>
                  <div className="producto">
                    {item.nombre || item.descripcion_manual || "Producto"}
                  </div>

                  <div className="detalle-producto">
                    <span>
                      {cantidad} × RD$ {formatearMoneda(precio)}
                    </span>

                    <span>RD$ {formatearMoneda(subtotalItem)}</span>
                  </div>

                  {descuentoItem > 0 && (
                    <div className="detalle-producto descuento-linea">
                      <span>Descuento producto</span>
                      <span>- RD$ {formatearMoneda(descuentoItem)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <div className="ticket-separator" />

          {/* ======================================
              RESUMEN
          ====================================== */}
          <section className="resumen-ticket">
            <div className="fila">
              <span>Subtotal</span>
              <span>RD$ {formatearMoneda(subtotalProductos)}</span>
            </div>

            {mostrarDescuento && descuento > 0 && (
              <>
                <div className="fila fila-descuento">
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

            {datosFactura.itbis_aplicado && itbis > 0 && (
              <div className="fila">
                <span>ITBIS (18%)</span>
                <span>RD$ {formatearMoneda(itbis)}</span>
              </div>
            )}

            {datosFactura.propina_aplicada && propina > 0 && (
              <div className="fila">
                <span>Propina de ley (10%)</span>
                <span>RD$ {formatearMoneda(propina)}</span>
              </div>
            )}
          </section>

          {/* ======================================
              TOTAL
          ====================================== */}
          <section className="total">
            <div className="titulo-total">TOTAL</div>

            <div className="monto-total" style={{ color: colorPrincipal }}>
              RD$ {formatearMoneda(total)}
            </div>
          </section>

          <div className="ticket-separator" />

          {/* ======================================
              FORMA DE PAGO
          ====================================== */}
          <div className="fila forma-pago">
            <strong>Forma de pago</strong>

            <span>
              {nombreFormaPago[datosFactura.forma_pago] ||
                datosFactura.forma_pago ||
                "No especificada"}
            </span>
          </div>

          <div className="ticket-separator" />

          {/* ======================================
              PIE
          ====================================== */}
          <footer className="footer">
            <strong>¡Gracias por su compra!</strong>

            <div>Esperamos verle nuevamente.</div>

            <div className="footer-empresa">
              <strong>{empresa.nombre}</strong>

              {empresa.telefono && <div>{empresa.telefono}</div>}

              {empresa.correo && <div>{empresa.correo}</div>}
            </div>
          </footer>
        </section>
      </main>
    </>
  );
}

export default ImprimirFacturaTicket;
