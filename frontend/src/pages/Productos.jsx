import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import api from "../services/api";
import Navbar from "../components/Navbar";

const crearProductoVacio = () => ({
  codigo: "",
  nombre: "",
  categoria_id: "",
  descripcion: "",
  costo_compra: 0,
  porcentaje_ganancia: 30,
  precio_venta: 0,
  stock: 0,
  tipo: "PRODUCTO",
});

function Productos() {
  const navigate = useNavigate();

  // ==========================================
  // PAGINACIÓN
  // ==========================================

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);

  const limite = 10;

  // ==========================================
  // DATOS
  // ==========================================

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [inversion, setInversion] = useState(0);
  const [gananciaProyectada, setGananciaProyectada] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);

  const [busqueda, setBusqueda] = useState("");

  // ==========================================
  // MODAL
  // ==========================================

  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [producto, setProducto] = useState(crearProductoVacio());

  // ==========================================
  // MÓDULOS DE LA EMPRESA
  // ==========================================

  const [tieneInventario, setTieneInventario] = useState(false);

  // ==========================================
  // CARGAR PRODUCTOS
  // ==========================================

  const cargarProductos = async () => {
    try {
      const response = await api.get(`/productos?page=${page}&limit=${limite}`);

      setProductos(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalProductos(response.data.total || 0);

      setInversion(response.data.inversion || 0);
      setGananciaProyectada(response.data.gananciaProyectada || 0);
      setValorTotal(response.data.valorTotal || 0);
    } catch (error) {
      console.error("Error al cargar productos:", error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No se pudieron cargar los productos.",
        "error",
      );
    }
  };

  // ==========================================
  // CARGAR CATEGORÍAS
  // ==========================================

  const cargarCategorias = async () => {
    try {
      const response = await api.get("/categorias");

      setCategorias(response.data || []);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  };

  // ==========================================
  // CARGAR MÓDULOS DE LA EMPRESA
  // ==========================================

  const cargarModulos = async () => {
    try {
      const response = await api.get("/modulos/mis-modulos");

      const modulos = response.data || [];

      const inventarioActivo = modulos.some(
        (modulo) => modulo.codigo === "INVENTARIO",
      );

      setTieneInventario(inventarioActivo);
    } catch (error) {
      console.error("Error al cargar módulos:", error);

      // Si no se pueden cargar los módulos,
      // dejamos el stock bloqueado por seguridad.
      setTieneInventario(true);
    }
  };

  // ==========================================
  // INPUTS
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    let nuevo = {
      ...producto,
      [name]: value,
    };

    const costo = Number(nuevo.costo_compra) || 0;
    const porcentaje = Number(nuevo.porcentaje_ganancia) || 0;

    // Calcular precio automáticamente
    if (name === "costo_compra" || name === "porcentaje_ganancia") {
      nuevo.precio_venta = (costo + costo * (porcentaje / 100)).toFixed(2);
    }

    // Calcular porcentaje cuando se cambia manualmente
    // el precio de venta
    if (name === "precio_venta") {
      const precio = Number(value) || 0;

      if (costo > 0) {
        nuevo.porcentaje_ganancia = (((precio - costo) / costo) * 100).toFixed(
          2,
        );
      }
    }

    // Stock siempre entero
    if (name === "stock") {
      nuevo.stock = value === "" ? "" : Math.max(0, parseInt(value, 10) || 0);
    }

    setProducto(nuevo);
  };

  // ==========================================
  // NUEVO PRODUCTO
  // ==========================================

  const nuevoProducto = () => {
    setProducto(crearProductoVacio());
    setEditando(false);
    setEditandoId(null);
    setMostrarModal(true);
  };

  // ==========================================
  // GUARDAR
  // ==========================================

  const guardarProducto = async () => {
    try {
      // Validaciones
      if (
        (producto.tipo === "PRODUCTO" && !producto.codigo) ||
        !producto.nombre ||
        !producto.categoria_id
      ) {
        Swal.fire("Atención", "Complete los campos obligatorios.", "warning");

        return;
      }

      // ==========================================
      // DATOS BASE
      // ==========================================

      const datos = {
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria_id: Number(producto.categoria_id),
        descripcion: producto.descripcion,
        costo_compra: Number(producto.costo_compra) || 0,
        precio_venta: Number(producto.precio_venta) || 0,
        tipo: producto.tipo,
      };

      // ==========================================
      // STOCK
      // ==========================================
      //
      // Empresa SIN INVENTARIO:
      // puede modificar stock.
      //
      // Empresa CON INVENTARIO:
      // - Al crear puede enviar stock inicial.
      // - Al editar NO enviamos stock.
      //
      // El backend también valida esta regla.
      // ==========================================

      if (producto.tipo === "PRODUCTO" && (!tieneInventario || !editando)) {
        datos.stock = Number(producto.stock) || 0;
      }

      // ==========================================
      // EDITAR
      // ==========================================

      if (editando) {
        await api.put(`/productos/${editandoId}`, datos);

        Swal.fire({
          icon: "success",
          title: "Producto actualizado",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      // ==========================================
      // CREAR
      // ==========================================
      else {
        await api.post("/productos", datos);

        Swal.fire({
          icon: "success",
          title: "Producto registrado",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setMostrarModal(false);

      cargarProductos();
      cargarCategorias();
    } catch (error) {
      console.error("Error al guardar producto:", error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "Ocurrió un error.",
        "error",
      );
    }
  };

  // ==========================================
  // EDITAR PRODUCTO
  // ==========================================

  const editarProducto = (item) => {
    const costo = Number(item.costo_compra) || 0;
    const precio = Number(item.precio_venta) || 0;

    const porcentaje =
      costo > 0 ? (((precio - costo) / costo) * 100).toFixed(2) : 0;

    setProducto({
      codigo: item.codigo || "",
      nombre: item.nombre || "",
      categoria_id: item.categoria_id || "",
      descripcion: item.descripcion || "",
      costo_compra: item.costo_compra || 0,
      precio_venta: item.precio_venta || 0,
      porcentaje_ganancia: porcentaje,
      stock: item.stock ?? 0,
      tipo: item.tipo || "PRODUCTO",
    });

    setEditando(true);
    setEditandoId(item.id);
    setMostrarModal(true);
  };

  // ==========================================
  // ELIMINAR
  // ==========================================

  const eliminarProducto = async (id, nombre) => {
    const confirmar = await Swal.fire({
      title: "Eliminar producto",
      text: `¿Desea eliminar "${nombre}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí",
      cancelButtonText: "Cancelar",
    });

    if (!confirmar.isConfirmed) return;

    try {
      await api.delete(`/productos/${id}`);

      Swal.fire({
        icon: "success",
        title: "Producto eliminado",
        timer: 1200,
        showConfirmButton: false,
      });

      cargarProductos();
    } catch (error) {
      console.error("Error al eliminar:", error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No se pudo eliminar el producto.",
        "error",
      );
    }
  };

  // ==========================================
  // BUSCAR
  // ==========================================

  const productosFiltrados = productos.filter((p) => {
    const texto = busqueda.toLowerCase();

    return (
      (p.nombre ?? "").toLowerCase().includes(texto) ||
      (p.codigo ?? "").toLowerCase().includes(texto) ||
      (p.categoria ?? "").toLowerCase().includes(texto)
    );
  });

  // ==========================================
  // CARGA INICIAL
  // ==========================================

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
    cargarModulos();
  }, [page]);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      <Navbar />

      <div className="container mt-4">
        {/* ==========================================
            ENCABEZADO
        ========================================== */}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2>Productos</h2>

            <small className="text-muted">Total: {totalProductos}</small>
          </div>

          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-primary"
              onClick={() => navigate("/categorias")}
            >
              ⚙ Categorías
            </button>

            <button className="btn btn-success" onClick={nuevoProducto}>
              + Nuevo Producto
            </button>
          </div>
        </div>

        {/* ==========================================
            INDICADOR DE INVENTARIO
        ========================================== */}

        <div className="mb-3">
          {tieneInventario ? (
            <div className="alert alert-info mb-0">
              <strong>📦 Módulo Inventario activo</strong>
              <br />
              El stock se administra desde el módulo <strong>Inventario</strong>
              .
            </div>
          ) : (
            <div className="alert alert-secondary mb-0">
              <strong>📦 Inventario no activo</strong>
              <br />
              Las existencias pueden administrarse directamente desde Productos.
            </div>
          )}
        </div>

        {/* ==========================================
            RESUMEN
        ========================================== */}

        <div className="row g-3 mb-4">
          {/* INVERSIÓN */}

          <div className="col-md-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <small className="text-muted fw-semibold">
                  💰 Inversión en inventario
                </small>

                <h3 className="fw-bold mt-2 mb-0">
                  RD${" "}
                  {Number(inversion).toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </h3>

                <small className="text-muted">
                  Valor actual de la mercancía
                </small>
              </div>
            </div>
          </div>

          {/* GANANCIA */}

          <div className="col-md-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <small className="text-muted fw-semibold">
                  📈 Ganancia proyectada
                </small>

                <h3 className="fw-bold text-success mt-2 mb-0">
                  RD${" "}
                  {Number(gananciaProyectada).toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </h3>

                <small className="text-muted">
                  Si vendes todo el inventario
                </small>
              </div>
            </div>
          </div>

          {/* VALOR TOTAL */}

          <div className="col-md-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <small className="text-muted fw-semibold">
                  💵 Valor total del inventario
                </small>

                <h3 className="fw-bold mt-2 mb-0">
                  RD${" "}
                  {Number(valorTotal).toLocaleString("es-DO", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </h3>

                <small className="text-muted">
                  Inversión + ganancia proyectada
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            BUSCADOR
        ========================================== */}

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por código, nombre o categoría..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* ==========================================
            TABLA
        ========================================== */}

        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Costo</th>
                  <th>Venta</th>
                  <th>Ganancia</th>
                  <th>Stock</th>
                  <th width="170">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {productosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center py-4">
                      No hay productos registrados.
                    </td>
                  </tr>
                )}

                {productosFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td>{item.codigo || "-"}</td>

                    <td>{item.nombre}</td>

                    <td>
                      {item.tipo === "PRODUCTO" && (
                        <span className="badge bg-primary">PRODUCTO</span>
                      )}

                      {item.tipo === "ALIMENTO" && (
                        <span className="badge bg-warning text-dark">
                          ALIMENTO
                        </span>
                      )}

                      {item.tipo === "SERVICIO" && (
                        <span className="badge bg-secondary">SERVICIO</span>
                      )}
                    </td>

                    <td>{item.categoria}</td>

                    <td>
                      RD${" "}
                      {Number(item.costo_compra || 0).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td>
                      RD${" "}
                      {Number(item.precio_venta || 0).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td className="text-success fw-bold">
                      RD${" "}
                      {(
                        Number(item.precio_venta || 0) -
                        Number(item.costo_compra || 0)
                      ).toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td>
                      {item.tipo === "PRODUCTO" ? (
                        <span className="fw-bold">{item.stock ?? 0}</span>
                      ) : (
                        <span className="text-muted">No aplica</span>
                      )}
                    </td>

                    <td>
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => editarProducto(item)}
                      >
                        Editar
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => eliminarProducto(item.id, item.nombre)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==========================================
            PAGINACIÓN
        ========================================== */}

        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">
            Mostrando {totalProductos === 0 ? 0 : (page - 1) * limite + 1}
            {" - "}
            {Math.min(page * limite, totalProductos)}
            {" de "}
            {totalProductos} productos
          </small>

          <div>
            <button
              className="btn btn-outline-primary me-2"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              ← Anterior
            </button>

            <span className="mx-3 fw-bold">
              Página {page} de {totalPages}
            </span>

            <button
              className="btn btn-outline-primary"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>

        {/* ==========================================
            MODAL
        ========================================== */}

        {mostrarModal && (
          <div
            className="modal fade show d-block"
            style={{
              backgroundColor: "rgba(0,0,0,.5)",
            }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                {/* HEADER */}

                <div className="modal-header">
                  <h5 className="modal-title">
                    {editando ? "Editar Producto" : "Nuevo Producto"}
                  </h5>

                  <button
                    className="btn-close"
                    onClick={() => setMostrarModal(false)}
                  />
                </div>

                {/* BODY */}

                <div className="modal-body">
                  <div className="row">
                    {/* ==================================
                        CÓDIGO
                    ================================== */}

                    {producto.tipo === "PRODUCTO" && (
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Código</label>

                        <input
                          className="form-control"
                          name="codigo"
                          value={producto.codigo}
                          onChange={handleChange}
                        />
                      </div>
                    )}

                    {/* ==================================
                        NOMBRE
                    ================================== */}

                    <div
                      className={
                        producto.tipo === "PRODUCTO"
                          ? "col-md-8 mb-3"
                          : "col-md-12 mb-3"
                      }
                    >
                      <label className="form-label">Nombre</label>

                      <input
                        className="form-control"
                        name="nombre"
                        value={producto.nombre}
                        onChange={handleChange}
                      />
                    </div>

                    {/* ==================================
                        CATEGORÍA
                    ================================== */}

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Categoría</label>

                      <select
                        className="form-select"
                        name="categoria_id"
                        value={producto.categoria_id}
                        onChange={handleChange}
                      >
                        <option value="">Seleccione...</option>

                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ==================================
                        TIPO
                    ================================== */}

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Tipo</label>

                      <select
                        className="form-select"
                        name="tipo"
                        value={producto.tipo || "PRODUCTO"}
                        onChange={handleChange}
                      >
                        <option value="PRODUCTO">Producto</option>

                        <option value="ALIMENTO">Alimento</option>

                        <option value="SERVICIO">Servicio</option>
                      </select>
                    </div>

                    {/* ==================================
                        COSTO
                    ================================== */}

                    <div className="col-md-4 mb-3">
                      <label className="form-label">Costo de compra</label>

                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        name="costo_compra"
                        value={producto.costo_compra}
                        onChange={handleChange}
                      />
                    </div>

                    {/* ==================================
                        GANANCIA
                    ================================== */}

                    <div className="col-md-4 mb-3">
                      <label className="form-label">% Ganancia</label>

                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        name="porcentaje_ganancia"
                        value={producto.porcentaje_ganancia}
                        onChange={handleChange}
                      />
                    </div>

                    {/* ==================================
                        PRECIO
                    ================================== */}

                    <div className="col-md-4 mb-3">
                      <label className="form-label">Precio venta</label>

                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        name="precio_venta"
                        value={producto.precio_venta}
                        onChange={handleChange}
                      />
                    </div>

                    {/* ==================================
                        STOCK
                    ================================== */}

                    {producto.tipo === "PRODUCTO" && (
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Stock</label>

                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          step="1"
                          name="stock"
                          value={producto.stock ?? 0}
                          onChange={handleChange}
                          disabled={tieneInventario && editando}
                        />

                        {tieneInventario && editando ? (
                          <div className="form-text text-danger">
                            🔒 El stock se gestiona desde Inventario.
                          </div>
                        ) : tieneInventario && !editando ? (
                          <div className="form-text">
                            Stock inicial del producto.
                          </div>
                        ) : (
                          <div className="form-text">
                            Puedes modificar el stock directamente aquí.
                          </div>
                        )}
                      </div>
                    )}

                    {/* ==================================
                        DESCRIPCIÓN
                    ================================== */}

                    <div className="col-12 mb-3">
                      <label className="form-label">Descripción</label>

                      <textarea
                        rows="3"
                        className="form-control"
                        name="descripcion"
                        value={producto.descripcion}
                        onChange={handleChange}
                      />
                    </div>

                    {/* ==================================
                        AVISO INVENTARIO
                    ================================== */}

                    {producto.tipo === "PRODUCTO" && tieneInventario && (
                      <div className="col-12">
                        <div className="alert alert-info">
                          <strong>📦 Inventario</strong>
                          <br />
                          Las existencias se gestionan desde el módulo
                          <strong> Inventario</strong>.
                          <br />
                          Utilice Inventario para registrar entradas, salidas y
                          ajustes.
                        </div>
                      </div>
                    )}

                    {/* ==================================
                        AVISO SIN INVENTARIO
                    ================================== */}

                    {producto.tipo === "PRODUCTO" && !tieneInventario && (
                      <div className="col-12">
                        <div className="alert alert-secondary">
                          <strong>📦 Gestión directa de stock</strong>
                          <br />
                          Esta empresa no tiene habilitado el módulo Inventario,
                          por lo que las existencias pueden modificarse
                          directamente desde aquí.
                        </div>
                      </div>
                    )}

                    {/* ==================================
                        GANANCIA POR UNIDAD
                    ================================== */}

                    <div className="col-12">
                      <div className="alert alert-success">
                        <strong>Ganancia por unidad:</strong> RD${" "}
                        {(
                          Number(producto.precio_venta || 0) -
                          Number(producto.costo_compra || 0)
                        ).toLocaleString("es-DO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FOOTER */}

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setMostrarModal(false)}
                  >
                    Cancelar
                  </button>

                  <button className="btn btn-success" onClick={guardarProducto}>
                    {editando ? "Actualizar" : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Productos;
