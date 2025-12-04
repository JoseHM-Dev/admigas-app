import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import ModalContrato from "../ui/Modales/ModalContrato";
import ModalNuevoCliente from "../ui/Modales/ModalNuevoCliente";
import ModalReporteCliente from "../ui/Modales/ModalReporteCliente";

export const MainClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [isNuevoClienteModalOpen, setIsNuevoClienteModalOpen] = useState(false);
  const [nuevoContrato, setNuevoContrato] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Reporte
  const [isReporteModalOpen, setIsReporteModalOpen] = useState(false);
  const [clienteParaReporte, setClienteParaReporte] = useState(null);

  const fetchClientes = async () => {
    setCargando(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("casa_habitacion")
        .select(
          "id_casa, nombre_cliente, apellido_cliente, calle, numero, colonia, telefono, id_contrato, delegacion, cp , latitud, longitud"
        );
      if (queryError) throw new Error(queryError.message);
      setClientes(data || []);
    } catch (err) {
      setError(err.message);
      setClientes([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleModify = (id) => {
    const cliente = clientes.find((c) => c.id_casa === id);
    setClienteSeleccionado(cliente);
    setIsNuevoClienteModalOpen(true);
  };

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm(
      "¿Estás seguro de eliminar este cliente y todo su historial?"
    );
    if (!isConfirmed) return;

    const { error: cargaError } = await supabase
      .from("carga_casa")
      .delete()
      .eq("id_casa", id);
    if (cargaError) {
      alert("Error al eliminar cargas.");
      return;
    }

    const { error: casaError } = await supabase
      .from("casa_habitacion")
      .delete()
      .eq("id_casa", id);
    if (casaError) {
      alert("Error al eliminar cliente.");
    } else {
      setClientes((curr) => curr.filter((i) => i.id_casa !== id));
    }
  };

  const handleVerReporte = (cliente) => {
    setClienteParaReporte(cliente);
    setIsReporteModalOpen(true);
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    const textoBusqueda = busqueda.toLowerCase();
    return (
      cliente.nombre_cliente?.toLowerCase().includes(textoBusqueda) ||
      cliente.apellido_cliente?.toLowerCase().includes(textoBusqueda) ||
      cliente.calle?.toLowerCase().includes(textoBusqueda) ||
      cliente.colonia?.toLowerCase().includes(textoBusqueda)
    );
  });

  // Handlers Modales
  const handleOpenContratoModal = () => setIsContratoModalOpen(true);
  const handleCloseContratoModal = () => setIsContratoModalOpen(false);
  const handleOpenNuevoClienteModal = () => {
    setClienteSeleccionado(null);
    setIsNuevoClienteModalOpen(true);
  };
  const handleCloseNuevoClienteModal = () => {
    setIsNuevoClienteModalOpen(false);
    setClienteSeleccionado(null);
    fetchClientes();
  };
  const handleContratoSaved = (contrato) => {
    setNuevoContrato(contrato);
    handleCloseContratoModal();
    handleOpenNuevoClienteModal();
  };

  // --- HELPERS VISUALES ---
  const getInitials = (nombre, apellido) => {
    return `${nombre?.charAt(0) || ""}${
      apellido?.charAt(0) || ""
    }`.toUpperCase();
  };

  const getRandomGradient = (id) => {
    const gradients = [
      "from-blue-400 to-indigo-500",
      "from-purple-400 to-pink-500",
      "from-emerald-400 to-teal-500",
      "from-orange-400 to-red-500",
    ];
    return gradients[id % gradients.length];
  };

  return (
    <main className="min-h-screen pb-20">
      <div className="pt-6">
        <Titulo Texto="Directorio de Clientes" />
      </div>

      <section className="m-auto max-w-7xl p-6">
        {/* --- BARRA DE CONTROL SUPERIOR --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8 sticky top-4 z-20">
          {/* Buscador */}
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon
                icon="mdi:search"
                className="text-gray-400 group-focus-within:text-indigo-500 transition-colors"
                width="22"
              />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, calle o colonia..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 w-full md:w-auto">
            <Link
              to="/dashboard"
              className="flex-1 md:flex-none justify-center px-5 py-3 border border-gray-300 text-gray-600 bg-white rounded-xl hover:bg-gray-50 font-bold transition-all flex items-center gap-2"
            >
              <Icon icon="line-md:arrow-left" width="20" />{" "}
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button
              onClick={handleOpenContratoModal}
              className="flex-1 md:flex-none justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 font-bold transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Icon icon="mdi:account-plus" width="22" /> Nuevo Cliente
            </button>
          </div>
        </div>

        {/* --- GRID DE TARJETAS DE CLIENTES --- */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Icon
              icon="line-md:loading-loop"
              width="48"
              className="text-indigo-500 mb-4"
            />
            <p className="text-gray-400 animate-pulse font-medium">
              Cargando directorio...
            </p>
          </div>
        ) : clientesFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {clientesFiltrados.map((cliente) => (
              <div
                key={cliente.id_casa}
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 flex flex-col overflow-hidden group relative"
              >
                {/* Banda de color superior */}
                <div
                  className={`h-2 w-full bg-linear-to-r ${getRandomGradient(
                    cliente.id_casa
                  )}`}
                ></div>

                <div className="p-6 flex-1 flex flex-col">
                  {/* Header Tarjeta */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md bg-linear-to-br ${getRandomGradient(
                          cliente.id_casa
                        )}`}
                      >
                        {getInitials(
                          cliente.nombre_cliente,
                          cliente.apellido_cliente
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 leading-tight group-hover:text-indigo-600 transition-colors">
                          {cliente.nombre_cliente} {cliente.apellido_cliente}
                        </h3>
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          ID: {cliente.id_casa}
                        </span>
                      </div>
                    </div>
                    {/* Botón rápido de reporte */}
                    <button
                      onClick={() => handleVerReporte(cliente)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title="Ver Historial"
                    >
                      <Icon icon="mdi:chart-box-outline" width="24" />
                    </button>
                  </div>

                  {/* Info Body */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <Icon
                        icon="mdi:map-marker"
                        className="text-indigo-400 mt-0.5 shrink-0"
                        width="18"
                      />
                      <span>
                        {cliente.calle} #{cliente.numero}
                        <br />
                        <span className="text-gray-400 text-xs uppercase font-bold">
                          {cliente.colonia}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 px-3">
                      <Icon
                        icon="mdi:phone"
                        className="text-green-500 shrink-0"
                        width="18"
                      />
                      <span className="font-medium tracking-wide">
                        {cliente.telefono}
                      </span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                    {/* Botón Editar (flex-1 para que ocupe espacio disponible) */}
                    <button
                      onClick={() => handleModify(cliente.id_casa)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors bg-gray-50 border border-gray-200"
                    >
                      <Icon icon="mdi:pencil-outline" width="18" /> Editar
                    </button>

                    {/* Botón Eliminar */}
                    <button
                      onClick={() => handleDelete(cliente.id_casa)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                    >
                      <Icon icon="mdi:trash-can-outline" width="18" /> Eliminar
                    </button>

                    {/* Botón GPS (Solo si tiene coordenadas) */}
                    {cliente.latitud && cliente.longitud && (
                      <a
                        /* URL CORREGIDA: Usa el formato estándar de Google Maps ?q=lat,lng */
                        href={`https://www.google.com/maps?q=${cliente.latitud},${cliente.longitud}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-none flex items-center justify-center p-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-md shadow-green-200"
                        title="Abrir ubicación en Google Maps"
                      >
                        <Icon icon="mdi:google-maps" width="22" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="p-6 bg-gray-50 rounded-full mb-4">
              <Icon
                icon="mdi:account-off-outline"
                className="text-gray-400 w-12 h-12"
              />
            </div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              No se encontraron clientes
            </h3>
            <p className="text-gray-400 max-w-xs text-center mb-6">
              No hay registros que coincidan con tu búsqueda. Intenta con otro
              nombre o agrega uno nuevo.
            </p>
            <button
              onClick={handleOpenContratoModal}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Registrar Cliente Nuevo
            </button>
          </div>
        )}
      </section>

      {/* MODALES */}
      <ModalContrato
        isOpen={isContratoModalOpen}
        onClose={handleCloseContratoModal}
        onSave={handleContratoSaved}
      />
      <ModalNuevoCliente
        isOpen={isNuevoClienteModalOpen}
        onClose={handleCloseNuevoClienteModal}
        contrato={nuevoContrato}
        cliente={clienteSeleccionado}
      />
      <ModalReporteCliente
        isOpen={isReporteModalOpen}
        onClose={() => setIsReporteModalOpen(false)}
        cliente={clienteParaReporte}
      />
    </main>
  );
};
