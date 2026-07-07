import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import Swal from "sweetalert2";

function Dashboard() {
  const hoy = new Date().toISOString().split("T")[0];

  const primerDiaMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];

  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoy);

  const [datos, setDatos] = useState({
    productos: 0,
    clientes: 0,
    facturas: 0,
    ventas: 0,
    ganancias: 0,
    ultimasFacturas: [],
  });

  const [cajaAbierta, setCajaAbierta] = useState(null);

  const cargarDashboard = async () => {
    try {
      const response = await api.get(
        `/dashboard?desde=${desde}&hasta=${hasta}`,
      );

      setDatos(response.data);
    } catch (error) {
      console.error(error);
    }
  };
  const verificarCaja = async () => {
    try {
      const response = await api.get("/cajas/abierta");
      setCajaAbierta(response.data);
    } catch (error) {
      console.error(error);
    }
  };
  const abrirCaja = async () => {
    const { value, isConfirmed } = await Swal.fire({
      title: "Apertura de Caja",
      text: "Ingrese el monto inicial de la caja",
      input: "number",
      inputLabel: "Monto inicial",
      inputPlaceholder: "0.00",
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

      Swal.fire({
        icon: "success",
        title: "Caja abierta correctamente",
        timer: 1500,
        showConfirmButton: false,
      });

      verificarCaja();
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No fue posible abrir la caja.",
        "error",
      );
    }
  };

  const cerrarCaja = async () => {
    if (!cajaAbierta) return;

    const debeHaber =
      Number(cajaAbierta.monto_inicial) + Number(cajaAbierta.efectivo);

    const { value, isConfirmed } = await Swal.fire({
      title: "Cerrar Caja",
      html: `
      <div style="text-align:left">
        <p><strong>Monto inicial:</strong> RD$ ${Number(
          cajaAbierta.monto_inicial,
        ).toLocaleString("es-DO")}</p>

        <p><strong>Ventas en efectivo:</strong> RD$ ${Number(
          cajaAbierta.efectivo,
        ).toLocaleString("es-DO")}</p>

        <hr>

        <h4>Debe haber:</h4>

        <h3 style="color:#198754">
          RD$ ${debeHaber.toLocaleString("es-DO")}
        </h3>
      </div>
    `,
      input: "number",
      inputLabel: "Dinero contado",
      inputPlaceholder: "0.00",
      showCancelButton: true,
      confirmButtonText: "Cerrar Caja",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
      inputValidator: (value) => {
        if (value === "") {
          return "Debe indicar el dinero contado.";
        }
      },
    });

    if (!isConfirmed) return;

    try {
      const response = await api.post("/cajas/cerrar", {
        dinero_contado: Number(value),
      });

      Swal.fire({
        icon: "success",
        title: "Caja cerrada",
        html: `
        <p><strong>Debe haber:</strong> RD$ ${Number(
          response.data.debeHaber,
        ).toLocaleString("es-DO")}</p>

        <p><strong>Diferencia:</strong> RD$ ${Number(
          response.data.diferencia,
        ).toLocaleString("es-DO")}</p>
      `,
      });

      verificarCaja();
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No fue posible cerrar la caja.",
        "error",
      );
    }
  };

  useEffect(() => {
    cargarDashboard();
    verificarCaja();
  }, [desde, hasta]);

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h1 className="mb-4">Dashboard</h1>

        <div className="card p-3 mb-4">
          <div className="row">
            <div className="col-md-6">
              <label>Desde</label>

              <input
                type="date"
                className="form-control"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label>Hasta</label>

              <input
                type="date"
                className="form-control"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl col-lg col-md-6">
            <div
              className="card text-white shadow h-100"
              style={{
                background: "#0d6efd",
                border: "none",
                borderRadius: "15px",
              }}
            >
              <div className="card-body text-center">
                <h5>📦 Productos</h5>

                <h2 className="fw-bold">{datos.productos}</h2>
              </div>
            </div>
          </div>

          <div className="col-xl col-lg col-md-6">
            <div
              className="card text-white shadow h-100"
              style={{
                background: "#6f42c1",
                border: "none",
                borderRadius: "15px",
              }}
            >
              <div className="card-body text-center">
                <h5>👥 Clientes</h5>

                <h2 className="fw-bold">{datos.clientes}</h2>
              </div>
            </div>
          </div>

          <div className="col-xl col-lg col-md-6">
            <div
              className="card text-white shadow h-100"
              style={{
                background: "#fd7e14",
                border: "none",
                borderRadius: "15px",
              }}
            >
              <div className="card-body text-center">
                <h5>🧾 Facturas</h5>

                <h2 className="fw-bold">{datos.facturas}</h2>
              </div>
            </div>
          </div>
          <div className="col-xl col-lg col-md-6">
            <div
              className="card shadow h-100"
              style={{
                background: "#ffc107",
                border: "none",
                borderRadius: "15px",
              }}
            >
              <div className="card-body text-center">
                <h5>💰 Ventas</h5>

                <h2 className="fw-bold">
                  RD$ {Number(datos.ventas).toLocaleString("es-DO")}
                </h2>
              </div>
            </div>
          </div>

          <div className="col-xl col-lg col-md-6">
            <div
              className="card text-white shadow h-100"
              style={{
                background: "#198754",
                border: "none",
                borderRadius: "15px",
              }}
            >
              <div className="card-body text-center">
                <h5>📈 Ganancias</h5>

                <h2 className="fw-bold">
                  RD${" "}
                  {Number(datos.ganancias).toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </h2>
              </div>
            </div>
          </div>
        </div>
        <div className="card shadow mb-4 border-0">
          <div className="card-body">
            {cajaAbierta ? (
              <div className="row align-items-center">
                <div className="col-md-9">
                  <h4 className="text-success mb-3">🟢 Caja Abierta</h4>

                  <div className="row">
                    <div className="col-md-3">
                      <strong>Apertura</strong>

                      <p>
                        {new Date(
                          cajaAbierta.fecha_apertura,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="col-md-3">
                      <strong>Monto Inicial</strong>

                      <p>
                        RD${" "}
                        {Number(cajaAbierta.monto_inicial).toLocaleString(
                          "es-DO",
                        )}
                      </p>
                    </div>

                    <div className="col-md-3">
                      <strong>Ventas Efectivo</strong>

                      <p>
                        RD${" "}
                        {Number(cajaAbierta.efectivo).toLocaleString("es-DO")}
                      </p>
                    </div>

                    <div className="col-md-3">
                      <strong>Debe Haber</strong>

                      <p className="fw-bold text-success">
                        RD${" "}
                        {(
                          Number(cajaAbierta.monto_inicial) +
                          Number(cajaAbierta.efectivo)
                        ).toLocaleString("es-DO")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 text-end">
                  <button
                    className="btn btn-danger btn-lg"
                    onClick={cerrarCaja}
                  >
                    🔒 Cerrar Caja
                  </button>
                </div>
              </div>
            ) : (
              <div className="row align-items-center">
                <div className="col-md-9">
                  <h4 className="text-danger">🔴 Caja Cerrada</h4>

                  <p className="mb-0">No existe una caja abierta.</p>
                </div>

                <div className="col-md-3 text-end">
                  <button
                    className="btn btn-success btn-lg"
                    onClick={abrirCaja}
                  >
                    💵 Abrir Caja
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="card shadow mt-4">
          <div className="card-header">
            <h5 className="mb-0">Últimas Facturas</h5>
          </div>

          <div className="card-body">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {datos.ultimasFacturas.length > 0 ? (
                  datos.ultimasFacturas.map((factura) => (
                    <tr key={factura.id}>
                      <td>{factura.id}</td>

                      <td>{factura.cliente}</td>

                      <td>{new Date(factura.fecha).toLocaleDateString()}</td>

                      <td>
                        RD$ {Number(factura.total).toLocaleString("es-DO")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">
                      No hay facturas registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
