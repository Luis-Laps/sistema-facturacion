import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../services/api";
import "../styles/ticket.css";

function ImprimirFacturaAbierta() {
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
          api.get(`/ferreteria-abiertas/${id}`),
          api.get("/configuracion"),
        ]);

        setFactura(facturaRes.data);
        setEmpresa(empresaRes.data);
      } catch (error) {
        console.error("Error al cargar factura abierta:", error);

        setError(
          error.response?.data?.mensaje ||
            "No se pudo cargar la factura abierta.",
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
  // TIPO DE FACTURA
  // ==========================================

  const obtenerTipoFactura = (tipo) => {
    switch (tipo) {
      case "PENDIENTE_PAGO":
        return "PENDIENTE DE PAGO";

      case "PENDIENTE_ENTREGA":
        return "PENDIENTE DE ENTREGA";

      default:
        return "ABIERTA";
    }
  };

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return (
      <div className="ticket-loading-screen">
        <h3>Cargando factura...</h3>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

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

  const tipoFactura = obtenerTipoFactura(datosFactura.tipo);

  // ==========================================
  // TOTALES
  // ==========================================

  const subtotalProductos = detalle.reduce(
    (total, item) => total + Number(item.subtotal || 0),
    0,
  );

  const descuento = Number(datosFactura.descuento || 0);

  const itbis = Number(datosFactura.itbis || 0);

  const total = Number(datosFactura.total || 0);

  const subtotalConDescuento = Math.max(0, subtotalProductos - descuento);

  return (
    <>
      {/* ==========================================
          BOTÓN IMPRIMIR
      ========================================== */}

      <div className="ticket-toolbar no-print">
        <button
          type="button"
          className="ticket-print-button"
          onClick={() => window.print()}
        >
          🖨️ Imprimir Factura
        </button>
      </div>

      {/* ==========================================
          TICKET
      ========================================== */}

      <main
        className="ticket-page"
        style={{
          "--color-principal": colorPrincipal,
        }}
      >
        <section className="ticket" aria-label="Factura abierta">
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

          {/* ======================================
              ENCABEZADO
          ====================================== */}

          <div className="ticket-heading">
            <h3>FACTURA</h3>

            <div
              style={{
                marginTop: "8px",
                fontWeight: "bold",
                fontSize: "18px",
              }}
            >
              {tipoFactura}
            </div>
          </div>

          <div className="ticket-separator" />

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
              <span>{datosFactura.nombre_cliente || "Consumidor final"}</span>
            </div>

            <div className="fila">
              <span>Fecha</span>
              <span>
                {formatearFecha(
                  datosFactura.created_at || datosFactura.updated_at,
                )}
              </span>
            </div>

            {datosFactura.usuario_nombre && (
              <div className="fila">
                <span>Vendedor</span>
                <span>{datosFactura.usuario_nombre}</span>
              </div>
            )}
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
                  <div className="producto">{item.nombre || "Producto"}</div>

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

            {descuento > 0 && (
              <>
                <div className="fila fila-descuento">
                  <span>Descuento</span>

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
          </section>

          {/* ======================================
              TOTAL
          ====================================== */}

          <section className="total">
            <div className="titulo-total">TOTAL</div>

            <div
              className="monto-total"
              style={{
                color: colorPrincipal,
              }}
            >
              RD$ {formatearMoneda(total)}
            </div>
          </section>

          <div className="ticket-separator" />

          {/* ======================================
              ESTADO
          ====================================== */}

          <section
            style={{
              textAlign: "center",
              margin: "15px 0",
              fontWeight: "bold",
              fontSize: "17px",
            }}
          >
            {tipoFactura}
          </section>

          <div className="ticket-separator" />

          {/* ======================================
              PIE
          ====================================== */}

          <footer className="footer">
            <strong>Documento pendiente de cobro</strong>

            <div>Esta factura todavía no ha sido cobrada.</div>

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

export default ImprimirFacturaAbierta;
