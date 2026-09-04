import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Swal from "sweetalert2";

function Dashboard() {
  const navigate = useNavigate();

  // ==========================================
  // FECHAS
  // ==========================================

  const obtenerFechaLocal = (fecha = new Date()) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const hoy = obtenerFechaLocal();

  const primerDiaMes = obtenerFechaLocal(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoy);

  const [filtroActivo, setFiltroActivo] = useState("mes");

  // ==========================================
  // DATOS DEL DASHBOARD
  // ==========================================

  const [datos, setDatos] = useState({
    productos: 0,
    clientes: 0,
    facturas: 0,
    ventas: 0,
    ganancias: 0,

    // Control de Orden
    manejoMesas: false,

    // Propinas
    propinas: {
      cantidad: 0,
      total: 0,
    },

    ultimasFacturas: [],
  });

  const [cajaAbierta, setCajaAbierta] = useState(null);

  const [cargando, setCargando] = useState(true);

  // ==========================================
  // FORMATO DE MONEDA
  // ==========================================

  const moneda = (valor, decimales = 2) => {
    return Number(valor || 0).toLocaleString("es-DO", {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
  };

  // ==========================================
  // CARGAR DASHBOARD
  // ==========================================

  const cargarDashboard = async () => {
    try {
      setCargando(true);

      const response = await api.get(
        `/dashboard?desde=${desde}&hasta=${hasta}`,
      );

      setDatos({
        productos: response.data.productos ?? 0,

        clientes: response.data.clientes ?? 0,

        facturas: response.data.facturas ?? 0,

        ventas: response.data.ventas ?? 0,

        ganancias: response.data.ganancias ?? 0,

        manejoMesas: response.data.manejoMesas === true,

        propinas: {
          cantidad: Number(response.data.propinas?.cantidad || 0),

          total: Number(response.data.propinas?.total || 0),
        },

        ultimasFacturas: response.data.ultimasFacturas ?? [],
      });
    } catch (error) {
      console.error("Error cargando dashboard:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.mensaje ||
          "No fue posible cargar el dashboard.",
      });
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // VERIFICAR CAJA
  // ==========================================

  const verificarCaja = async () => {
    try {
      const response = await api.get("/cajas/abierta");

      setCajaAbierta(response.data);
    } catch (error) {
      console.error("Error verificando caja:", error);
    }
  };

  // ==========================================
  // FILTROS
  // ==========================================

  const aplicarFiltro = (tipo) => {
    let nuevaDesde = hoy;
    let nuevaHasta = hoy;

    if (tipo === "hoy") {
      nuevaDesde = hoy;
      nuevaHasta = hoy;
    }

    if (tipo === "7dias") {
      const fecha = new Date();

      fecha.setDate(fecha.getDate() - 6);

      nuevaDesde = obtenerFechaLocal(fecha);
      nuevaHasta = hoy;
    }

    if (tipo === "mes") {
      nuevaDesde = primerDiaMes;
      nuevaHasta = hoy;
    }

    setFiltroActivo(tipo);

    setDesde(nuevaDesde);

    setHasta(nuevaHasta);
  };

  // ==========================================
  // ABRIR CAJA
  // ==========================================

  const abrirCaja = async () => {
    const { value, isConfirmed } = await Swal.fire({
      title: "Apertura de Caja",
      text: "Ingrese el monto inicial de la caja.",
      input: "number",
      inputLabel: "Monto inicial",
      inputPlaceholder: "0.00",
      inputAttributes: {
        min: 0,
        step: "0.01",
      },
      confirmButtonText: "Abrir Caja",
      confirmButtonColor: "#198754",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      inputValidator: (value) => {
        if (value === "") {
          return "Debe indicar un monto.";
        }

        if (Number(value) < 0) {
          return "El monto no puede ser negativo.";
        }
      },
    });

    if (!isConfirmed) return;

    try {
      await api.post("/cajas/abrir", {
        monto_inicial: Number(value),
      });

      await verificarCaja();

      Swal.fire({
        icon: "success",
        title: "Caja abierta correctamente",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No fue posible abrir la caja.",
        "error",
      );
    }
  };

  // ==========================================
  // CERRAR CAJA
  // ==========================================

  const cerrarCaja = async () => {
    if (!cajaAbierta) return;

    const debeHaber =
      Number(cajaAbierta.monto_inicial || 0) +
      Number(cajaAbierta.efectivo || 0);

    // ==========================================
    // MODAL DE CIERRE
    // ==========================================

    const { value, isConfirmed } = await Swal.fire({
      title: "Cerrar Caja",

      html: `
        <div style="text-align:left">

          <div class="mb-2">
            <strong>Monto inicial:</strong>
            RD$ ${moneda(cajaAbierta.monto_inicial)}
          </div>

          <div class="mb-2">
            <strong>Ventas en efectivo:</strong>
            RD$ ${moneda(cajaAbierta.efectivo)}
          </div>

          <hr>

          <div>
            <strong>Debe haber:</strong>
          </div>

          <h3 style="color:#198754">
            RD$ ${moneda(debeHaber)}
          </h3>

        </div>
      `,

      input: "number",

      inputLabel: "Dinero contado",

      inputPlaceholder: "0.00",

      inputAttributes: {
        min: 0,
        step: "0.01",
      },

      showCancelButton: true,

      confirmButtonText: "Cerrar Caja",

      cancelButtonText: "Cancelar",

      confirmButtonColor: "#dc3545",

      inputValidator: (value) => {
        if (value === "") {
          return "Debe indicar el dinero contado.";
        }

        if (Number(value) < 0) {
          return "El dinero contado no puede ser negativo.";
        }
      },
    });

    if (!isConfirmed) return;

    try {
      const response = await api.post("/cajas/cerrar", {
        dinero_contado: Number(value),
      });

      await verificarCaja();

      // ==========================================
      // RESULTADO DEL CIERRE
      // ==========================================

      Swal.fire({
        icon: "success",
        title: "Caja cerrada",

        html: `
          <div style="text-align:left">

            <p>
              <strong>Debe haber:</strong>
              RD$ ${moneda(response.data.debeHaber)}
            </p>

            <p>
              <strong>Diferencia:</strong>
              RD$ ${moneda(response.data.diferencia)}
            </p>

            <hr>

            <p>
              <strong>Facturas:</strong>
              ${response.data.cantidadFacturas || 0}
            </p>

            <p>
              <strong>Propinas aplicadas:</strong>
              ${response.data.cantidadPropinasAplicadas || 0}
            </p>

            <p>
              <strong>Total propinas:</strong>
              RD$ ${moneda(response.data.totalPropinas)}
            </p>

            <p>
              <strong>Productos vendidos:</strong>
              ${response.data.cantidadProductos || 0}
            </p>

            <p>
              <strong>Total vendido:</strong>
              RD$ ${moneda(response.data.totalVentas)}
            </p>

          </div>
        `,
      });
    } catch (error) {
      console.error("Error cerrando caja:", error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No fue posible cerrar la caja.",
        "error",
      );
    }
  };

  // ==========================================
  // EFECTOS
  // ==========================================

  useEffect(() => {
    cargarDashboard();
  }, [desde, hasta]);

  useEffect(() => {
    verificarCaja();
  }, []);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      <div className="container-fluid px-3 px-md-4 py-4">
        {/* ======================================
            ENCABEZADO
        ====================================== */}

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1">Dashboard</h2>

            <p className="text-muted mb-0">Resumen general de tu negocio</p>
          </div>

          <button
            className="btn btn-success px-4 py-2 fw-semibold"
            onClick={() => navigate("/facturas")}
          >
            + Nueva Factura
          </button>
        </div>

        {/* ======================================
            FILTROS
        ====================================== */}

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
              <div>
                <div className="fw-semibold mb-2">Período</div>

                <div className="btn-group flex-wrap">
                  <button
                    type="button"
                    className={`btn ${
                      filtroActivo === "hoy"
                        ? "btn-dark"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => aplicarFiltro("hoy")}
                  >
                    Hoy
                  </button>

                  <button
                    type="button"
                    className={`btn ${
                      filtroActivo === "7dias"
                        ? "btn-dark"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => aplicarFiltro("7dias")}
                  >
                    Últimos 7 días
                  </button>

                  <button
                    type="button"
                    className={`btn ${
                      filtroActivo === "mes"
                        ? "btn-dark"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => aplicarFiltro("mes")}
                  >
                    Este mes
                  </button>

                  <button
                    type="button"
                    className={`btn ${
                      filtroActivo === "personalizado"
                        ? "btn-dark"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => setFiltroActivo("personalizado")}
                  >
                    Personalizado
                  </button>
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12 col-sm-auto">
                  <label className="form-label small text-muted mb-1">
                    Desde
                  </label>

                  <input
                    type="date"
                    className="form-control"
                    value={desde}
                    onChange={(e) => {
                      setFiltroActivo("personalizado");

                      setDesde(e.target.value);
                    }}
                  />
                </div>

                <div className="col-12 col-sm-auto">
                  <label className="form-label small text-muted mb-1">
                    Hasta
                  </label>

                  <input
                    type="date"
                    className="form-control"
                    value={hasta}
                    onChange={(e) => {
                      setFiltroActivo("personalizado");

                      setHasta(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================
            KPIs
        ====================================== */}

        <div className="row g-3 mb-4">
          {/* PRODUCTOS */}

          <div className="col-12 col-sm-6 col-xl">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-muted small mb-2">Productos</div>

                    <div className="fs-3 fw-bold">
                      {cargando ? "..." : datos.productos}
                    </div>
                  </div>

                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: "46px",
                      height: "46px",
                      background: "#e8f1ff",
                      fontSize: "21px",
                    }}
                  >
                    📦
                  </div>
                </div>

                <div className="small text-muted mt-3">
                  Productos registrados
                </div>
              </div>
            </div>
          </div>

          {/* CLIENTES */}

          <div className="col-12 col-sm-6 col-xl">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-muted small mb-2">Clientes</div>

                    <div className="fs-3 fw-bold">
                      {cargando ? "..." : datos.clientes}
                    </div>
                  </div>

                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: "46px",
                      height: "46px",
                      background: "#eee7ff",
                      fontSize: "21px",
                    }}
                  >
                    👥
                  </div>
                </div>

                <div className="small text-muted mt-3">
                  Clientes registrados
                </div>
              </div>
            </div>
          </div>

          {/* FACTURAS */}

          <div className="col-12 col-sm-6 col-xl">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-muted small mb-2">Facturas</div>

                    <div className="fs-3 fw-bold">
                      {cargando ? "..." : datos.facturas}
                    </div>
                  </div>

                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: "46px",
                      height: "46px",
                      background: "#fff0df",
                      fontSize: "21px",
                    }}
                  >
                    🧾
                  </div>
                </div>

                <div className="small text-muted mt-3">
                  Facturas en el período
                </div>
              </div>
            </div>
          </div>

          {/* VENTAS */}

          <div className="col-12 col-sm-6 col-xl">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-muted small mb-2">Ventas</div>

                    <div className="fs-3 fw-bold">
                      {cargando ? "..." : `RD$ ${moneda(datos.ventas)}`}
                    </div>
                  </div>

                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: "46px",
                      height: "46px",
                      background: "#fff7d6",
                      fontSize: "21px",
                    }}
                  >
                    💰
                  </div>
                </div>

                <div className="small text-muted mt-3">Ventas del período</div>
              </div>
            </div>
          </div>

          {/* GANANCIAS */}

          <div className="col-12 col-sm-6 col-xl">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-muted small mb-2">Ganancias</div>

                    <div className="fs-3 fw-bold text-success">
                      {cargando ? "..." : `RD$ ${moneda(datos.ganancias)}`}
                    </div>
                  </div>

                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: "46px",
                      height: "46px",
                      background: "#e3f7ea",
                      fontSize: "21px",
                    }}
                  >
                    📈
                  </div>
                </div>

                <div className="small text-muted mt-3">Ganancia estimada</div>
              </div>
            </div>
          </div>

          {/* ======================================
              PROPINAS
              SOLO CONTROL DE ORDEN
          ====================================== */}

          {datos.manejoMesas && (
            <div className="col-12 col-sm-6 col-xl">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="text-muted small mb-2">Propinas</div>

                      <div className="fs-3 fw-bold text-primary">
                        {cargando
                          ? "..."
                          : `RD$ ${moneda(datos.propinas.total)}`}
                      </div>
                    </div>

                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "46px",
                        height: "46px",
                        background: "#e8f1ff",
                        fontSize: "21px",
                      }}
                    >
                      💙
                    </div>
                  </div>

                  <div className="small text-muted mt-3">
                    {datos.propinas.cantidad}{" "}
                    {datos.propinas.cantidad === 1
                      ? "propina aplicada"
                      : "propinas aplicadas"}{" "}
                    en el período
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================
            CAJA
        ====================================== */}

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            {cajaAbierta ? (
              <div>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span
                        className="rounded-circle bg-success"
                        style={{
                          width: "10px",
                          height: "10px",
                        }}
                      />

                      <h5 className="fw-bold mb-0">Caja abierta</h5>
                    </div>

                    <div className="text-muted small">
                      La caja está operativa actualmente.
                    </div>
                  </div>

                  <button
                    className="btn btn-outline-danger"
                    onClick={cerrarCaja}
                  >
                    🔒 Cerrar Caja
                  </button>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-3">
                    <div className="border rounded p-3 h-100">
                      <div className="text-muted small">Apertura</div>

                      <div className="fw-bold mt-1">
                        {new Date(
                          cajaAbierta.fecha_apertura,
                        ).toLocaleTimeString("es-DO", {
                          timeZone: "America/Santo_Domingo",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <div className="border rounded p-3 h-100">
                      <div className="text-muted small">Monto inicial</div>

                      <div className="fw-bold mt-1">
                        RD$ {moneda(cajaAbierta.monto_inicial)}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <div className="border rounded p-3 h-100">
                      <div className="text-muted small">Ventas en efectivo</div>

                      <div className="fw-bold mt-1">
                        RD$ {moneda(cajaAbierta.efectivo)}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <div className="border rounded p-3 h-100">
                      <div className="text-muted small">Debe haber</div>

                      <div className="fw-bold text-success mt-1">
                        RD${" "}
                        {moneda(
                          Number(cajaAbierta.monto_inicial || 0) +
                            Number(cajaAbierta.efectivo || 0),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span
                      className="rounded-circle bg-danger"
                      style={{
                        width: "10px",
                        height: "10px",
                      }}
                    />

                    <h5 className="fw-bold mb-0">Caja cerrada</h5>
                  </div>

                  <div className="text-muted small">
                    No existe una caja abierta actualmente.
                  </div>
                </div>

                <button className="btn btn-success px-4" onClick={abrirCaja}>
                  💵 Abrir Caja
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================
            ÚLTIMAS FACTURAS
        ====================================== */}

        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="p-4 border-bottom d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
              <div>
                <h5 className="fw-bold mb-1">Últimas facturas</h5>

                <div className="small text-muted">
                  Movimientos recientes del negocio
                </div>
              </div>

              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => navigate("/facturas")}
              >
                Ver todas
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4">Factura</th>

                    <th>Cliente</th>

                    <th>Fecha</th>

                    <th className="text-end px-4">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {datos.ultimasFacturas.length > 0 ? (
                    datos.ultimasFacturas.map((factura) => (
                      <tr key={factura.id}>
                        <td className="px-4 fw-semibold">#{factura.id}</td>

                        <td>{factura.cliente || "Cliente general"}</td>

                        <td className="text-muted">
                          {new Date(factura.fecha).toLocaleDateString("es-DO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="text-end px-4 fw-semibold">
                          RD$ {moneda(factura.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted">
                        No hay facturas registradas en este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
