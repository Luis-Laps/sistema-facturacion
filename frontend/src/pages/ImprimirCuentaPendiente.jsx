import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";

function ImprimirCuentaPendiente() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [cuenta, setCuenta] = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [cargando, setCargando] = useState(true);

  const propinaAplicada = searchParams.get("propina") === "1";
  const itbisAplicado = searchParams.get("itbis") === "1";
  const formaPago = searchParams.get("forma_pago") || "EFECTIVO";

  const cargarDatos = async () => {
    try {
      const [cuentaResponse, empresaResponse] = await Promise.all([
        api.get(`/control-orden/cuentas/${id}`),
        api.get("/configuracion"),
      ]);

      setCuenta(cuentaResponse.data.cuenta);
      setDetalle(cuentaResponse.data.detalle || []);
      setEmpresa(empresaResponse.data);
    } catch (error) {
      console.error("Error al cargar cuenta pendiente:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

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

  const subtotal = detalle.reduce((total, item) => {
    return (
      total +
      Number(item.cantidad || 0) * Number(item.precio || 0) -
      Number(item.descuento || 0)
    );
  }, 0);

  const propina = propinaAplicada
    ? Math.round((subtotal * 0.1 + Number.EPSILON) * 100) / 100
    : 0;

  const itbis = itbisAplicado
    ? Math.round((subtotal * 0.18 + Number.EPSILON) * 100) / 100
    : 0;

  const total =
    Math.round((subtotal + propina + itbis + Number.EPSILON) * 100) / 100;

  const nombreFormaPago = {
    EFECTIVO: "Efectivo",
    TARJETA: "Tarjeta",
    TRANSFERENCIA: "Transferencia",
  };

  if (cargando) {
    return <div className="ticket-pendiente-loading">Cargando cuenta...</div>;
  }

  if (!cuenta || !empresa) {
    return (
      <div className="ticket-pendiente-loading">
        No se pudo cargar la cuenta.
      </div>
    );
  }

  return (
    <>
      <div className="ticket-page">
        <div className="ticket-print-button no-print">
          <button type="button" onClick={() => window.print()}>
            🖨️ Imprimir Cuenta Pendiente
          </button>
        </div>

        <div className="ticket-pendiente">
          {/* EMPRESA */}
          <div className="ticket-header">
            <h2>{empresa.nombre}</h2>

            {empresa.direccion && <div>{empresa.direccion}</div>}

            {empresa.telefono && <div>Tel: {empresa.telefono}</div>}

            {empresa.correo && <div>{empresa.correo}</div>}
          </div>

          <div className="ticket-line" />

          {/* TITULO */}
          <div className="ticket-title">
            <h2>CUENTA PENDIENTE</h2>
            <div className="ticket-status">PENDIENTE DE PAGO</div>
          </div>

          {/* INFORMACION */}
          <div className="ticket-info">
            <div className="ticket-info-row">
              <strong>Mesa</strong>
              <span>#{cuenta.mesa_nombre || cuenta.mesa_id}</span>
            </div>

            <div className="ticket-info-row">
              <strong>Cuenta</strong>
              <span>{cuenta.nombre || `Cuenta #${cuenta.id}`}</span>
            </div>

            <div className="ticket-info-row">
              <strong>Fecha</strong>
              <span>{formatearFecha(cuenta.created_at)}</span>
            </div>
          </div>

          <div className="ticket-line" />

          {/* PRODUCTOS */}
          <div className="ticket-items">
            {detalle.map((item) => {
              const cantidad = Number(item.cantidad || 0);
              const precio = Number(item.precio || 0);
              const descuento = Number(item.descuento || 0);

              const subtotalItem = cantidad * precio - descuento;

              return (
                <div className="ticket-item" key={item.id}>
                  <div className="ticket-item-name">
                    {item.producto_nombre ||
                      item.descripcion_manual ||
                      "Producto"}
                  </div>

                  <div className="ticket-item-detail">
                    <span>
                      {cantidad} × RD${formatearMoneda(precio)}
                    </span>

                    <strong>RD${formatearMoneda(subtotalItem)}</strong>
                  </div>

                  <div className="ticket-item-separator" />
                </div>
              );
            })}
          </div>

          {/* TOTALES */}
          <div className="ticket-totals">
            <div className="ticket-total-row">
              <strong>Subtotal</strong>
              <span>RD$ {formatearMoneda(subtotal)}</span>
            </div>

            {propinaAplicada && (
              <div className="ticket-total-row">
                <strong>Propina de ley (10%)</strong>
                <span>RD$ {formatearMoneda(propina)}</span>
              </div>
            )}

            {itbisAplicado && (
              <div className="ticket-total-row">
                <strong>ITBIS (18%)</strong>
                <span>RD$ {formatearMoneda(itbis)}</span>
              </div>
            )}
          </div>

          <div className="ticket-line" />

          {/* TOTAL */}
          <div className="ticket-grand-total">
            <div>TOTAL</div>
            <strong>RD$ {formatearMoneda(total)}</strong>
          </div>

          <div className="ticket-line" />

          {/* FORMA DE PAGO */}
          <div className="ticket-payment">
            <strong>Forma de pago (estimada)</strong>

            <span>💵 {nombreFormaPago[formaPago] || formaPago}</span>
          </div>

          <div className="ticket-line" />

          {/* PIE */}
          <div className="ticket-footer">
            <strong>¡Gracias por su preferencia!</strong>

            <div>Esperamos verle nuevamente.</div>

            <br />

            <strong>{empresa.nombre}</strong>

            {empresa.telefono && <div>{empresa.telefono}</div>}

            {empresa.correo && <div>{empresa.correo}</div>}
          </div>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #ffffff;
          font-family: Arial, Helvetica, sans-serif;
          color: #111;
        }

        .ticket-page {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 0 30px;
        }

        .ticket-print-button {
          margin-bottom: 40px;
        }

        .ticket-print-button button {
          border: 0;
          border-radius: 5px;
          background: #198754;
          color: white;
          font-size: 14px;
          font-weight: 600;
          padding: 9px 16px;
          cursor: pointer;
        }

        .ticket-pendiente {
          width: 265px;
          max-width: calc(100% - 30px);
          font-size: 12px;
          line-height: 1.35;
        }

        .ticket-header {
          text-align: center;
        }

        .ticket-header h2 {
          margin: 0 0 7px;
          font-size: 17px;
          font-weight: 700;
        }

        .ticket-header div {
          margin: 2px 0;
        }

        .ticket-line {
          width: 100%;
          border-top: 1px solid #cfcfcf;
          margin: 14px 0;
        }

        .ticket-title {
          text-align: center;
        }

        .ticket-title h2 {
          margin: 0 0 7px;
          font-size: 17px;
          font-weight: 700;
        }

        .ticket-status {
          color: #dc3545;
          font-size: 12px;
          font-weight: 700;
        }

        .ticket-info {
          margin-top: 18px;
        }

        .ticket-info-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
        }

        .ticket-info-row strong {
          font-weight: 700;
        }

        .ticket-info-row span {
          text-align: right;
        }

        .ticket-item {
          margin-bottom: 12px;
        }

        .ticket-item-name {
          font-weight: 700;
          margin-bottom: 5px;
          word-break: break-word;
        }

        .ticket-item-detail {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .ticket-item-detail strong {
          font-weight: 400;
          white-space: nowrap;
        }

        .ticket-item-separator {
          border-top: 1px solid #d8d8d8;
          margin-top: 12px;
        }

        .ticket-totals {
          margin-top: 2px;
        }

        .ticket-total-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }

        .ticket-total-row span {
          white-space: nowrap;
        }

        .ticket-grand-total {
          text-align: center;
          margin: 4px 0;
        }

        .ticket-grand-total div {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 7px;
        }

        .ticket-grand-total strong {
          display: block;
          color: #198754;
          font-size: 29px;
          line-height: 1;
          font-weight: 700;
        }

        .ticket-payment {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .ticket-payment strong {
          font-weight: 700;
        }

        .ticket-payment span {
          white-space: nowrap;
        }

        .ticket-footer {
          text-align: center;
          line-height: 1.45;
        }

        .ticket-footer strong {
          font-weight: 700;
        }

        .ticket-pendiente-loading {
          width: 100%;
          text-align: center;
          padding: 50px 20px;
          font-family: Arial, Helvetica, sans-serif;
        }

        @media print {
          @page {
            margin: 0;
          }

          html,
          body {
            width: 100%;
            margin: 0;
            padding: 0;
            background: #fff;
          }

          .no-print {
            display: none !important;
          }

          .ticket-page {
            display: block;
            padding: 0;
          }

          .ticket-pendiente {
            width: 265px;
            max-width: none;
            margin: 0 auto;
          }
        }
      `}</style>
    </>
  );
}

export default ImprimirCuentaPendiente;
