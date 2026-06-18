import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Dashboard() {
  const [periodo, setPeriodo] = useState("dia");

  const [datos, setDatos] = useState({
    productos: 0,
    clientes: 0,
    facturas: 0,
    ventas: 0,
    ultimasFacturas: [],
  });

  const cargarDashboard = async () => {
    try {
      const response = await api.get(`/dashboard?periodo=${periodo}`);

      setDatos(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, [periodo]);

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h1 className="mb-4">Dashboard</h1>

        <div className="card p-3 mb-4">
          <label className="form-label">Periodo de Ventas</label>

          <select
            className="form-control"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            <option value="dia">Día</option>

            <option value="semana">Semana</option>

            <option value="mes">Mes</option>

            <option value="anio">Año</option>
          </select>
        </div>

        <div className="row">
          <div className="col-md-3 mb-3">
            <div className="card shadow text-center">
              <div className="card-body">
                <h5>Productos</h5>
                <h2>{datos.productos}</h2>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="card shadow text-center">
              <div className="card-body">
                <h5>Clientes</h5>
                <h2>{datos.clientes}</h2>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="card shadow text-center">
              <div className="card-body">
                <h5>Facturas</h5>
                <h2>{datos.facturas}</h2>
              </div>
            </div>
          </div>

          <div className="col-md-3 mb-3">
            <div className="card shadow text-center">
              <div className="card-body">
                <h5>Ventas</h5>
                <h2>RD$ {datos.ventas.toLocaleString()}</h2>
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
