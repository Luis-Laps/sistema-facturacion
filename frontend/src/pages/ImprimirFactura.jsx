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
      console.error("Error al cargar factura:", error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [id]);

  if (!factura || !empresa) {
    return (
      <div className="container mt-5">
        <h3>Cargando...</h3>
      </div>
    );
  }

  const formatearMoneda = (valor) => {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const datosFactura = factura.factura;

  // Subtotal de los productos/servicios
  const subtotalProductos = factura.detalle.reduce((total, item) => {
    return total + Number(item.subtotal || 0);
  }, 0);

  // Descuento general de la factura
  const descuento = Number(datosFactura.descuento || 0);
  const descuentoTipo = datosFactura.descuento_tipo || null;

  // Subtotal después del descuento
  const subtotalConDescuento = Math.max(0, subtotalProductos - descuento);

  // Propina e ITBIS
  const propina = Number(datosFactura.propina || 0);
  const itbis = Number(datosFactura.itbis || 0);

  // Total final guardado en la factura
  const total = Number(datosFactura.total || 0);

  return (
    <>
      <div
        className="container mt-4"
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* ==========================================
            ENCABEZADO
        ========================================== */}
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

          {empresa.telefono && <p className="mb-1">{empresa.telefono}</p>}

          {empresa.direccion && <p className="mb-1">{empresa.direccion}</p>}

          {empresa.correo && <p>{empresa.correo}</p>}

          <p className="text-muted">Reparación, Brillo y Pintura</p>

          <hr />

          <h3>Factura #{datosFactura.id}</h3>
        </div>

        {/* ==========================================
            INFORMACIÓN DE LA FACTURA
        ========================================== */}
        <div className="row mb-4">
          <div className="col-md-4">
            <strong>Cliente:</strong>{" "}
            {datosFactura.cliente || "Consumidor final"}
          </div>

          <div className="col-md-4">
            <strong>Fecha:</strong>{" "}
            {new Date(datosFactura.fecha).toLocaleDateString("es-DO")}
          </div>

          <div className="col-md-4 text-md-end">
            <strong>Forma de pago:</strong>{" "}
            {datosFactura.forma_pago === "EFECTIVO"
              ? "💵 Efectivo"
              : datosFactura.forma_pago === "TARJETA"
                ? "💳 Tarjeta"
                : datosFactura.forma_pago === "TRANSFERENCIA"
                  ? "🏦 Transferencia"
                  : datosFactura.forma_pago || "No especificada"}
          </div>
        </div>

        {/* ==========================================
            DETALLE DE LA FACTURA
        ========================================== */}
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
                <td>RD$ {formatearMoneda(item.precio)}</td>
                <td>RD$ {formatearMoneda(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ==========================================
            RESUMEN DE TOTALES
        ========================================== */}
        <div
          className="mt-4"
          style={{
            maxWidth: "450px",
            marginLeft: "auto",
          }}
        >
          {/* SUBTOTAL */}
          <div className="d-flex justify-content-between mb-2">
            <strong>Subtotal:</strong>

            <span>RD$ {formatearMoneda(subtotalProductos)}</span>
          </div>

          {/* DESCUENTO GENERAL */}
          {descuento > 0 && (
            <>
              <div className="d-flex justify-content-between mb-2">
                <strong>
                  Descuento
                  {descuentoTipo ? ` (${descuentoTipo})` : ""}:
                </strong>

                <span className="text-danger">
                  - RD$ {formatearMoneda(descuento)}
                </span>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <strong>Subtotal con descuento:</strong>

                <span>RD$ {formatearMoneda(subtotalConDescuento)}</span>
              </div>
            </>
          )}

          {/* PROPINA */}
          {datosFactura.propina_aplicada && propina > 0 && (
            <div className="d-flex justify-content-between mb-2">
              <strong>Propina de ley (10%):</strong>

              <span>RD$ {formatearMoneda(propina)}</span>
            </div>
          )}

          {/* ITBIS */}
          {datosFactura.itbis_aplicado && itbis > 0 && (
            <div className="d-flex justify-content-between mb-2">
              <strong>ITBIS (18%):</strong>

              <span>RD$ {formatearMoneda(itbis)}</span>
            </div>
          )}

          <hr />

          {/* TOTAL */}
          <h2
            className="text-end mt-3"
            style={{
              color: "#198754",
              fontWeight: "bold",
            }}
          >
            Total: RD$ {formatearMoneda(total)}
          </h2>
        </div>

        <hr />

        {/* ==========================================
            PIE
        ========================================== */}
        <p className="text-center mt-4">
          Gracias por confiar en {empresa.nombre}
        </p>

        {empresa.telefono && (
          <p className="text-center">Tel: {empresa.telefono}</p>
        )}

        {/* ==========================================
            BOTÓN IMPRIMIR
        ========================================== */}
        <div className="text-center mt-4">
          <button
            className="btn btn-success no-print"
            onClick={() => window.print()}
          >
            🖨️ Imprimir Factura
          </button>
        </div>
      </div>

      {/* ==========================================
          ESTILOS DE IMPRESIÓN
      ========================================== */}
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
