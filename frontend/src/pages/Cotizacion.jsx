import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function Cotizacion() {
  const [empresa, setEmpresa] = useState(null);
  const [productos, setProductos] = useState([]);

  const [cliente, setCliente] = useState("");
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState("");
  const [descuento, setDescuento] = useState(0);

  const [items, setItems] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // ==========================================
  // CARGAR DATOS
  // ==========================================

  const cargarDatos = async () => {
    try {
      setCargando(true);

      const [empresaRes, productosRes] = await Promise.all([
        api.get("/configuracion"),
        api.get("/productos?limit=10000"),
      ]);

      setEmpresa(empresaRes.data);

      const productosData = productosRes.data;

      // El endpoint de productos devuelve { data: [...] }
      // pero dejamos compatibilidad por si devuelve directamente un array.
      setProductos(
        Array.isArray(productosData) ? productosData : productosData.data || [],
      );
    } catch (error) {
      console.error("Error al cargar datos:", error);

      alert(
        error.response?.data?.mensaje || "No se pudieron cargar los datos.",
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ==========================================
  // BUSCAR PRODUCTOS
  // ==========================================

  const productosFiltrados = productos.filter((producto) => {
    const texto = busquedaProducto.trim().toLowerCase();

    if (!texto) return false;

    return (
      producto.nombre?.toLowerCase().includes(texto) ||
      producto.codigo?.toLowerCase().includes(texto)
    );
  });

  // ==========================================
  // SELECCIONAR PRODUCTO
  // ==========================================

  const seleccionarProducto = (producto) => {
    setProductoSeleccionado(producto);

    setBusquedaProducto(`${producto.codigo} — ${producto.nombre}`);

    setPrecio(producto.precio_venta);

    setCantidad(1);
    setDescuento(0);

    setMostrarResultados(false);
  };

  // ==========================================
  // AGREGAR PRODUCTO
  // ==========================================

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      alert("Seleccione un producto.");
      return;
    }

    const cantidadNumerica = Number(cantidad);
    const precioNumerico = Number(precio);
    const descuentoNumerico = Number(descuento || 0);

    if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
      alert("La cantidad debe ser mayor que cero.");
      return;
    }

    if (!Number.isFinite(precioNumerico) || precioNumerico < 0) {
      alert("El precio no es válido.");
      return;
    }

    if (!Number.isFinite(descuentoNumerico) || descuentoNumerico < 0) {
      alert("El descuento no es válido.");
      return;
    }

    const subtotal = precioNumerico * cantidadNumerica - descuentoNumerico;

    if (subtotal < 0) {
      alert("El descuento no puede ser mayor al subtotal.");
      return;
    }

    const nuevoItem = {
      id: productoSeleccionado.id,
      codigo: productoSeleccionado.codigo,
      nombre: productoSeleccionado.nombre,
      cantidad: cantidadNumerica,
      precio: precioNumerico,
      descuento: descuentoNumerico,
      subtotal,
    };

    setItems((anteriores) => [...anteriores, nuevoItem]);

    setProductoSeleccionado(null);
    setBusquedaProducto("");
    setCantidad(1);
    setPrecio("");
    setDescuento(0);
  };

  // ==========================================
  // ELIMINAR PRODUCTO
  // ==========================================

  const eliminarItem = (index) => {
    setItems((anteriores) => anteriores.filter((_, i) => i !== index));
  };

  // ==========================================
  // TOTALES
  // ==========================================

  const subtotalGeneral = items.reduce(
    (total, item) => total + item.precio * item.cantidad,
    0,
  );

  const descuentosGeneral = items.reduce(
    (total, item) => total + item.descuento,
    0,
  );

  const totalGeneral = subtotalGeneral - descuentosGeneral;

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
  // FECHA
  // ==========================================

  const fechaActual = new Date();

  const fechaTexto = fechaActual.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // ==========================================
  // DESCARGAR PDF
  // ==========================================

  const descargarPDF = async () => {
    if (!empresa) {
      alert("La información de la empresa todavía no está disponible.");
      return;
    }

    if (!cliente.trim()) {
      alert("Ingrese el nombre del cliente.");
      return;
    }

    if (items.length === 0) {
      alert("Agregue al menos un producto a la cotización.");
      return;
    }

    try {
      setGenerandoPDF(true);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const margen = 15;

      // ==========================================
      // COLOR PRINCIPAL
      // ==========================================

      const colorHex = empresa.color_principal || "#198754";

      const hexToRgb = (hex) => {
        const limpio = hex.replace("#", "");

        return {
          r: parseInt(limpio.substring(0, 2), 16),
          g: parseInt(limpio.substring(2, 4), 16),
          b: parseInt(limpio.substring(4, 6), 16),
        };
      };

      const color = hexToRgb(colorHex);

      // ==========================================
      // ENCABEZADO
      // ==========================================

      pdf.setFillColor(color.r, color.g, color.b);

      pdf.rect(0, 0, 210, 7, "F");

      // ==========================================
      // LOGO
      // ==========================================

      let posicionY = 18;

      if (empresa.logo_url) {
        try {
          pdf.addImage(empresa.logo_url, "PNG", margen, posicionY, 35, 25);
        } catch (error) {
          console.warn("No fue posible cargar el logo:", error);
        }
      }

      const posicionEmpresaX = empresa.logo_url ? 55 : margen;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);

      pdf.text(empresa.nombre || "Empresa", posicionEmpresaX, posicionY + 7);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);

      let infoY = posicionY + 13;

      if (empresa.rnc) {
        pdf.text(`RNC: ${empresa.rnc}`, posicionEmpresaX, infoY);

        infoY += 5;
      }

      if (empresa.telefono) {
        pdf.text(`Tel: ${empresa.telefono}`, posicionEmpresaX, infoY);

        infoY += 5;
      }

      if (empresa.correo) {
        pdf.text(`Correo: ${empresa.correo}`, posicionEmpresaX, infoY);

        infoY += 5;
      }

      if (empresa.direccion) {
        pdf.text(`Dirección: ${empresa.direccion}`, posicionEmpresaX, infoY, {
          maxWidth: 135,
        });
      }

      // ==========================================
      // TITULO
      // ==========================================

      pdf.setTextColor(color.r, color.g, color.b);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);

      pdf.text("COTIZACIÓN", 195, 22, {
        align: "right",
      });

      pdf.setTextColor(0, 0, 0);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");

      pdf.text(`Fecha: ${fechaTexto}`, 195, 29, {
        align: "right",
      });

      // ==========================================
      // INFORMACIÓN DEL CLIENTE
      // ==========================================

      pdf.setDrawColor(color.r, color.g, color.b);

      pdf.line(margen, 50, 195, 50);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);

      pdf.text("CLIENTE", margen, 58);

      pdf.setFont("helvetica", "normal");

      pdf.text(cliente.trim(), margen, 65);

      // ==========================================
      // TABLA
      // ==========================================

      const filas = items.map((item) => [
        item.codigo || "",
        item.nombre,
        item.cantidad,
        `RD$ ${dinero(item.precio)}`,
        `RD$ ${dinero(item.descuento)}`,
        `RD$ ${dinero(item.subtotal)}`,
      ]);

      autoTable(pdf, {
        startY: 75,

        head: [["Código", "Producto", "Cant.", "Precio", "Descuento", "Total"]],

        body: filas,

        theme: "grid",

        headStyles: {
          fillColor: [color.r, color.g, color.b],

          textColor: 255,

          fontStyle: "bold",
        },

        styles: {
          fontSize: 9,
          cellPadding: 3,
        },

        columnStyles: {
          0: {
            cellWidth: 25,
          },

          1: {
            cellWidth: 55,
          },

          2: {
            cellWidth: 18,
            halign: "center",
          },

          3: {
            cellWidth: 28,
            halign: "right",
          },

          4: {
            cellWidth: 28,
            halign: "right",
          },

          5: {
            cellWidth: 30,
            halign: "right",
          },
        },

        margin: {
          left: margen,
          right: margen,
        },
      });

      // ==========================================
      // TOTALES
      // ==========================================

      let finalY = pdf.lastAutoTable.finalY + 10;

      if (finalY > 245) {
        pdf.addPage();

        finalY = 20;
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      pdf.text("Subtotal:", 145, finalY);

      pdf.text(`RD$ ${dinero(subtotalGeneral)}`, 195, finalY, {
        align: "right",
      });

      finalY += 7;

      pdf.text("Descuentos:", 145, finalY);

      pdf.text(`RD$ ${dinero(descuentosGeneral)}`, 195, finalY, {
        align: "right",
      });

      finalY += 9;

      pdf.setDrawColor(color.r, color.g, color.b);

      pdf.line(140, finalY - 4, 195, finalY - 4);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);

      pdf.setTextColor(color.r, color.g, color.b);

      pdf.text("TOTAL:", 145, finalY + 4);

      pdf.text(`RD$ ${dinero(totalGeneral)}`, 195, finalY + 4, {
        align: "right",
      });

      // ==========================================
      // NOTA
      // ==========================================

      finalY += 22;

      pdf.setTextColor(0, 0, 0);

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);

      pdf.text("Esta cotización no representa una factura.", margen, finalY);

      pdf.text(
        "Los precios y condiciones están sujetos a confirmación.",
        margen,
        finalY + 5,
      );

      // ==========================================
      // PIE
      // ==========================================

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);

      pdf.setTextColor(100, 100, 100);

      pdf.text(empresa.nombre || "", 105, 285, {
        align: "center",
      });

      if (empresa.telefono) {
        pdf.text(`Tel: ${empresa.telefono}`, 105, 290, {
          align: "center",
        });
      }

      // ==========================================
      // DESCARGA
      // ==========================================

      const nombreArchivoCliente = cliente
        .trim()
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "")
        .replace(/\s+/g, "-");

      pdf.save(`Cotizacion-${nombreArchivoCliente || "Cliente"}.pdf`);
    } catch (error) {
      console.error("Error generando cotización:", error);

      alert("No fue posible generar la cotización.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {
    return (
      <>
        <Navbar />

        <div className="container mt-4">
          <div className="text-center py-5">
            <div className="spinner-border text-success" role="status" />

            <p className="mt-3">Cargando información...</p>
          </div>
        </div>
      </>
    );
  }

  // ==========================================
  // PANTALLA
  // ==========================================

  return (
    <>
      <Navbar />

      <div className="container mt-4 mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2>Cotización</h2>

            <p className="text-muted mb-0">
              Genera una cotización sin guardarla en el sistema.
            </p>
          </div>

          <button
            className="btn btn-success"
            onClick={descargarPDF}
            disabled={generandoPDF || items.length === 0}
          >
            {generandoPDF ? "Generando..." : "⬇ Descargar PDF"}
          </button>
        </div>

        <div className="row g-4">
          {/* ================================= */}
          {/* FORMULARIO */}
          {/* ================================= */}

          <div className="col-lg-5">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h5 className="mb-4">Datos de la cotización</h5>

                {/* CLIENTE */}

                <div className="mb-4">
                  <label className="form-label">Nombre del cliente</label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nombre del cliente"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                  />

                  <small className="text-muted">
                    Este nombre no se guardará como cliente.
                  </small>
                </div>

                <hr />

                <h5 className="mb-3">Agregar producto</h5>

                {/* BUSCADOR */}

                <div className="position-relative mb-3">
                  <label className="form-label">Producto</label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por nombre o código..."
                    value={busquedaProducto}
                    onChange={(e) => {
                      setBusquedaProducto(e.target.value);

                      setMostrarResultados(true);

                      setProductoSeleccionado(null);

                      setPrecio("");
                    }}
                    onFocus={() => {
                      if (busquedaProducto.trim()) {
                        setMostrarResultados(true);
                      }
                    }}
                  />

                  {mostrarResultados && busquedaProducto.trim() && (
                    <div
                      className="position-absolute bg-white border rounded shadow w-100"
                      style={{
                        zIndex: 1000,
                        maxHeight: "250px",
                        overflowY: "auto",
                      }}
                    >
                      {productosFiltrados.length === 0 ? (
                        <div className="p-3 text-muted">
                          No se encontraron productos.
                        </div>
                      ) : (
                        productosFiltrados.map((producto) => (
                          <button
                            key={producto.id}
                            type="button"
                            className="w-100 text-start border-0 bg-white p-2"
                            onClick={() => seleccionarProducto(producto)}
                          >
                            <div className="fw-semibold">{producto.nombre}</div>

                            <small className="text-muted">
                              Código: {producto.codigo} | Precio: RD${" "}
                              {dinero(producto.precio_venta)}
                            </small>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* CANTIDAD */}

                <div className="mb-3">
                  <label className="form-label">Cantidad</label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-control"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                </div>

                {/* PRECIO */}

                <div className="mb-3">
                  <label className="form-label">Precio</label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                  />
                </div>

                {/* DESCUENTO */}

                <div className="mb-3">
                  <label className="form-label">Descuento</label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                  />
                </div>

                <button
                  className="btn btn-primary w-100"
                  onClick={agregarProducto}
                >
                  + Agregar producto
                </button>
              </div>
            </div>
          </div>

          {/* ================================= */}
          {/* VISTA PREVIA */}
          {/* ================================= */}

          <div className="col-lg-7">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <div
                  className="border rounded p-4"
                  style={{
                    borderTop: `5px solid ${
                      empresa?.color_principal || "#198754"
                    }`,
                  }}
                >
                  {/* ENCABEZADO */}

                  <div className="text-center mb-4">
                    {empresa?.logo_url ? (
                      <img
                        src={empresa.logo_url}
                        alt="Logo de la empresa"
                        style={{
                          maxWidth: "180px",
                          maxHeight: "100px",
                          objectFit: "contain",
                        }}
                        className="mb-3"
                      />
                    ) : null}

                    <h3 className="mb-1">
                      {empresa?.nombre || "Nombre de la empresa"}
                    </h3>

                    {empresa?.rnc && <div>RNC: {empresa.rnc}</div>}

                    {empresa?.telefono && <div>{empresa.telefono}</div>}

                    {empresa?.direccion && <div>{empresa.direccion}</div>}

                    {empresa?.correo && <div>{empresa.correo}</div>}

                    <hr />

                    <h4
                      style={{
                        color: empresa?.color_principal || "#198754",
                        fontWeight: "bold",
                      }}
                    >
                      COTIZACIÓN
                    </h4>
                  </div>

                  {/* CLIENTE / FECHA */}

                  <div className="row mb-4">
                    <div className="col-md-6">
                      <strong>Cliente:</strong> {cliente || "No especificado"}
                    </div>

                    <div className="col-md-6 text-md-end">
                      <strong>Fecha:</strong> {fechaTexto}
                    </div>
                  </div>

                  {/* TABLA */}

                  {items.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <div style={{ fontSize: "2rem" }}>🛒</div>

                      <p className="mb-1 mt-2">No hay productos agregados.</p>

                      <small>Busca un producto para comenzar.</small>
                    </div>
                  ) : (
                    <div>
                      {/* ENCABEZADO */}
                      <div
                        className="d-none d-md-grid"
                        style={{
                          gridTemplateColumns: "1fr 70px 120px 120px",
                          gap: "15px",
                          padding: "0 15px 10px",
                          borderBottom: "1px solid #e5e7eb",
                          color: "#6b7280",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          textTransform: "uppercase",
                        }}
                      >
                        <span>Producto</span>
                        <span className="text-center">Cant.</span>
                        <span className="text-end">Precio</span>
                        <span className="text-end">Total</span>
                      </div>

                      {/* PRODUCTOS */}
                      {items.map((item, index) => (
                        <div
                          key={`${item.id}-${index}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 70px 120px 120px",
                            gap: "15px",
                            alignItems: "center",
                            padding: "16px 15px",
                            borderBottom: "1px solid #eef0f2",
                          }}
                        >
                          {/* PRODUCTO */}
                          <div>
                            <div
                              style={{
                                fontWeight: "600",
                                fontSize: "0.95rem",
                              }}
                            >
                              {item.nombre}
                            </div>

                            <small
                              style={{
                                color: "#9ca3af",
                              }}
                            >
                              {item.codigo}
                            </small>

                            {item.descuento > 0 && (
                              <div
                                style={{
                                  color: "#dc3545",
                                  fontSize: "0.75rem",
                                  marginTop: "3px",
                                }}
                              >
                                Descuento: RD$ {dinero(item.descuento)}
                              </div>
                            )}
                          </div>

                          {/* CANTIDAD */}
                          <div className="text-center">{item.cantidad}</div>

                          {/* PRECIO */}
                          <div className="text-end">
                            <div>RD$ {dinero(item.precio)}</div>
                          </div>

                          {/* TOTAL + ELIMINAR */}
                          <div className="text-end">
                            <div
                              style={{
                                fontWeight: "600",
                              }}
                            >
                              RD$ {dinero(item.subtotal)}
                            </div>

                            <button
                              type="button"
                              className="btn btn-sm p-0 mt-1"
                              style={{
                                color: "#dc3545",
                                fontSize: "0.75rem",
                              }}
                              onClick={() => eliminarItem(index)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* TOTALES */}

                  {items.length > 0 && (
                    <div className="d-flex justify-content-end mt-4">
                      <div
                        style={{
                          minWidth: "260px",
                        }}
                      >
                        <div className="d-flex justify-content-between mb-2">
                          <span>Subtotal:</span>

                          <strong>RD$ {dinero(subtotalGeneral)}</strong>
                        </div>

                        <div className="d-flex justify-content-between mb-2">
                          <span>Descuentos:</span>

                          <strong>RD$ {dinero(descuentosGeneral)}</strong>
                        </div>

                        <hr />

                        <div className="d-flex justify-content-between">
                          <strong>Total:</strong>

                          <strong
                            style={{
                              color: empresa?.color_principal || "#198754",
                              fontSize: "1.3rem",
                            }}
                          >
                            RD$ {dinero(totalGeneral)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NOTA */}

                  <div className="text-center text-muted mt-5">
                    <small>Esta cotización no representa una factura.</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Cotizacion;
