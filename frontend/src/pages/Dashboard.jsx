import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";

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

  useEffect(() => {
    cargarDashboard();
  }, [desde, hasta]);

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h1 className="mb-4">Dashboard</h1>

        <div className="card p-3 mb-4">
          <div className="row">
            <div className="col-md-5">
              <label>Desde</label>

              <input
                type="date"
                className="form-control"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>

            <div className="col-md-5">
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

        <div className="row">
          <div className="col-xl col-lg col-md-6 mb-3">
            <div
              className="card text-white shadow"
              style={{
                background: "#0d6efd",
                border: "none",
                borderRadius: "15px",
              }}
            >
              {" "}
              <div className="card-body">
                <h5>📦 Productos</h5>
                <h2 className="fw-bold">{datos.productos}</h2>
              </div>
            </div>
          </div>

          <div className="col-xl col-lg col-md-6 mb-3">
            <div
              className="card text-white shadow"
              style={{
                background: "#6f42c1",
                border: "none",
                borderRadius: "15px",
              }}
            >
              {" "}
              <div className="card-body">
                <h5>👥 Clientes</h5>
                <h2 className="fw-bold">{datos.clientes}</h2>
              </div>
            </div>
          </div>

          <div className="col-xl col-lg col-md-6 mb-3">
            <div
              className="card text-white shadow"
              style={{
                background: "#fd7e14",
                border: "none",
                borderRadius: "15px",
              }}
            >
              <div className="card-body">
                <h5>🧾 Facturas</h5>
                <h2 className="fw-bold">{datos.facturas}</h2>
              </div>
            </div>
          </div>

          <div className="col-xl col-lg col-md-6 mb-3">
            <div
              className="card shadow"
              style={{
                background: "#ffc107",
                border: "none",
                borderRadius: "15px",
              }}
            >
              {" "}
              <div className="card-body">
                <h5>💰 Ventas</h5>

                <h2 className="fw-bold">
                  RD$ {Number(datos.ventas).toLocaleString("es-DO")}
                </h2>
              </div>
            </div>
          </div>
          <div className="col-xl col-lg col-md-6 mb-3">
            <div
              className="card text-white shadow"
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
                {datos.ultimasFacturas?.length > 0 ? (
                  datos.ultimasFacturas.map((factura) => (
                    <tr key={factura.id}>
                      <td>{factura.id}</td>

                      <td>{factura.cliente}</td>

                      <td>{new Date(factura.fecha).toLocaleDateString()}</td>

                      <td>RD$ {Number(factura.total).toLocaleString()}</td>
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
