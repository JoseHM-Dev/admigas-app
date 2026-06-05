import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import ModalContrato from "../ui/Modales/ModalContrato";
import ModalNuevoCliente from "../ui/Modales/ModalNuevoCliente";
import ModalReporteCliente from "../ui/Modales/ModalReporteCliente";
import ModalMapaClientes from "../ui/Modales/ModalMapaClientes";
import Swal from 'sweetalert2';

export const MainClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  // Nuevos Estados para UI (Pestañas y Control de Inactivos)
  const [activeTab, setActiveTab] = useState("directorio"); // 'directorio' | 'inactivos'
  const [lastCargas, setLastCargas] = useState({});
  const [hiddenInactives, setHiddenInactives] = useState(() => {
    // Leemos de la memoria local si ya ocultamos algunos inactivos
    const saved = localStorage.getItem('hiddenInactives');
    return saved ? JSON.parse(saved) : [];
  });
  const [expandedColonias, setExpandedColonias] = useState({});
  const [viewMode, setViewMode] = useState("grid"); // "grid" o "carousel"

  // Modales
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [isNuevoClienteModalOpen, setIsNuevoClienteModalOpen] = useState(false);
  const [nuevoContrato, setNuevoContrato] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Reporte
  const [isReporteModalOpen, setIsReporteModalOpen] = useState(false);
  const [clienteParaReporte, setClienteParaReporte] = useState(null);
  const [isMapaModalOpen, setIsMapaModalOpen] = useState(false);

  // --- INTERSECTION OBSERVER PARA BOTÓN FLOTANTE ---
  const [isControlBarVisible, setIsControlBarVisible] = useState(true);
  const controlBarRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsControlBarVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" } // Compensa el Navbar superior
    );
    if (controlBarRef.current) {
      observer.observe(controlBarRef.current);
    }
    return () => {
      if (controlBarRef.current) observer.unobserve(controlBarRef.current);
    };
  }, []);

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

  const fetchLastCargas = async () => {
    try {
      // Traemos las fechas de carga para saber hace cuánto cargó cada cliente
      const { data, error } = await supabase
        .from("carga_casa")
        .select("id_casa, fecha_carga")
        .order("fecha_carga", { ascending: false }); // Las ordenamos de la más nueva a la más vieja
        
      if (error) throw error;
      
      const map = {};
      // Como vienen de más reciente a más antigua, el primer registro que leamos de cada cliente será su última carga
      data.forEach(c => {
         if (!map[c.id_casa]) {
             map[c.id_casa] = c.fecha_carga;
         }
      });
      setLastCargas(map);
    } catch (err) {
      console.error("Error obteniendo el historial de cargas:", err);
    }
  };

  useEffect(() => {
    fetchClientes();
    fetchLastCargas();
  }, []);

  const handleModify = (id) => {
    const cliente = clientes.find((c) => c.id_casa === id);
    setClienteSeleccionado(cliente);
    setIsNuevoClienteModalOpen(true);
  };

  // Función para ocultar al cliente de la lista de inactivos
  const hideInactive = (id) => {
    const updated = [...hiddenInactives, id];
    setHiddenInactives(updated);
    localStorage.setItem('hiddenInactives', JSON.stringify(updated));
  };

  const handleDelete = async (id, nombreCliente) => {
    const result = await Swal.fire({
      title: '¿ELIMINAR CLIENTE?',
      html: `
        <div style="text-align: left; font-size: 0.9em; max-height: 40vh; overflow-y: auto; padding-right: 5px;">
          Estás a punto de borrar a: <b>${nombreCliente}</b>.<br/><br/>
          ⚠️ <b>ESTA ACCIÓN ES DESTRUCTIVA E IRREVERSIBLE:</b>
          <ul style="list-style: disc; margin-left: 20px; color: #d33; font-weight: bold;">
            <li>Se borrará todo su historial de ventas.</li>
            <li>Se eliminarán sus deudas y abonos (Cuentas por Cobrar).</li>
            <li>Se perderá el registro de su contrato y ubicación GPS.</li>
          </ul>
          <br/>
          Para confirmar, escribe la palabra <b>ELIMINAR</b> abajo:
        </div>
      `,
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Escribe ELIMINAR',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '¡Sí, borrar!',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      heightAuto: false,
      scrollbarPadding: false,
      preConfirm: (inputValue) => {
        if (inputValue !== 'ELIMINAR') {
          Swal.showValidationMessage('Debes escribir la palabra ELIMINAR exactamente.');
        }
        return true;
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    if (result.isConfirmed) {
      try {
        const { error: cargaError } = await supabase
          .from("carga_casa")
          .delete()
          .eq("id_casa", id);
        if (cargaError) throw cargaError;

        await supabase.from("cuentas_por_cobrar").delete().eq("id_casa", id);

        const { error: casaError } = await supabase
          .from("casa_habitacion")
          .delete()
          .eq("id_casa", id);
        
        if (casaError) throw casaError;

        Swal.fire(
          '¡Eliminado!',
          `El cliente ${nombreCliente} y todos sus datos han sido borrados.`,
          'success'
        );
        
        setClientes((curr) => curr.filter((i) => i.id_casa !== id));

      } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo eliminar el registro: ' + error.message, 'error');
      }
    }
  };

  const handleVerReporte = (cliente) => {
    setClienteParaReporte(cliente);
    setIsReporteModalOpen(true);
  };

  const toggleColonia = (colonia) => {
    setExpandedColonias((prev) => ({
      ...prev,
      [colonia]: !prev[colonia]
    }));
  };

  const handleFabClick = () => {
    // Sube al inicio suavemente y enfoca el buscador
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 500); // Pequeño retraso para que termine el scroll
  };

  // --- LÓGICA DE FILTRADO, AGRUPACIÓN E INACTIVOS ---
  const { clientesAgrupados, inactivos } = useMemo(() => {
    const textoBusqueda = busqueda.toLowerCase();
    
    // 1. Filtrado General por Búsqueda
    const filtrados = clientes.filter((cliente) => {
      return (
        cliente.nombre_cliente?.toLowerCase().includes(textoBusqueda) ||
        cliente.apellido_cliente?.toLowerCase().includes(textoBusqueda) ||
        cliente.calle?.toLowerCase().includes(textoBusqueda) ||
        cliente.colonia?.toLowerCase().includes(textoBusqueda)
      );
    });

    // 2. Agrupar por Colonia (Para la pestaña Directorio)
    const agrupados = filtrados.reduce((acc, cliente) => {
      const col = cliente.colonia || "Sin Colonia";
      if (!acc[col]) acc[col] = [];
      acc[col].push(cliente);
      return acc;
    }, {});

    // 3. Calcular Inactivos (Más de 30 días sin carga y no ocultados por el usuario)
    const limiteInactividad = new Date();
    limiteInactividad.setDate(limiteInactividad.getDate() - 30);

    const listaInactivos = filtrados.filter(c => {
      if (hiddenInactives.includes(c.id_casa)) return false; // Oculto intencionalmente
      const ultimaCargaStr = lastCargas[c.id_casa];
      if (!ultimaCargaStr) return false; // Si nunca ha cargado (podría ser nuevo), lo ignoramos.
      return new Date(ultimaCargaStr) < limiteInactividad;
    });

    return { clientesAgrupados: agrupados, inactivos: listaInactivos };
  }, [clientes, busqueda, lastCargas, hiddenInactives]);

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

  const getSoftColor = (id) => {
    const colors = [
      "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800",
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
    ];
    return colors[id % colors.length];
  };

  // --- RENDERIZADOR DE TARJETAS (Reutilizable para Directorio e Inactivos) ---
  const renderClientCard = (cliente, isInactiveView = false, forceFullWidth = false) => {
    const isCarousel = viewMode === "carousel" && !forceFullWidth;
    return (
      <div
        key={cliente.id_casa}
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700 transition-all duration-300 flex flex-col overflow-hidden group relative ${
          isCarousel ? "shrink-0 snap-center w-[85vw] sm:w-[320px]" : "w-full"
        }`}
      >
        {/* Banda superior sutil indicadora */}
        <div className={`h-1.5 w-full ${isInactiveView ? 'bg-rose-400 dark:bg-rose-500' : 'bg-sky-400 dark:bg-sky-500'}`}></div>
  
        <div className="p-5 flex-1 flex flex-col">
          {/* Header Tarjeta */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-[15px] border ${getSoftColor(cliente.id_casa)}`}>
                {getInitials(cliente.nombre_cliente, cliente.apellido_cliente)}
              </div>
              <div>
                <h3 className="text-[17px] font-black text-slate-800 dark:text-slate-100 leading-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {cliente.nombre_cliente} {cliente.apellido_cliente}
                </h3>
                <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  ID: {cliente.id_casa}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleVerReporte(cliente)}
              className="p-2 text-slate-400 dark:text-slate-400 hover:text-blue-900 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
              title="Ver Historial"
            >
              <Icon icon="mdi:chart-box-outline" width="24" />
            </button>
          </div>
  
          {/* Info Body */}
          <div className="space-y-2.5 mb-5">
            <div className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 p-2.5 rounded-xl font-medium">
              <Icon icon="mdi:map-marker" className="text-sky-500 mt-0.5 shrink-0" width="18" />
              <span className="leading-tight">
                {cliente.calle} #{cliente.numero}
                <br />
                <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  {cliente.colonia}
                </span>
              </span>
            </div>
            
            <div className="flex items-center gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 px-1">
              <Icon icon="mdi:phone" className="text-emerald-500 shrink-0" width="18" />
              <span className="font-bold tracking-wide">{cliente.telefono}</span>
            </div>
  
            {/* Etiqueta exclusiva de Inactivos para saber hace cuánto cargaron */}
            {isInactiveView && lastCargas[cliente.id_casa] && (
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 p-2 rounded-lg">
                <Icon icon="mdi:clock-alert-outline" width="16" />
                Última carga: {new Date(lastCargas[cliente.id_casa]).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
              </div>
            )}
          </div>
  
          {/* Footer Actions */}
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-2 flex-wrap">
            {/* Si estamos en vista de inactivos mostramos botón de descartar, sino botón de editar */}
            {isInactiveView ? (
              <button
                onClick={() => hideInactive(cliente.id_casa)}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm"
                title="No mostrar más en esta lista"
              >
                <Icon icon="mdi:eye-off-outline" width="18" /> Descartar
              </button>
            ) : (
              <button
                onClick={() => handleModify(cliente.id_casa)}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 hover:border-sky-200 dark:hover:border-slate-600 transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm"
              >
                <Icon icon="mdi:pencil-outline" width="16" /> Editar
              </button>
            )}
  
            <button
              onClick={() => handleDelete(cliente.id_casa, `${cliente.nombre_cliente} ${cliente.apellido_cliente}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-800/50"
            >
              <Icon icon="mdi:trash-can-outline" width="16" /> Eliminar
            </button>
  
            {/* Botón GPS */}
            {cliente.latitud && cliente.longitud && (
              <a
                href={`https://www.google.com/maps?q=${cliente.latitud},${cliente.longitud}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-none flex items-center justify-center p-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md"
                title="Abrir en Maps"
              >
                <Icon icon="mdi:google-maps" width="20" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-20 font-sans transition-colors duration-300">
      {/* --- BOTÓN FLOTANTE DE BÚSQUEDA --- */}
      <button
        onClick={handleFabClick}
        className={`fixed bottom-6 right-6 z-40 bg-sky-500 text-white p-4 rounded-full shadow-lg shadow-sky-500/40 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 ${
          isControlBarVisible ? "opacity-0 invisible translate-y-5" : "opacity-100 visible translate-y-0"
        }`}
        title="Buscar Cliente"
      >
        <Icon icon="mdi:magnify" width="28" />
      </button>

      <div className="pt-6 print:hidden">
        <Titulo Texto="Directorio de Clientes" />
      </div>

      <section className="m-auto max-w-7xl p-6">
        {/* --- BARRA DE CONTROL SUPERIOR --- */}
        <div ref={controlBarRef} className="flex flex-col md:flex-row items-center justify-between gap-5 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 relative z-20 transition-colors duration-300">
          {/* Buscador y Botón Mapa */}
          <div className="flex w-full md:w-auto gap-3 items-center">
            <div className="relative w-full md:w-96 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon
                  icon="mdi:search"
                  className="text-slate-400 dark:text-slate-500 group-focus-within:text-sky-500 dark:group-focus-within:text-sky-400 transition-colors"
                  width="22"
                />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nombre, calle o colonia..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200 font-medium"
              />
            </div>
            <button
              onClick={() => setIsMapaModalOpen(true)}
              className="flex-none p-3.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors shadow-sm"
              title="Ver mapa de clientes"
            >
              <Icon icon="mdi:map-marker-radius" width="24" />
            </button>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-4 w-full md:w-auto">
            <Link
              to="/dashboard"
              className="flex-1 md:flex-none justify-center px-5 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-900 dark:hover:text-sky-400 shadow-sm font-bold transition-all flex items-center gap-2"
            >
              <Icon icon="line-md:arrow-left" width="20" />{" "}
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button
              onClick={handleOpenContratoModal}
              className="flex-1 md:flex-none justify-center px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-md shadow-sky-500/30 font-bold transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Icon icon="mdi:account-plus" width="22" /> Nuevo Cliente
            </button>
          </div>
        </div>

        {/* --- PESTAÑAS Y CONTROLES DE VISTA --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-700 mb-8 pb-4 gap-4 transition-colors duration-300">
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("directorio")}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all border grow sm:grow-0 ${
                activeTab === "directorio"
                  ? "bg-blue-900 dark:bg-sky-600 text-white border-blue-900 dark:border-sky-600 shadow-md"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700"
              }`}
            >
              <Icon icon="mdi:folder-account-outline" width="20" /> Directorio
            </button>
            <button
              onClick={() => setActiveTab("inactivos")}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all border grow sm:grow-0 ${
                activeTab === "inactivos"
                  ? "bg-rose-500 dark:bg-rose-600 text-white border-rose-500 dark:border-rose-600 shadow-md"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700"
              }`}
            >
              <Icon icon="mdi:account-clock-outline" width="20" /> Inactivos
              {inactivos.length > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === "inactivos" ? "bg-white text-rose-600 dark:bg-white/20 dark:text-white" : "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300"}`}>
                  {inactivos.length}
                </span>
              )}
            </button>
          </div>

          {/* Botones de Vista (Grid / Carrusel) */}
          <div className="flex bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 w-full sm:w-auto justify-center transition-colors duration-300">
            <button onClick={() => setViewMode("grid")} className={`flex-1 sm:flex-none px-6 sm:px-4 py-2 transition-colors ${viewMode === "grid" ? "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
              <Icon icon="mdi:view-grid" width="20" className="mx-auto" />
            </button>
            <button onClick={() => setViewMode("carousel")} className={`flex-1 sm:flex-none px-6 sm:px-4 py-2 transition-colors ${viewMode === "carousel" ? "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
              <Icon icon="mdi:view-carousel" width="20" className="mx-auto" />
            </button>
          </div>
        </div>

        {/* --- CONTENIDO DE LAS PESTAÑAS --- */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Icon
              icon="line-md:loading-loop"
              width="48"
              className="text-sky-500 mb-4"
            />
            <p className="text-slate-400 animate-pulse font-bold">
              Cargando directorio...
            </p>
          </div>
        ) : activeTab === "directorio" ? (
          /* TAB: DIRECTORIO (Agrupado) */
          Object.keys(clientesAgrupados).length > 0 ? (
            <div className={
              viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start" 
                : "flex overflow-x-auto gap-6 pb-8 pt-2 snap-x snap-mandatory scroll-smooth hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-1 items-start"
            }>
              {Object.entries(clientesAgrupados).map(([colonia, clientesCol]) => {
                const isExpanded = expandedColonias[colonia];
                const isCarousel = viewMode === "carousel";
                return (
                <div 
                  key={colonia} 
                  className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all duration-300 ${
                    isCarousel ? "shrink-0 snap-center w-[90vw] sm:w-[400px]" : "w-full"
                  }`}
                >
                  <div 
                    className="flex justify-between items-center p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    onClick={() => toggleColonia(colonia)}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 sm:p-2.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 rounded-xl text-blue-900 dark:text-blue-400 shrink-0">
                        <Icon icon="mdi:city-variant-outline" width="24" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                          {colonia} 
                        </h3>
                        <p className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                          {clientesCol.length} {clientesCol.length === 1 ? 'cliente' : 'clientes'}
                        </p>
                      </div>
                    </div>
                    <button className={`p-2 shrink-0 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50'}`}>
                      <Icon icon="mdi:chevron-down" width="24" />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="p-4 sm:p-6 pt-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                      <div className="flex flex-col gap-4">
                        {clientesCol.map((c) => renderClientCard(c, false, true))}
                      </div>
                    </div>
                  )}
                </div>
              )})}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm transition-colors duration-300">
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-full mb-4">
                <Icon icon="mdi:account-off-outline" className="text-slate-300 dark:text-slate-600 w-16 h-16" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-600 dark:text-slate-300 mb-2">
                No se encontraron clientes
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-center mb-6">
                Intenta buscar con otro nombre o agrega un cliente nuevo.
              </p>
            </div>
          )
        ) : (
          /* TAB: INACTIVOS */
          inactivos.length > 0 ? (
            <div>
              <div className="mb-8 p-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 rounded-2xl flex items-start gap-4 transition-colors duration-300">
                <Icon icon="mdi:alert-circle-outline" width="32" className="text-rose-500 dark:text-rose-400 shrink-0" />
                <div>
                  <h4 className="text-rose-800 dark:text-rose-300 font-black text-lg leading-tight">Clientes Inactivos</h4>
                  <p className="text-rose-600 dark:text-rose-400 text-sm font-medium mt-1">Estos clientes llevan más de 30 días sin un registro de venta. Puedes eliminarlos, contactarlos o usar el botón "Descartar" si ya no quieres verlos en esta lista.</p>
                </div>
              </div>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {inactivos.map((c) => renderClientCard(c, true))}
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-5 pb-6 pt-2 snap-x snap-mandatory scroll-smooth hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-1">
                  {inactivos.map((c) => renderClientCard(c, true))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm transition-colors duration-300">
              <div className="p-6 bg-emerald-50 dark:bg-emerald-900/30 rounded-full mb-4">
                <Icon icon="mdi:check-decagram-outline" className="text-emerald-400 dark:text-emerald-500 w-16 h-16" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-600 dark:text-slate-300 mb-2">
                ¡Todo al día!
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-center">
                No tienes clientes inactivos o perdidos por el momento.
              </p>
            </div>
          )
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
      <ModalMapaClientes
        isOpen={isMapaModalOpen}
        onClose={() => setIsMapaModalOpen(false)}
        clientes={clientes}
      />
    </main>
  );
};
