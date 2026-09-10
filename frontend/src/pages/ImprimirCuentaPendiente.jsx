import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";

function ImprimirCuentaPendiente() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [cuenta, setCuenta] = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [cargando, setCargando] = useState(true);

  const descuentoPorcentaje = Number(searchParams.get("descuento") || 0);
  const propinaAplicada = searchParams.get("propina") === "1";
  const itbisAplicado = searchParams.get("itbis") === "1";
  const formaPago = searchParams.get("forma_pago") || "EFECTIVO";

  useEffect(() => {
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
    cargarDatos();
  }, [id]);

  const formatearMoneda = (valor) =>
    Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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

  // Debe coincidir con el cálculo del backend al cerrar la cuenta.
  const calculos = useMemo(() => {
    const subtotal = detalle.reduce((total, item) => {
      const cantidad = Number(item.cantidad || 0);
      const precio = Number(item.precio || 0);
      const descuentoItem = Number(item.descuento || 0);
      return total + cantidad * precio - descuentoItem;
    }, 0);

    const subtotalRedondeado =
      Math.round((subtotal + Number.EPSILON) * 100) / 100;

    const descuento =
      descuentoPorcentaje > 0
        ? Math.round(
            (subtotalRedondeado * (descuentoPorcentaje / 100) +
              Number.EPSILON) *
              100,
          ) / 100
        : 0;

    const subtotalConDescuento = Math.max(
      0,
      Math.round((subtotalRedondeado - descuento + Number.EPSILON) * 100) / 100,
    );

    const propina = propinaAplicada
      ? Math.round((subtotalConDescuento * 0.1 + Number.EPSILON) * 100) / 100
      : 0;

    const itbis = itbisAplicado
      ? Math.round((subtotalConDescuento * 0.18 + Number.EPSILON) * 100) / 100
      : 0;

    const total =
      Math.round(
        (subtotalConDescuento + propina + itbis + Number.EPSILON) * 100,
      ) / 100;

    return {
      subtotal: subtotalRedondeado,
      descuento,
      subtotalConDescuento,
      propina,
      itbis,
      total,
    };
  }, [detalle, descuentoPorcentaje, propinaAplicada, itbisAplicado]);

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
          <div className="ticket-header">
            {empresa.logo_url && (
              <img
                src={empresa.logo_url}
                alt={`Logo ${empresa.nombre || ""}`}
                className="ticket-logo"
              />
            )}
            <h2>{empresa.nombre}</h2>
            {empresa.rnc && <div>RNC: {empresa.rnc}</div>}
            {empresa.direccion && <div>{empresa.direccion}</div>}
            {empresa.telefono && <div>Tel: {empresa.telefono}</div>}
            {empresa.correo && <div>{empresa.correo}</div>}
          </div>

          <div className="ticket-line" />

          <div className="ticket-title">
            <h2>CUENTA PENDIENTE</h2>
            <div className="ticket-status">PENDIENTE DE PAGO</div>
          </div>

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

          <div className="ticket-items">
            {detalle.map((item) => {
              const cantidad = Number(item.cantidad || 0);
              const precio = Number(item.precio || 0);
              const descuentoItem = Number(item.descuento || 0);
              const subtotalItem = cantidad * precio - descuentoItem;

              return (
                <div className="ticket-item" key={item.id}>
                  <div className="ticket-item-name">
                    {item.producto_nombre ||
                      item.descripcion_manual ||
                      "Producto"}
                  </div>
                  <div className="ticket-item-detail">
                    <span>
                      {cantidad} × RD$ {formatearMoneda(precio)}
                    </span>
                    <strong>RD$ {formatearMoneda(subtotalItem)}</strong>
                  </div>
                  {descuentoItem > 0 && (
                    <div className="ticket-item-discount">
                      Descuento del producto: -RD${" "}
                      {formatearMoneda(descuentoItem)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="ticket-totals">
            <div className="ticket-total-row">
              <strong>Subtotal</strong>
              <span>RD$ {formatearMoneda(calculos.subtotal)}</span>
            </div>

            {calculos.descuento > 0 && (
              <div className="ticket-total-row ticket-discount-row">
                <strong>Descuento ({descuentoPorcentaje}%)</strong>
                <span>-RD$ {formatearMoneda(calculos.descuento)}</span>
              </div>
            )}

            {descuentoPorcentaje > 0 && (
              <div className="ticket-total-row">
                <strong>Subtotal con descuento</strong>
                <span>
                  RD$ {formatearMoneda(calculos.subtotalConDescuento)}
                </span>
              </div>
            )}

            {propinaAplicada && (
              <div className="ticket-total-row">
                <strong>Propina de ley (10%)</strong>
                <span>RD$ {formatearMoneda(calculos.propina)}</span>
              </div>
            )}

            {itbisAplicado && (
              <div className="ticket-total-row">
                <strong>ITBIS (18%)</strong>
                <span>RD$ {formatearMoneda(calculos.itbis)}</span>
              </div>
            )}
          </div>

          <div className="ticket-line" />

          <div className="ticket-grand-total">
            <div>TOTAL</div>
            <strong>RD$ {formatearMoneda(calculos.total)}</strong>
          </div>

          <div className="ticket-line" />

          <div className="ticket-payment">
            <strong>Forma de pago (estimada)</strong>
            <span>💵 {nombreFormaPago[formaPago] || formaPago}</span>
          </div>

          <div className="ticket-line" />

          <div className="ticket-footer">
            <strong>¡Gracias por su preferencia!</strong>
            <div>Esperamos verle nuevamente.</div>
            <div className="ticket-footer-company">
              <strong>{empresa.nombre}</strong>
              {empresa.telefono && <div>{empresa.telefono}</div>}
              {empresa.correo && <div>{empresa.correo}</div>}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #111; }
        .ticket-page { width: 100%; display: flex; flex-direction: column; align-items: center; padding: 20px 0 30px; }
        .ticket-print-button { margin-bottom: 25px; }
        .ticket-print-button button { border: 0; border-radius: 5px; background: #198754; color: #fff; font-size: 14px; font-weight: 600; padding: 9px 16px; cursor: pointer; }
        .ticket-pendiente { width: 72mm; max-width: calc(100vw - 20px); margin: 0 auto; font-size: 11px; line-height: 1.3; }
        .ticket-header { text-align: center; }
        .ticket-logo { display: block; width: auto; max-width: 62mm; max-height: 28mm; object-fit: contain; margin: 0 auto 7px; }
        .ticket-header h2 { margin: 0 0 5px; font-size: 17px; line-height: 1.15; font-weight: 700; }
        .ticket-header div { margin: 1px 0; word-break: break-word; }
        .ticket-line { width: 100%; border-top: 1px dashed #8f8f8f; margin: 9px 0; }
        .ticket-title { text-align: center; }
        .ticket-title h2 { margin: 0 0 4px; font-size: 16px; font-weight: 700; }
        .ticket-status { color: #dc3545; font-size: 11px; font-weight: 700; }
        .ticket-info { margin-top: 10px; }
        .ticket-info-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 5px; }
        .ticket-info-row span { text-align: right; word-break: break-word; }
        .ticket-item { margin-bottom: 7px; padding-bottom: 6px; border-bottom: 1px dotted #bdbdbd; }
        .ticket-item:last-child { border-bottom: 0; }
        .ticket-item-name { font-weight: 700; margin-bottom: 2px; word-break: break-word; }
        .ticket-item-detail { display: flex; justify-content: space-between; gap: 8px; }
        .ticket-item-detail strong { font-weight: 400; white-space: nowrap; }
        .ticket-item-discount { font-size: 10px; margin-top: 2px; }
        .ticket-totals { margin-top: 4px; }
        .ticket-total-row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
        .ticket-total-row span { white-space: nowrap; text-align: right; }
        .ticket-discount-row { color: #dc3545; }
        .ticket-grand-total { text-align: center; margin: 8px 0; }
        .ticket-grand-total div { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .ticket-grand-total strong { display: block; color: #198754; font-size: 27px; line-height: 1; font-weight: 700; }
        .ticket-payment { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .ticket-payment span { white-space: nowrap; }
        .ticket-footer { text-align: center; line-height: 1.35; }
        .ticket-footer-company { margin-top: 8px; }
        .ticket-pendiente-loading { width: 100%; text-align: center; padding: 50px 20px; font-family: Arial, Helvetica, sans-serif; }

        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body, #root {
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .sidebar, .mobile-topbar, .sidebar-overlay, .no-print { display: none !important; }
          .ticket-page { width: 80mm !important; display: block; padding: 0 !important; margin: 0 !important; }
          .ticket-pendiente { width: 72mm !important; max-width: 72mm !important; margin: 0 auto !important; padding: 2mm 0 0 !important; }
          .ticket-logo { max-width: 62mm !important; max-height: 28mm !important; margin-bottom: 6px !important; }
          .ticket-line { margin: 7px 0 !important; }
          .ticket-item { margin-bottom: 6px !important; padding-bottom: 5px !important; }
          .ticket-footer { padding-bottom: 2mm !important; }
        }
      `}</style>
    </>
  );
}

export default ImprimirCuentaPendiente;
