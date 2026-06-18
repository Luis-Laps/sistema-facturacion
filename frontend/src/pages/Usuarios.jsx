import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);

  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("CAJERO");

  const [editandoId, setEditandoId] = useState(null);

  const [editNombre, setEditNombre] = useState("");

  const [editUsuario, setEditUsuario] = useState("");

  const [editRol, setEditRol] = useState("CAJERO");

  const cargarUsuarios = async () => {
    try {
      const response = await api.get("/usuarios");

      setUsuarios(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const guardarUsuario = async () => {
    try {
      await api.post("/usuarios", {
        nombre,
        usuario,
        password,
        rol,
      });

      setNombre("");
      setUsuario("");
      setPassword("");
      setRol("CAJERO");

      cargarUsuarios();
    } catch (error) {
      console.error(error);

      alert("Error al guardar");
    }
  };

  const iniciarEdicion = (u) => {
    setEditandoId(u.id);

    setEditNombre(u.nombre);

    setEditUsuario(u.usuario);

    setEditRol(u.rol);
  };

  const guardarEdicion = async () => {
    try {
      await api.put(`/usuarios/${editandoId}`, {
        nombre: editNombre,
        usuario: editUsuario,
        rol: editRol,
      });

      setEditandoId(null);

      cargarUsuarios();
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarUsuario = async (id) => {
    if (!window.confirm("¿Eliminar usuario?")) return;

    try {
      await api.delete(`/usuarios/${id}`);

      cargarUsuarios();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        <h2>Usuarios</h2>

        <div className="card p-3 mb-4">
          <h5>Nuevo Usuario</h5>

          <input
            className="form-control mb-2"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            className="form-control mb-2"
            placeholder="Usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />

          <input
            type="password"
            className="form-control mb-2"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <select
            className="form-control mb-3"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
          >
            <option value="ADMIN">ADMIN</option>

            <option value="CAJERO">CAJERO</option>
          </select>

          <button className="btn btn-success" onClick={guardarUsuario}>
            Guardar Usuario
          </button>
        </div>

        <table className="table table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>

                <td>
                  {editandoId === u.id ? (
                    <input
                      className="form-control"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                    />
                  ) : (
                    u.nombre
                  )}
                </td>

                <td>
                  {editandoId === u.id ? (
                    <input
                      className="form-control"
                      value={editUsuario}
                      onChange={(e) => setEditUsuario(e.target.value)}
                    />
                  ) : (
                    u.usuario
                  )}
                </td>

                <td>
                  {editandoId === u.id ? (
                    <select
                      className="form-control"
                      value={editRol}
                      onChange={(e) => setEditRol(e.target.value)}
                    >
                      <option value="ADMIN">ADMIN</option>

                      <option value="CAJERO">CAJERO</option>
                    </select>
                  ) : (
                    u.rol
                  )}
                </td>

                <td>
                  {editandoId === u.id ? (
                    <button
                      className="btn btn-success btn-sm me-2"
                      onClick={guardarEdicion}
                    >
                      Guardar
                    </button>
                  ) : (
                    <button
                      className="btn btn-warning btn-sm me-2"
                      onClick={() => iniciarEdicion(u)}
                    >
                      Editar
                    </button>
                  )}

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => eliminarUsuario(u.id)}
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

export default Usuarios;
