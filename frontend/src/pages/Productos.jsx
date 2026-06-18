import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";

function Productos() {
  const [productos, setProductos] = useState([]);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState("");
  const [editStock, setEditStock] = useState("");

  const cargarProductos = async () => {
    try {
      const response = await api.get("/productos");
      setProductos(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const guardarProducto = async () => {
    try {
      await api.post("/productos", {
        nombre,
        precio,
        stock,
      });

      setNombre("");
      setPrecio("");
      setStock("");

      cargarProductos();
    } catch (error) {
      console.error(error);
      alert("Error al guardar producto");
    }
  };

  const iniciarEdicion = (producto) => {
    setEditandoId(producto.id);
    setEditNombre(producto.nombre);
    setEditPrecio(producto.precio);
    setEditStock(producto.stock);
  };

  const guardarEdicion = async () => {
    try {
      await api.put(`/productos/${editandoId}`, {
        nombre: editNombre,
        precio: editPrecio,
        stock: editStock,
      });

      setEditandoId(null);
      cargarProductos();
    } catch (error) {
      console.error(error);
      alert("Error al actualizar producto");
    }
  };

  const eliminarProducto = async (id) => {
    const confirmar = window.confirm("¿Desea eliminar este producto?");

    if (!confirmar) return;

    try {
      await api.delete(`/productos/${id}`);
      cargarProductos();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar producto");
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h2>Productos</h2>

        <div className="card p-3 mb-4">
          <h5>Nuevo Producto</h5>

          <input
            className="form-control mb-2"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            type="number"
            className="form-control mb-2"
            placeholder="Precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />

          <input
            type="number"
            className="form-control mb-2"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />

          <button className="btn btn-success" onClick={guardarProducto}>
            Guardar Producto
          </button>
        </div>

        <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Stock</th>
              <th width="220">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {productos.map((producto) => (
              <tr key={producto.id}>
                <td>{producto.id}</td>

                <td>
                  {editandoId === producto.id ? (
                    <input
                      className="form-control"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                    />
                  ) : (
                    producto.nombre
                  )}
                </td>

                <td>
                  {editandoId === producto.id ? (
                    <input
                      className="form-control"
                      value={editPrecio}
                      onChange={(e) => setEditPrecio(e.target.value)}
                    />
                  ) : (
                    <>RD$ {producto.precio}</>
                  )}
                </td>

                <td>
                  {editandoId === producto.id ? (
                    <input
                      className="form-control"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                    />
                  ) : (
                    producto.stock
                  )}
                </td>

                <td>
                  {editandoId === producto.id ? (
                    <button
                      className="btn btn-success btn-sm me-2"
                      onClick={guardarEdicion}
                    >
                      Guardar
                    </button>
                  ) : (
                    <button
                      className="btn btn-warning btn-sm me-2"
                      onClick={() => iniciarEdicion(producto)}
                    >
                      Editar
                    </button>
                  )}

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => eliminarProducto(producto.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Productos;
