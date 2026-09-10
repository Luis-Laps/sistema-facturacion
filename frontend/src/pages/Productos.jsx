import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import api from "../services/api";

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
  proveedor_id: "",
});

function Productos() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProductos, setTotalProductos] = useState(0);

  const limite = 10;

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [proveedores, setProveedores] = useState([]);

  const [empresa, setEmpresa] = useState(null);

  const [inversion, setInversion] = useState(0);
  const [gananciaProyectada, setGananciaProyectada] = useState(0);
  const [valorTotal, setValorTotal] = useState(0);

  const [busqueda, setBusqueda] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);

  const [editando, setEditando] = useState(false);

  const [editandoId, setEditandoId] = useState(null);

  const [producto, setProducto] = useState(crearProductoVacio());

  // ==========================================
  // MODAL PROVEEDOR
  // ==========================================

  const [mostrarModalProveedor, setMostrarModalProveedor] = useState(false);

  const [guardandoProveedor, setGuardandoProveedor] = useState(false);

  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: "",
    rnc: "",
    telefono: "",
    correo: "",
    direccion: "",
    contacto: "",
    notas: "",
  });

  // ==========================================
  // CARGAR EMPRESA
  // ==========================================

  const cargarEmpresa = async () => {
    try {
      const response = await api.get("/configuracion");

      setEmpresa(response.data);
    } catch (error) {
      console.error("Error al cargar configuración:", error);
    }
  };

  // ==========================================
  // CARGAR PRODUCTOS
  // ==========================================

  const cargarProductos = async () => {
    try {
      const response = await api.get(
        `/productos?page=${page}&limit=${limite}&buscar=${encodeURIComponent(
          busqueda,
        )}`,
      );

      setProductos(response.data.data || []);

      setTotalPages(response.data.totalPages || 1);

      setTotalProductos(response.data.total || 0);

      setInversion(response.data.inversion || 0);

      setGananciaProyectada(response.data.gananciaProyectada || 0);

      setValorTotal(response.data.valorTotal || 0);
    } catch (error) {
      console.error(error);
    }
  };

  // ==========================================
  // CARGAR CATEGORÍAS
  // ==========================================

  const cargarCategorias = async () => {
    try {
      const response = await api.get("/categorias");

      setCategorias(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  // ==========================================
  // CARGAR PROVEEDORES
  // ==========================================

  const cargarProveedores = async () => {
    if (empresa?.tipo !== "FERRETERIA") {
      setProveedores([]);
      return;
    }

    try {
      const response = await api.get("/proveedores");

      setProveedores(response.data || []);
    } catch (error) {
      console.error("Error al cargar proveedores:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.mensaje ||
          "No se pudieron cargar los proveedores.",
      });
    }
  };

  // ==========================================
  // CARGA INICIAL
  // ==========================================

  useEffect(() => {
    cargarEmpresa();
    cargarCategorias();
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [page]);

  useEffect(() => {
    if (empresa?.tipo === "FERRETERIA") {
      cargarProveedores();
    } else {
      setProveedores([]);
    }
  }, [empresa?.tipo]);

  // ==========================================
  // BUSQUEDA
  // ==========================================

  useEffect(() => {
    const tiempo = setTimeout(() => {
      setPage(1);
      cargarProductos();
    }, 300);

    return () => clearTimeout(tiempo);
  }, [busqueda]);

  // ==========================================
  // INPUTS PRODUCTO
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    let nuevo = {
      ...producto,
      [name]: value,
    };

    const costo = Number(nuevo.costo_compra) || 0;

    const porcentaje = Number(nuevo.porcentaje_ganancia) || 0;

    if (name === "costo_compra" || name === "porcentaje_ganancia") {
      nuevo.precio_venta = (costo + costo * (porcentaje / 100)).toFixed(2);
    }

    if (name === "precio_venta") {
      const precio = Number(value) || 0;

      if (costo > 0) {
        nuevo.porcentaje_ganancia = (((precio - costo) / costo) * 100).toFixed(
          2,
        );
      }
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
  // GUARDAR PRODUCTO
  // ==========================================

  const guardarProducto = async () => {
    try {
      if (
        (producto.tipo === "PRODUCTO" && !producto.codigo) ||
        !producto.nombre ||
        !producto.categoria_id
      ) {
        Swal.fire("Atención", "Complete los campos obligatorios.", "warning");

        return;
      }

      const esFerreteria = empresa?.tipo === "FERRETERIA";

      const esProducto = producto.tipo === "PRODUCTO";

      const datos = {
        codigo: producto.codigo || null,

        nombre: producto.nombre,

        categoria_id: Number(producto.categoria_id),

        descripcion: producto.descripcion,

        costo_compra: Number(producto.costo_compra),

        precio_venta: Number(producto.precio_venta),

        stock: esProducto ? Number(producto.stock) : 0,

        tipo: producto.tipo,

        proveedor_id:
          esFerreteria && esProducto && producto.proveedor_id
            ? Number(producto.proveedor_id)
            : null,
      };

      if (editando) {
        await api.put(`/productos/${editandoId}`, datos);

        Swal.fire({
          icon: "success",
          title: "Producto actualizado",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("/productos", datos);

        Swal.fire({
          icon: "success",
          title: "Producto registrado",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      setMostrarModal(false);

      await cargarProductos();

      await cargarCategorias();

      if (empresa?.tipo === "FERRETERIA") {
        await cargarProveedores();
      }
    } catch (error) {
      console.error(error);

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
    const porcentaje =
      Number(item.costo_compra) > 0
        ? (
            ((Number(item.precio_venta) - Number(item.costo_compra)) /
              Number(item.costo_compra)) *
            100
          ).toFixed(2)
        : 0;

    setProducto({
      codigo: item.codigo || "",

      nombre: item.nombre || "",

      categoria_id: item.categoria_id || "",

      descripcion: item.descripcion || "",

      costo_compra: item.costo_compra || 0,

      precio_venta: item.precio_venta || 0,

      porcentaje_ganancia: porcentaje,

      stock: item.stock || 0,

      tipo: item.tipo || "PRODUCTO",

      proveedor_id: item.proveedor_id || "",
    });

    setEditando(true);

    setEditandoId(item.id);

    setMostrarModal(true);
  };

  // ==========================================
  // ELIMINAR PRODUCTO
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

    if (!confirmar.isConfirmed) {
      return;
    }

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
      console.error(error);

      Swal.fire("Error", "No se pudo eliminar el producto.", "error");
    }
  };

  // ==========================================
  // PROVEEDOR - INPUTS
  // ==========================================

  const handleChangeProveedor = (e) => {
    const { name, value } = e.target;

    setNuevoProveedor((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  // ==========================================
  // ABRIR MODAL PROVEEDOR
  // ==========================================

  const abrirModalProveedor = () => {
    setNuevoProveedor({
      nombre: "",
      rnc: "",
      telefono: "",
      correo: "",
      direccion: "",
      contacto: "",
      notas: "",
    });

    setMostrarModalProveedor(true);
  };

  // ==========================================
  // GUARDAR PROVEEDOR
  // ==========================================

  const guardarNuevoProveedor = async () => {
    if (!nuevoProveedor.nombre.trim()) {
      Swal.fire(
        "Atención",
        "El nombre del proveedor es obligatorio.",
        "warning",
      );

      return;
    }

    try {
      setGuardandoProveedor(true);

      const response = await api.post("/proveedores", nuevoProveedor);

      const proveedorCreado = response.data;

      await cargarProveedores();

      setProducto((anterior) => ({
        ...anterior,
        proveedor_id: proveedorCreado.id,
      }));

      setMostrarModalProveedor(false);

      Swal.fire({
        icon: "success",
        title: "Proveedor creado",
        text: "El proveedor fue creado y seleccionado automáticamente.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      Swal.fire(
        "Error",
        error.response?.data?.mensaje || "No se pudo crear el proveedor.",
        "error",
      );
    } finally {
      setGuardandoProveedor(false);
    }
  };

  // ==========================================
  // FILTRO VISUAL
  // ==========================================

  const productosFiltrados = productos.filter((p) => {
    const texto = busqueda.toLowerCase();

    return (
      (p.nombre ?? "").toLowerCase().includes(texto) ||
      (p.codigo ?? "").toLowerCase().includes(texto) ||
      (p.categoria ?? "").toLowerCase().includes(texto)
    );
  });

  return (
    <>
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
            RESUMEN INVENTARIO
        ========================================== */}

        <div className="row g-3 mb-4">
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
              placeholder="Buscar por código o nombre..."
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

                  <th>Categoría</th>

                  {empresa?.tipo === "FERRETERIA" && <th>Proveedor</th>}

                  <th>Costo</th>

                  <th>Venta</th>

                  <th>Ganancia</th>

                  <th>Cantidad</th>

                  <th width="170">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {productosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={empresa?.tipo === "FERRETERIA" ? 9 : 8}
                      className="text-center py-4"
                    >
                      No hay productos registrados.
                    </td>
                  </tr>
                )}

                {productosFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td>{item.codigo}</td>

                    <td>{item.nombre}</td>

                    <td>{item.categoria}</td>

                    {empresa?.tipo === "FERRETERIA" && (
                      <td>{item.proveedor_nombre || "Sin proveedor"}</td>
                    )}

                    <td>RD$ {Number(item.costo_compra).toLocaleString()}</td>

                    <td>RD$ {Number(item.precio_venta).toLocaleString()}</td>

                    <td className="text-success fw-bold">
                      RD${" "}
                      {(
                        Number(item.precio_venta) - Number(item.costo_compra)
                      ).toLocaleString()}
                    </td>

                    <td>{item.stock}</td>

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
            {totalProductos}
            {" productos"}
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
            MODAL PRODUCTO
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
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editando ? "Editar Producto" : "Nuevo Producto"}
                  </h5>

                  <button
                    className="btn-close"
                    onClick={() => setMostrarModal(false)}
                  />
                </div>

                <div className="modal-body">
                  <div className="row">
                    {/* CÓDIGO */}

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

                    {/* NOMBRE */}

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

                    {/* CATEGORÍA */}

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

                    {/* TIPO */}

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
                        PROVEEDOR
                    ================================== */}

                    {empresa?.tipo === "FERRETERIA" &&
                      producto.tipo === "PRODUCTO" && (
                        <div className="col-12 mb-3">
                          <label className="form-label">Proveedor</label>

                          <div className="input-group">
                            <select
                              className="form-select"
                              name="proveedor_id"
                              value={producto.proveedor_id || ""}
                              onChange={handleChange}
                            >
                              <option value="">
                                Seleccione un proveedor...
                              </option>

                              {proveedores.map((proveedor) => (
                                <option key={proveedor.id} value={proveedor.id}>
                                  {proveedor.nombre}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              className="btn btn-outline-success"
                              onClick={abrirModalProveedor}
                            >
                              + Agregar proveedor
                            </button>
                          </div>

                          <div className="form-text">
                            Puedes seleccionar un proveedor existente o crear
                            uno sin salir del formulario.
                          </div>
                        </div>
                      )}

                    {/* STOCK */}

                    {producto.tipo === "PRODUCTO" && (
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Cantidad en inventario
                        </label>

                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          name="stock"
                          value={producto.stock}
                          onChange={handleChange}
                        />
                      </div>
                    )}

                    {/* COSTO */}

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

                    {/* GANANCIA */}

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

                    {/* PRECIO */}

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

                    {/* DESCRIPCIÓN */}

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

                    {/* GANANCIA */}

                    <div className="col-12">
                      <div className="alert alert-success">
                        <strong>Ganancia por unidad:</strong> RD${" "}
                        {(
                          Number(producto.precio_venta || 0) -
                          Number(producto.costo_compra || 0)
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

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

        {/* ==========================================
            MODAL NUEVO PROVEEDOR
        ========================================== */}

        {mostrarModalProveedor && (
          <div
            className="modal fade show d-block"
            style={{
              backgroundColor: "rgba(0,0,0,.5)",
              zIndex: 1060,
            }}
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Nuevo proveedor</h5>

                  <button
                    className="btn-close"
                    onClick={() => setMostrarModalProveedor(false)}
                    disabled={guardandoProveedor}
                  />
                </div>

                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nombre *</label>

                    <input
                      type="text"
                      className="form-control"
                      name="nombre"
                      value={nuevoProveedor.nombre}
                      onChange={handleChangeProveedor}
                      disabled={guardandoProveedor}
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">RNC</label>

                      <input
                        type="text"
                        className="form-control"
                        name="rnc"
                        value={nuevoProveedor.rnc}
                        onChange={handleChangeProveedor}
                        disabled={guardandoProveedor}
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Teléfono</label>

                      <input
                        type="text"
                        className="form-control"
                        name="telefono"
                        value={nuevoProveedor.telefono}
                        onChange={handleChangeProveedor}
                        disabled={guardandoProveedor}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Correo</label>

                    <input
                      type="email"
                      className="form-control"
                      name="correo"
                      value={nuevoProveedor.correo}
                      onChange={handleChangeProveedor}
                      disabled={guardandoProveedor}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Dirección</label>

                    <input
                      type="text"
                      className="form-control"
                      name="direccion"
                      value={nuevoProveedor.direccion}
                      onChange={handleChangeProveedor}
                      disabled={guardandoProveedor}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Persona de contacto</label>

                    <input
                      type="text"
                      className="form-control"
                      name="contacto"
                      value={nuevoProveedor.contacto}
                      onChange={handleChangeProveedor}
                      disabled={guardandoProveedor}
                    />
                  </div>

                  <div className="mb-0">
                    <label className="form-label">Notas</label>

                    <textarea
                      className="form-control"
                      rows="3"
                      name="notas"
                      value={nuevoProveedor.notas}
                      onChange={handleChangeProveedor}
                      disabled={guardandoProveedor}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setMostrarModalProveedor(false)}
                    disabled={guardandoProveedor}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={guardarNuevoProveedor}
                    disabled={guardandoProveedor}
                  >
                    {guardandoProveedor ? "Guardando..." : "Guardar proveedor"}
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
