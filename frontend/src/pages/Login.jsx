import { useState } from "react";

import { useNavigate } from "react-router-dom";

import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const login = async () => {
    try {
      setCargando(true);

      const response = await api.post("/auth/login", {
        usuario,
        password,
      });

      localStorage.setItem("token", response.data.token);

      navigate("/dashboard");
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.mensaje || "Credenciales incorrectas");
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <div className="login-container">
        <div className="login-card">
          <div className="text-center">
            <img src="/LAPS_logo_transparent.png" alt="LAPS" className="logo" />

            <h2 className="titulo">Sistema de Facturación</h2>

            <p className="subtitulo">Ingresa tus credenciales para continuar</p>
          </div>

          <input
            className="form-control mb-3"
            placeholder="Usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />

          <div className="input-group mb-3">
            <input
              type={mostrarPassword ? "text" : "password"}
              className="form-control"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
            >
              {mostrarPassword ? "Ocultar" : "Ver"}
            </button>
          </div>

          <button
            className="btn btn-primary w-100"
            onClick={login}
            disabled={cargando}
          >
            {cargando ? "Ingresando..." : "Entrar"}
          </button>
        </div>
      </div>

      <style>
        {`
          .login-container {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background:
              linear-gradient(
                135deg,
                #1f2937,
                #111827
              );
            padding: 20px;
          }

          .login-card {
            width: 100%;
            max-width: 450px;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow:
              0 15px 40px
              rgba(0, 0, 0, 0.25);
          }

          .logo {
            width: 220px;
            max-height: 180px;
            object-fit: contain;
            margin-bottom: 20px;
          }

          .titulo {
            font-weight: bold;
            margin-bottom: 5px;
          }

          .subtitulo {
            color: gray;
            margin-bottom: 30px;
          }

          .form-control {
            height: 50px;
          }

          .btn-primary {
            height: 50px;
            font-weight: bold;
          }
        `}
      </style>
    </>
  );
}

export default Login;
