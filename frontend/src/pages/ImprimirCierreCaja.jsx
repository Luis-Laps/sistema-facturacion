import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function ImprimirCierreCaja() {
  const { id } = useParams();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // MODO IMPRESIÓN
  // ==========================================

  useEffect(() => {
    document.body.classList.add("cierre-caja-printing");

    return () => {
      document.body.classList.remove("cierre-caja-printing");
    };
  }, []);

  // ==========================================
  // CARGAR DATOS
  // ==========================================

  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await api.get(`/cajas/cierre-ticket/${id}`);

        setDatos(response.data);
      } catch (err) {
        console.error("Error cargando cierre:", err);

        setError(
          err.response?.data?.mensaje || "No se pudo cargar el cierre de caja.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [id]);

  // ==========================================
  // FORMATO DINERO
  // ==========================================

  const dinero = (valor) => {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ==========================================
  // FORMATO FECHA
  // ==========================================

  const fecha = (valor) => {
    if (!valor) {
      return "-";
    }

    return new Date(valor).toLocaleString("es-DO", {
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
  // CARGANDO
  // ==========================================

  if (cargando) {
    return <div className="cierre-ticket-loading">Cargando reporte...</div>;
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error || !datos) {
    return (
      <div className="cierre-ticket-loading">
        {error || "No se encontraron los datos."}
      </div>
    );
  }

  const { caja, resumen } = datos;

  const debeHaber =
    Number(caja.monto_inicial || 0) + Number(resumen.totalEfectivo || 0);

  return (
    <>
      {/* ======================================
          BOTÓN PANTALLA
      ====================================== */}

      <div className="cierre-ticket-toolbar no-print">
        <button type="button" onClick={() => window.print()}>
          🖨️ Imprimir reporte
        </button>
      </div>

      {/* ======================================
          TICKET
      ====================================== */}

      <main className="cierre-ticket-page">
        <section className="cierre-ticket">
          {/* ==================================
              ENCABEZADO
          ================================== */}

          <header className="cierre-ticket-header">
            {caja.logo_url && (
              <img
                src={caja.logo_url}
                alt={`Logo de ${caja.empresa || "Empresa"}`}
                className="cierre-ticket-logo"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}

            <h1>{caja.empresa || "Empresa"}</h1>

            {caja.rnc && <p>RNC: {caja.rnc}</p>}

            {caja.direccion && <p>{caja.direccion}</p>}

            {caja.telefono && <p>Tel: {caja.telefono}</p>}

            {caja.correo && <p>{caja.correo}</p>}
          </header>

          <div className="cierre-linea" />

          {/* ==================================
              TÍTULO
          ================================== */}

          <div className="cierre-ticket-titulo">
            <h2>CIERRE DE CAJA</h2>

            <p>Caja #{caja.id}</p>
          </div>

          {/* ==================================
              INFORMACIÓN
          ================================== */}

          <div className="cierre-seccion">
            <div className="cierre-fila">
              <span>Cajero</span>
              <strong>{caja.usuario_nombre || "No identificado"}</strong>
            </div>

            <div className="cierre-fila">
              <span>Apertura</span>
              <strong>{fecha(caja.fecha_apertura)}</strong>
            </div>

            <div className="cierre-fila">
              <span>Cierre</span>
              <strong>{fecha(caja.fecha_cierre)}</strong>
            </div>
          </div>

          <div className="cierre-linea" />

          {/* ==================================
              DINERO
          ================================== */}

          <div className="cierre-seccion">
            <div className="cierre-fila">
              <span>Monto inicial</span>

              <strong>RD$ {dinero(caja.monto_inicial)}</strong>
            </div>

            <div className="cierre-fila">
              <span>Ventas efectivo</span>

              <strong>RD$ {dinero(resumen.totalEfectivo)}</strong>
            </div>

            <div className="cierre-fila">
              <span>Ventas tarjeta</span>

              <strong>RD$ {dinero(resumen.totalTarjeta)}</strong>
            </div>

            <div className="cierre-fila">
              <span>Ventas transferencia</span>

              <strong>RD$ {dinero(resumen.totalTransferencia)}</strong>
            </div>
          </div>

          <div className="cierre-linea" />

          {/* ==================================
              ACTIVIDAD
          ================================== */}

          <div className="cierre-seccion">
            <div className="cierre-fila">
              <span>Facturas generadas</span>

              <strong>{resumen.cantidadFacturas}</strong>
            </div>

            <div className="cierre-fila">
              <span>Clientes atendidos</span>

              <strong>{resumen.clientesAtendidos}</strong>
            </div>

            <div className="cierre-fila">
              <span>Productos vendidos</span>

              <strong>{resumen.cantidadProductos}</strong>
            </div>

            <div className="cierre-fila">
              <span>Propinas aplicadas</span>

              <strong>{resumen.cantidadPropinas}</strong>
            </div>

            <div className="cierre-fila">
              <span>Total propinas</span>

              <strong>RD$ {dinero(resumen.totalPropinas)}</strong>
            </div>
          </div>

          <div className="cierre-linea" />

          {/* ==================================
              TOTAL VENTAS
          ================================== */}

          <div className="cierre-total">
            <span>VENTAS TOTALES</span>

            <strong>RD$ {dinero(resumen.totalVentas)}</strong>
          </div>

          <div className="cierre-linea" />

          {/* ==================================
              EFECTIVO FÍSICO
          ================================== */}

          <div className="cierre-seccion">
            <div className="cierre-fila">
              <span>Debe haber en efectivo</span>

              <strong>RD$ {dinero(debeHaber)}</strong>
            </div>

            <div className="cierre-fila">
              <span>Dinero contado</span>

              <strong>RD$ {dinero(caja.dinero_contado)}</strong>
            </div>

            <div
              className={`cierre-fila ${
                Number(caja.diferencia) === 0
                  ? "sin-diferencia"
                  : "con-diferencia"
              }`}
            >
              <span>Diferencia</span>

              <strong>RD$ {dinero(caja.diferencia)}</strong>
            </div>
          </div>

          <div className="cierre-linea" />

          {/* ==================================
              PIE
          ================================== */}

          <footer className="cierre-footer">
            <strong>CAJA CERRADA CORRECTAMENTE</strong>

            <div>Gracias por utilizar el sistema.</div>

            <div className="cierre-footer-empresa">{caja.empresa}</div>
          </footer>
        </section>
      </main>

      {/* ======================================
          ESTILOS
      ====================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #111;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .cierre-ticket-toolbar {
          display: flex;
          justify-content: center;
          padding: 18px 0 22px;
        }

        .cierre-ticket-toolbar button {
          border: 0;
          border-radius: 6px;
          background: #198754;
          color: white;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .cierre-ticket-page {
          width: 100%;
          display: flex;
          justify-content: center;
          padding-bottom: 30px;
          background: #fff;
        }

        .cierre-ticket {
          width: 72mm;
          max-width: calc(100vw - 20px);
          margin: 0 auto;
          padding: 2mm 0;
          font-size: 11px;
          line-height: 1.3;
        }

        .cierre-ticket-header {
          text-align: center;
        }

        .cierre-ticket-logo {
          display: block;
          width: auto;
          max-width: 62mm;
          max-height: 28mm;
          object-fit: contain;
          margin: 0 auto 7px;
        }

        .cierre-ticket-header h1 {
          margin: 0 0 5px;
          font-size: 18px;
          line-height: 1.15;
          font-weight: 700;
          word-break: break-word;
        }

        .cierre-ticket-header p {
          margin: 1px 0;
          font-size: 10.5px;
          line-height: 1.25;
          word-break: break-word;
        }

        .cierre-linea {
          width: 100%;
          border-top: 1px dashed #777;
          margin: 8px 0;
        }

        .cierre-ticket-titulo {
          text-align: center;
        }

        .cierre-ticket-titulo h2 {
          margin: 0 0 3px;
          font-size: 16px;
          line-height: 1.15;
          font-weight: 700;
        }

        .cierre-ticket-titulo p {
          margin: 0;
          font-size: 10px;
        }

        .cierre-seccion {
          width: 100%;
        }

        .cierre-fila {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          margin: 5px 0;
        }

        .cierre-fila span {
          font-weight: 500;
        }

        .cierre-fila strong {
          text-align: right;
          white-space: nowrap;
        }

        .cierre-total {
          text-align: center;
          margin: 10px 0;
        }

        .cierre-total span {
          display: block;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .cierre-total strong {
          display: block;
          font-size: 27px;
          line-height: 1;
          font-weight: 800;
        }

        .cierre-debe-haber {
          font-weight: 700;
        }

        .sin-diferencia {
          font-weight: 700;
        }

        .con-diferencia {
          font-weight: 700;
        }

        .cierre-footer {
          text-align: center;
          font-size: 10.5px;
          line-height: 1.4;
          padding-bottom: 1mm;
        }

        .cierre-footer-empresa {
          margin-top: 7px;
          font-weight: 700;
        }

        .cierre-ticket-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        @media print {

          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body,
          #root {
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
          }

          body.cierre-caja-printing
          .sidebar,
          body.cierre-caja-printing
          .mobile-topbar,
          body.cierre-caja-printing
          .sidebar-overlay,
          body.cierre-caja-printing
          .no-print {
            display: none !important;
          }

          .cierre-ticket-toolbar {
            display: none !important;
          }

          .cierre-ticket-page {
            width: 80mm !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .cierre-ticket {
            width: 72mm !important;
            max-width: 72mm !important;
            margin: 0 auto !important;
            padding: 2mm 0 1mm !important;
          }

          .cierre-ticket-logo {
            max-width: 62mm !important;
            max-height: 28mm !important;
            margin-bottom: 6px !important;
          }

          .cierre-linea {
            margin: 7px 0 !important;
          }

          .cierre-fila {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .cierre-total {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .cierre-footer {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}

export default ImprimirCierreCaja;
