import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import api from "../services/api";

function FerreteriaHistorialFacturas() {
  const navigate = useNavigate();

  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    try {
      setCargando(true);

      const response = await api.get("/facturas");

      setFacturas(response.data || []);
    } catch (error) {
      console.error("Error al cargar historial:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el historial de facturas.",
      });
    } finally {
      setCargando(false);
    }
  };

  const facturasFiltradas = facturas.filter((factura) => {
    const texto = busqueda.toLowerCase();

    return (
      String(factura.id || "")
        .toLowerCase()
        .includes(texto) ||
      String(factura.cliente_nombre || "")
        .toLowerCase()
        .includes(texto) ||
      String(factura.forma_pago || "")
        .toLowerCase()
        .includes(texto)
    );
  });

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";

    return new Date(fecha).toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const formatearMonto = (monto) => {
    return Number(monto || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const imprimirFactura = (id) => {
    navigate(`/imprimir-factura/${id}`);
  };

  const verFactura = async (id) => {
    try {
      const response = await api.get(`/facturas/${id}`);

      const factura = response.data;

      const detalles = factura.detalles || factura.items || [];

      const productosHtml =
        detalles.length > 0
          ? `
            <div class="table-responsive mt-3">
              <table class="table table-sm table-bordered text-start">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${detalles
                    .map(
                      (detalle) => `
                        <tr>
                          <td>${detalle.producto_nombre || detalle.nombre || "-"}</td>
                          <td>${detalle.cantidad || 0}</td>
                          <td>RD$ ${formatearMonto(
                            detalle.precio_unitario || detalle.precio || 0,
                          )}</td>
                          <td>RD$ ${formatearMonto(detalle.subtotal || 0)}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          : "<p class='text-muted mt-3'>No hay detalles disponibles.</p>";

      Swal.fire({
        title: `Factura #${factura.id}`,
        html: `
          <div class="text-start">
            <p class="mb-1">
              <strong>Fecha:</strong> ${formatearFecha(factura.fecha)}
            </p>

            <p class="mb-1">
              <strong>Cliente:</strong>
              ${factura.cliente_nombre || "Consumidor final"}
            </p>

            <p class="mb-1">
              <strong>Forma de pago:</strong>
              ${factura.forma_pago || "-"}
            </p>

            ${productosHtml}

            <div class="text-end mt-3">
              <strong>Total: RD$ ${formatearMonto(factura.total)}</strong>
            </div>
          </div>
        `,
        width: "850px",
        showCancelButton: true,
        confirmButtonText: "🖨️ Imprimir",
        cancelButtonText: "Cerrar",
      }).then((result) => {
        if (result.isConfirmed) {
          imprimirFactura(id);
        }
      });
    } catch (error) {
      console.error("Error al consultar factura:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar la factura.",
      });
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Historial de Facturas</h2>
          <p className="text-muted mb-0">
            Consulta e imprime las facturas realizadas.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={cargarFacturas}
          disabled={cargando}
        >
          🔄 Actualizar
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por factura, cliente o forma de pago..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>

              <p className="text-muted mt-3 mb-0">Cargando facturas...</p>
            </div>
          ) : facturasFiltradas.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: "3rem" }}>📄</div>

              <h5 className="mt-3">No hay facturas</h5>

              <p className="text-muted mb-0">
                No se encontraron facturas con los criterios indicados.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Factura</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Forma de pago</th>
                    <th className="text-end">Total</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {facturasFiltradas.map((factura) => (
                    <tr key={factura.id}>
                      <td>
                        <strong>#{factura.id}</strong>
                      </td>

                      <td>{formatearFecha(factura.fecha)}</td>

                      <td>{factura.cliente_nombre || "Consumidor final"}</td>

                      <td>
                        <span className="badge bg-secondary">
                          {factura.forma_pago || "-"}
                        </span>
                      </td>

                      <td className="text-end">
                        <strong>RD$ {formatearMonto(factura.total)}</strong>
                      </td>

                      <td>
                        <div className="d-flex justify-content-center gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => verFactura(factura.id)}
                          >
                            👁️ Ver
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => imprimirFactura(factura.id)}
                          >
                            🖨️ Imprimir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FerreteriaHistorialFacturas;
