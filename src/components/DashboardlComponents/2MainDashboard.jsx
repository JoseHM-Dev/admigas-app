import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../supabaseClient";
import ModalNuevaVenta from "../ui/Modales/ModalNuevaVenta";
import ModalAgendarCliente from "../ui/Modales/ModalAgendarCliente";
import { ModalNuevoDia } from "../ui/Modales/ModalNuevoDia";
import { ModalFinDia } from "../ui/Modales/ModalFinDia";
import ModalFinDiaCompleto from "../ui/Modales/ModalFinDiaCompleto";
import { Icon } from "@iconify/react";
import { DailySummary } from "../ui/DailySummary";
import { useAuth } from "../../auth/useAuth";
import ModalPersonal from "../ui/Modales/ModalPersonal";
import ModalUnidad from "../ui/Modales/ModalUnidad";
import ModalBanco from "../ui/Modales/ModalBanco";
import ModalTarifa from "../ui/Modales/ModalTarifa";
import ModalNuevoCliente from "../ui/Modales/ModalNuevoCliente";
import ModalReporteCliente from "../ui/Modales/ModalReporteCliente";
import BuscadorFlotante from "../ui/BuscadorFlotante";

export const MainDashboard = () => {
  const {
    personal,
    loadingPersonal,
    appUser,
    unidad,
    datosBancarios,
    tarifa,
    fetchUserData,
    isDarkMode,
    toggleDarkMode,
  } = useAuth();

  const [isModalPersonalOpen, setIsModalPersonalOpen] = useState(false);
  const [isModalUnidadOpen, setIsModalUnidadOpen] = useState(false);
  const [isModalBancoOpen, setIsModalBancoOpen] = useState(false);
  const [isModalTarifaOpen, setIsModalTarifaOpen] = useState(false);
  const [listaDiaria, setListaDiaria] = useState([]);
  const [pagosDiarios, setPagosDiarios] = useState([]);
  const [proximaCargaEdficios, setProximaCargaEdificios] = useState([]);
  const [isModalVentaOpen, setIsModalVentaOpen] = useState(false);
  const [isModalNuevoDiaOpen, setIsModalNuevoDiaOpen] = useState(false);
  const [isModalFinDiaOpen, setIsModalFinDiaOpen] = useState(false);
  const [isModalFinDiaCompletoOpen, setIsModalFinDiaCompletoOpen] = useState(false);

  const [estadoDelDia, setEstadoDelDia] = useState("CERRADO"); // CERRADO | INICIADO | TERMINADO
  const [activeTurnoId, setActiveTurnoId] = useState(null);
  const [selectedVenta, setSelectedVenta] = useState(null);

  // --- NUEVOS ESTADOS DE UI ---
  const [viewMode, setViewMode] = useState("grid"); // "grid" o "carousel"
  const [agendaSearch, setAgendaSearch] = useState("");
  const [selectedDateGroup, setSelectedDateGroup] = useState(null);

  const [agenda, setAgenda] = useState([]);
  const [isModalAgendaOpen, setIsModalAgendaOpen] = useState(false);
  const [selectedAgendaItem, setSelectedAgendaItem] = useState(null);
  const [registrador, setRegistrador] = useState(null);
  
  // --- ESTADOS PARA BUSCADOR FLOTANTE GLOBAL ---
  const [isNuevoClienteModalOpen, setIsNuevoClienteModalOpen] = useState(false);
  const [clienteSeleccionadoApp, setClienteSeleccionadoApp] = useState(null);
  const [isReporteModalOpen, setIsReporteModalOpen] = useState(false);
  const [clienteParaReporte, setClienteParaReporte] = useState(null);

  // --- INTERSECTION OBSERVER PARA BOTÓN FLOTANTE ---
  const [isConsoleVisible, setIsConsoleVisible] = useState(true);
  const consoleRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsConsoleVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" } // Compensa la altura del NavBar
    );
    if (consoleRef.current) {
      observer.observe(consoleRef.current);
    }
    return () => {
      if (consoleRef.current) observer.unobserve(consoleRef.current);
    };
  }, []);

  useEffect(() => {
    if (!loadingPersonal) {
      if (!personal) setIsModalPersonalOpen(true);
      else if (!unidad) setIsModalUnidadOpen(true);
      else if (!datosBancarios) setIsModalBancoOpen(true);
      else if (!tarifa) setIsModalTarifaOpen(true);
    }
  }, [loadingPersonal, personal, unidad, datosBancarios, tarifa]);

  const handlePersonalGuardado = () => {
    setIsModalPersonalOpen(false);
    fetchUserData();
  };
  const handleUnidadGuardada = () => {
    setIsModalUnidadOpen(false);
    fetchUserData();
  };
  const handleBancoGuardado = () => {
    setIsModalBancoOpen(false);
    fetchUserData();
  };
  const handleTarifaGuardada = () => {
    setIsModalTarifaOpen(false);
    fetchUserData();
  };

  const fetchListaDiaria = useCallback(async () => {
    if (!activeTurnoId) {
      setListaDiaria([]);
      return;
    }

    const { data, error } = await supabase
      .from("carga_casa")
      .select(
        `id_carga, consumo_litros, ret, monto_total,tipo_pago_resto, monto_pendiente , tipo_pago, id_porcentaje, casa_habitacion ( calle, numero, colonia )`
      )
      .eq("id_porcentaje", activeTurnoId);

    if (error) console.error("Error fetching lista diaria:", error);
    else if (data) {
      const flattenedData = data.map((item) => ({
        ...item,
        calle: item.casa_habitacion?.calle,
        numero: item.casa_habitacion?.numero,
        colonia: item.casa_habitacion?.colonia,
      }));
      setListaDiaria(flattenedData);
    }
  }, [activeTurnoId]);

  const fetchPagosDiarios = useCallback(async () => {
    if (!activeTurnoId) {
      setPagosDiarios([]);
      return;
    }

    try {
      const { data: pagosData, error } = await supabase
        .from("pagos")
        .select(`
          *,
          carga_casa (
            casa_habitacion ( nombre_cliente )
          )
        `)
        .eq("id_turno", activeTurnoId);

      if (error) throw error;

      let pagosFinales = pagosData || [];

      const idsCuentas = pagosFinales
        .filter((p) => !p.carga_casa && p.id_cuenta) 
        .map((p) => p.id_cuenta);

      if (idsCuentas.length > 0) {
        const idsUnicos = [...new Set(idsCuentas)];

        const { data: cuentasData } = await supabase
          .from("cuentas_por_cobrar")
          .select(`
            id,
            casa_habitacion ( nombre_cliente )
          `)
          .in("id", idsUnicos);

        const mapaNombres = {};
        if (cuentasData) {
          cuentasData.forEach((c) => {
            mapaNombres[c.id] = c.casa_habitacion?.nombre_cliente;
          });
        }

        pagosFinales = pagosFinales.map((p) => {
          const nombreVenta = p.carga_casa?.casa_habitacion?.nombre_cliente;
          const nombreAbono = p.id_cuenta ? mapaNombres[p.id_cuenta] : null;

          return {
            ...p,
            nombre_cliente: nombreVenta || nombreAbono || "Cliente / Abono",
            apellidos_cliente: "",
          };
        });
      } else {
        pagosFinales = pagosFinales.map((p) => ({
          ...p,
          nombre_cliente: p.carga_casa?.casa_habitacion?.nombre_cliente || "Cliente",
        }));
      }

      setPagosDiarios(pagosFinales);
    } catch (err) {
      console.error("Error cargando pagos:", err);
    }
  }, [activeTurnoId]);

  const verificarEstadoFinDeDia = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString("fr-CA", {
        timeZone: "America/Mexico_City",
      });

      const { data: ultimoRegistro, error: porError } = await supabase
        .from("porcentaje_diario")
        .select("*")
        .eq("fecha", today)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (porError) {
        console.error(porError);
        return;
      }

      if (!ultimoRegistro) {
        setEstadoDelDia("CERRADO");
        setActiveTurnoId(null);
        return;
      }

      if (ultimoRegistro.porcentaje_final !== null) {
        const { data: ultimoReporte, error: repError } = await supabase
          .from("reporte_diario")
          .select("finalizado")
          .eq("fecha", today)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (repError) console.error(repError);

        if (ultimoReporte && ultimoReporte.finalizado === true) {
          setEstadoDelDia("CERRADO");
          setActiveTurnoId(null);
        } else {
          setEstadoDelDia("TERMINADO");
          setRegistrador({ id: ultimoRegistro.registrador_id });
          setActiveTurnoId(ultimoRegistro.id);
        }
      } else {
        setEstadoDelDia("INICIADO");
        setRegistrador({ id: ultimoRegistro.registrador_id });
        setActiveTurnoId(ultimoRegistro.id);
      }
    } catch (error) {
      console.error("Error validando estado:", error);
    }
  }, []);

  const fetchAgenda = useCallback(async () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const endOfToday = today.toISOString();

    const { data, error } = await supabase
      .from("agenda")
      .select(
        `id, fecha_proxima_carga, comentario, id_casa, casa_habitacion (nombre_cliente, calle, numero, colonia)`
      )
      .lte("fecha_proxima_carga", endOfToday)
      .order("fecha_proxima_carga", { ascending: true });

    if (error) console.error("Error fetching agenda:", error);
    else setAgenda(data);
  }, []);

  const fixFecha = (fechaString) => {
    if (!fechaString) return new Date();
    const fecha = new Date(fechaString);
    const userTimezoneOffset = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() + userTimezoneOffset);
  };

  const getStatusFecha = (fechaString) => {
    const fechaAgenda = fixFecha(fechaString);
    const hoy = new Date();
    const fechaAgendaDate = new Date(
      fechaAgenda.getFullYear(),
      fechaAgenda.getMonth(),
      fechaAgenda.getDate()
    );
    const hoyDate = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (fechaAgendaDate < hoyDate) return "atrasado";
    return "hoy";
  };

  // --- AGRUPACIÓN Y BÚSQUEDA EN AGENDA ---
  const agendaGroups = useMemo(() => {
    const groups = {};
    agenda.forEach((item) => {
      const nombre = item.casa_habitacion?.nombre_cliente?.toLowerCase() || "";
      if (agendaSearch && !nombre.includes(agendaSearch.toLowerCase())) return;
  
      const d = fixFecha(item.fecha_proxima_carga);
      const dateKey = d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
      const dateLabel = d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
  
      if (!groups[dateKey]) groups[dateKey] = { label: dateLabel, items: [], dateObj: d };
      groups[dateKey].items.push(item);
    });
    return Object.entries(groups)
      .sort((a, b) => a[1].dateObj - b[1].dateObj)
      .map(([key, val]) => ({ id: key, label: val.label, items: val.items }));
  }, [agenda, agendaSearch]);

  useEffect(() => {
    if (agendaGroups.length > 0 && !agendaGroups.find(g => g.id === selectedDateGroup)) {
      setSelectedDateGroup(agendaGroups[0].id);
    } else if (agendaGroups.length === 0) {
      setSelectedDateGroup(null);
    }
  }, [agendaGroups, selectedDateGroup]);

  const handleDeletePago = async (id_pago) => {
    if (!confirm("⚠️ ¿Estás seguro de eliminar este abono?\n\nAl eliminarlo:\n1. Se borrará del corte del día.\n2. Se le regresará la deuda al cliente (si aplica).")) {
      return;
    }

    try {
      const { error } = await supabase.rpc("eliminar_pago_seguro", { p_id_pago: id_pago });
      if (error) throw error;
      
      alert("Abono eliminado correctamente.");
      fetchPagosDiarios();
    } catch (error) {
      console.error(error);
      alert("Error eliminando: " + error.message);
    }
  };

  const refreshData = useCallback(() => {
    verificarEstadoFinDeDia();
    fetchPagosDiarios();
    fetchListaDiaria();
    fetchAgenda();
  }, [
    verificarEstadoFinDeDia,
    fetchPagosDiarios,
    fetchListaDiaria,
    fetchAgenda,
  ]);

  const handleReagendar = (item) => {
    setSelectedAgendaItem(item);
    setIsModalAgendaOpen(true);
  };

  const handleDeleteAgenda = async (id_agenda) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta entrada de la agenda?")) return;
    const { error } = await supabase.from("agenda").delete().eq("id", id_agenda);
    if (error) console.error("Error deleting agenda item:", error);
    else fetchAgenda();
  };

  useEffect(() => {
    const fetchClientes = async () => {
      await supabase.rpc("get_clientes_para_carga");
    };
    const fetchProximaCargaEdificio = async () => {
      const { data, error } = await supabase.rpc("get_prox_carga_edificio");
      if (!error) setProximaCargaEdificios(data);
    };

    fetchClientes();
    refreshData();
    fetchAgenda();
    fetchProximaCargaEdificio();
  }, [fetchAgenda, refreshData]);

  useEffect(() => {
    if (activeTurnoId) {
      fetchListaDiaria();
    } else {
      setListaDiaria([]);
    }
  }, [activeTurnoId, fetchListaDiaria]);

  const handleOpenVentaModal = () => setIsModalVentaOpen(true);
  const handleOpenNuevoDiaModal = () => setIsModalNuevoDiaOpen(true);
  const handleOpenFinDiaModal = () => setIsModalFinDiaOpen(true);
  const handleOpenActividadesModal = () => setIsModalFinDiaCompletoOpen(true);

  const handleModify = (id) => {
    const venta = listaDiaria.find((item) => item.id_carga === id);
    setSelectedVenta(venta);
    setIsModalVentaOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este registro?")) return;
    const { error } = await supabase.from("carga_casa").delete().eq("id_carga", id);
    if (error) console.log("Hubo un error al eliminar el registro.");
    else fetchListaDiaria();
  };

  const handleDiaGuardado = (abrirSiguientePaso = false) => {
    refreshData();
    if (abrirSiguientePaso) {
      setIsModalFinDiaOpen(false);
      setTimeout(() => {
        setIsModalFinDiaCompletoOpen(true);
      }, 300);
    }
  };

  const handleFinDiaCompletoGuardado = () => {
    setIsModalFinDiaCompletoOpen(false);
    refreshData();
  };

  // --- HANDLERS PARA EL BUSCADOR FLOTANTE GLOBAL ---
  const handleEditClientFromSearch = (client) => {
    setClienteSeleccionadoApp(client);
    setIsNuevoClienteModalOpen(true);
  };
  const handleReportClientFromSearch = (client) => {
    setClienteParaReporte(client);
    setIsReporteModalOpen(true);
  };

  const formatMoney = (amount) =>
    Number(amount).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

  const getPaymentBadgeStyle = (tipo) => {
    switch (tipo.toLowerCase()) {
      case "efectivo":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "transferencia":
        return "bg-sky-100 text-sky-700 border-sky-200";
      case "tarjeta":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Renderizador de las tarjetas de ventas para reutilizarlo en grid o carrusel
  const renderCardsVentas = () => {
    return listaDiaria.map((item, index) => (
      <div
        key={item.id_carga || index}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700 transition-all duration-300 overflow-hidden group flex flex-col justify-between shrink-0 snap-center min-w-[85vw] sm:min-w-[320px] w-full"
      >
        <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-700 flex items-start gap-3">
          <div className="mt-1 bg-white dark:bg-slate-700 p-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-600 text-sky-500 dark:text-sky-400">
            <Icon icon="mdi:map-marker-radius" width="20" />
          </div>
          <div>
            <p className="font-extrabold text-slate-700 dark:text-slate-100 text-[15px] leading-tight mb-0.5">
              {item.calle} #{item.numero}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
              {item.colonia}
            </p>
          </div>
        </div>

        <div className="p-5 flex-1">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-widest mb-1">
                Consumo
              </p>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-bold text-lg">
                <Icon icon="mdi:gas-station" className="text-sky-500" width="20" />
                <span>{item.consumo_litros} L</span>
              </div>
              {Number(item.ret) > 0 && (
                <div className="flex items-center gap-1 text-rose-500 dark:text-rose-400 text-xs font-bold mt-1.5 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-md inline-flex">
                  <Icon icon="mdi:gas-burner" width="14" />
                  <span>Ret: {item.ret} L</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-widest mb-1">
                Total
              </p>
              <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                {formatMoney(item.monto_total)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-start mt-2">
            <span
              className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider border ${getPaymentBadgeStyle(
                item.tipo_pago
              )}`}
            >
              {item.tipo_pago}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-700 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl">
          <button
            onClick={() => handleModify(item.id_carga)}
            className="py-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Icon icon="mdi:pencil-outline" width="18" /> Editar
          </button>
          <button
            onClick={() => handleDelete(item.id_carga)}
            className="py-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Icon icon="mdi:trash-can-outline" width="18" /> Eliminar
          </button>
        </div>
      </div>
    ));
  };

  return (
    <main className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-10 font-sans transition-colors duration-300">
      {/* Botón Flotante Nueva Venta (Móvil siempre, Escritorio/Tablet al hacer scroll) */}
      {estadoDelDia === "INICIADO" && (
        <button
          onClick={handleOpenVentaModal}
          className={`fixed bottom-6 right-6 z-40 bg-sky-500 text-white p-4 rounded-full shadow-lg shadow-sky-500/40 transition-all duration-300 hover:scale-105 ${
            isConsoleVisible ? "md:opacity-0 md:invisible md:translate-y-5" : "opacity-100 visible translate-y-0"
          }`}
        >
          <Icon icon="mdi:plus-thick" width="28" />
        </button>
      )}

      {/* --- SECCIÓN LISTA DIARIA --- */}
      <section className="m-auto max-w-6xl px-4 py-8">
        <h2 className="font-extrabold text-center text-3xl text-blue-900 dark:text-sky-400 mb-8 tracking-tight transition-colors duration-300">
          Lista Diaria de Ventas
        </h2>

        {/* BOTONERA DE ACCIONES DEL DÍA */}
        <div ref={consoleRef} className="flex flex-row items-center justify-center gap-4 mb-10 flex-wrap">
          <button
            onClick={handleOpenNuevoDiaModal}
            disabled={estadoDelDia !== "CERRADO"}
            className={`flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold shadow-sm transition-all ${
              estadoDelDia === "CERRADO"
                ? "bg-sky-500 text-white hover:bg-sky-600 hover:shadow-md hover:-translate-y-0.5"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Icon icon="mdi:weather-sunny" width="20" /> Nuevo Día
          </button>

          <button
            onClick={handleOpenFinDiaModal}
            disabled={estadoDelDia !== "INICIADO"}
            className={`flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold shadow-sm transition-all ${
              estadoDelDia === "INICIADO"
                ? "bg-slate-800 text-white hover:bg-slate-700 hover:shadow-md hover:-translate-y-0.5"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Icon icon="mdi:weather-night" width="20" /> Fin de Día
          </button>

          <button
            onClick={handleOpenActividadesModal}
            disabled={estadoDelDia !== "TERMINADO"}
            className={`flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold shadow-sm transition-all ${
              estadoDelDia === "TERMINADO"
                ? "bg-amber-500 text-white hover:bg-amber-600 hover:shadow-md hover:-translate-y-0.5 animate-pulse"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Icon icon="mdi:factory" width="20" /> Planta
          </button>

          <button
            onClick={handleOpenVentaModal}
            disabled={estadoDelDia !== "INICIADO"}
            className={`hidden md:flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold shadow-sm transition-all ${
              estadoDelDia === "INICIADO"
                ? "bg-blue-900 text-white hover:bg-blue-800 hover:shadow-md hover:-translate-y-0.5"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Icon icon="mdi:plus-circle-outline" width="20" /> Nueva Venta
          </button>

          {/* --- BOTON TOGGLE TEMA OSCURO --- */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 py-2.5 px-6 rounded-xl font-bold shadow-sm transition-all bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:shadow-md hover:-translate-y-0.5"
          >
            <Icon icon={isDarkMode ? "line-md:sunny-outline-to-moon-transition" : "line-md:moon-alt-to-sunny-outline-loop-transition"} width="20" />
            {isDarkMode ? "Modo Claro" : "Modo Oscuro"}
          </button>
        </div>

        {/* --- TARJETAS DE VENTA --- */}
        {listaDiaria.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Ventas hoy: <span className="text-blue-900 dark:text-sky-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">{listaDiaria.length}</span></p>
              <div className="flex bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button onClick={() => setViewMode("grid")} className={`px-4 py-2 transition-colors ${viewMode === "grid" ? "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                  <Icon icon="mdi:view-grid" width="20" />
                </button>
                <button onClick={() => setViewMode("carousel")} className={`px-4 py-2 transition-colors ${viewMode === "carousel" ? "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                  <Icon icon="mdi:view-carousel" width="20" />
                </button>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderCardsVentas()}
              </div>
            ) : (
              <div className="flex overflow-x-auto gap-5 pb-6 pt-2 snap-x snap-mandatory scroll-smooth hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-1">
                {renderCardsVentas()}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl shadow-sm">
            {estadoDelDia === "CERRADO" ? (
              <>
                <Icon icon="mdi:store-clock-outline" className="text-slate-200 dark:text-slate-600 w-20 h-20 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg text-center">
                  El turno está cerrado.
                </p>
                <button
                  onClick={handleOpenNuevoDiaModal}
                  className="mt-4 bg-sky-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-sky-600 shadow-md transition-all hover:-translate-y-0.5"
                >
                  Iniciar Nuevo Día
                </button>
              </>
            ) : (
              <>
                <Icon icon="mdi:clipboard-text-off-outline" className="text-slate-200 dark:text-slate-600 w-20 h-20 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg text-center">
                  No hay ventas registradas en este turno aún.
                </p>
                <button
                  onClick={handleOpenVentaModal}
                  className="mt-4 bg-blue-900 dark:bg-sky-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-800 dark:hover:bg-sky-500 shadow-md transition-all hover:-translate-y-0.5"
                >
                  ¡Registra la primera venta!
                </button>
              </>
            )}
          </div>
        )}
      </section>

      <DailySummary listaDiaria={listaDiaria} pagosDiarios={pagosDiarios} onDeletePago={handleDeletePago} />

      {/* --- SECCIÓN AGENDA --- */}
      <section className="m-auto max-w-6xl px-4 mb-16 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 border-b border-slate-200 pb-4">
          <h2 className="text-3xl font-extrabold text-blue-900 tracking-tight">
            Agenda de Cargas
          </h2>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon="mdi:magnify" className="text-slate-400" width="20" />
              </div>
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-slate-700 shadow-sm"
                value={agendaSearch}
                onChange={(e) => setAgendaSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                setSelectedAgendaItem(null);
                setIsModalAgendaOpen(true);
              }}
              className="flex shrink-0 items-center justify-center p-2.5 bg-blue-900 text-white rounded-xl shadow-md hover:bg-blue-800 transition-all hover:-translate-y-0.5"
              title="Agendar Nuevo Cliente"
            >
              <Icon icon="mdi:calendar-plus" width="24" />
            </button>
          </div>
        </div>

        {agendaGroups.length > 0 ? (
          <>
            {/* CARRUSEL DE FECHAS (TABS) */}
            <div className="flex overflow-x-auto gap-3 mb-8 pb-2 hide-scrollbar">
              {agendaGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedDateGroup(group.id)}
                  className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all border ${
                    selectedDateGroup === group.id 
                    ? 'bg-blue-900 text-white border-blue-900 shadow-md' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50'
                  }`}
                >
                  {group.label} <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${selectedDateGroup === group.id ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{group.items.length}</span>
                </button>
              ))}
            </div>

            {/* GRID DE CLIENTES PARA LA FECHA SELECCIONADA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agendaGroups.find(g => g.id === selectedDateGroup)?.items.map((item) => {
              const status = getStatusFecha(item.fecha_proxima_carga);
              const fechaVisual = fixFecha(item.fecha_proxima_carga);
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 relative overflow-hidden group
                    ${
                      status === "atrasado"
                        ? "border-l-4 border-l-rose-500"
                        : "border-l-4 border-l-emerald-500"
                    }
                  `}
                >
                  <div
                    className={`absolute top-4 right-4 text-[10px] font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider
                      ${
                        status === "atrasado"
                          ? "bg-rose-50 text-rose-600"
                          : "bg-emerald-50 text-emerald-600"
                      }
                  `}
                  >
                    {status === "atrasado" ? "Atrasado" : "Para Hoy"}
                  </div>

                  <div className="flex items-start gap-4 mb-3">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-full text-sky-500">
                      <Icon icon="mdi:account-circle-outline" width="28" />
                    </div>
                    <div className="pr-16">
                      <h3 className="font-black text-slate-800 text-lg leading-tight">
                        {item.casa_habitacion.nombre_cliente}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-bold">
                        <Icon icon="mdi:map-marker" width="12" />
                        {item.casa_habitacion.colonia}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-5">
                    <p className="text-[13px] text-slate-600 bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex items-start gap-2 font-medium">
                      <Icon
                        icon="mdi:home-map-marker"
                        className="mt-0.5 text-sky-500 min-w-4"
                      />
                      <span>
                        {item.casa_habitacion.calle} #
                        {item.casa_habitacion.numero}
                      </span>
                    </p>
                    {item.comentario && (
                      <p className="text-[13px] text-amber-700 bg-amber-50 p-2.5 rounded-lg flex items-start gap-2 border border-amber-100 font-medium">
                        <Icon
                          icon="mdi:comment-text-outline"
                          className="mt-0.5 text-amber-500 min-w-4"
                        />
                        <span>"{item.comentario}"</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Icon icon="mdi:clock-outline" width="16" />
                      {fechaVisual.toLocaleDateString("es-MX", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReagendar(item)}
                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        <Icon icon="mdi:calendar-edit" width="22" />
                      </button>
                      <button
                        onClick={() => handleDeleteAgenda(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Icon icon="mdi:trash-can-outline" width="22" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
            <Icon
              icon="mdi:calendar-blank-outline"
              width="64"
              className="text-slate-200 mb-4"
            />
            <p className="text-slate-500 font-medium text-center text-lg">
              No hay clientes pendientes.
            </p>
          </div>
        )}
      </section>

      {/* MODALES */}
      <ModalNuevaVenta
        isOpen={isModalVentaOpen}
        onClose={() => setIsModalVentaOpen(false)}
        venta={selectedVenta}
        onVentaGuardada={refreshData}
        tarifa={tarifa} 
        unidad={unidad} 
        datosBancarios={datosBancarios} 
        user={appUser} 
        idTurnoExterno={activeTurnoId}
      />
      <ModalNuevoDia
        isOpen={isModalNuevoDiaOpen}
        onClose={() => setIsModalNuevoDiaOpen(false)}
        onDiaGuardado={() => handleDiaGuardado(false)} 
      />
      <ModalFinDia
        isOpen={isModalFinDiaOpen}
        onClose={() => setIsModalFinDiaOpen(false)}
        onDiaFinalizado={(requiereActividades) =>
          handleDiaGuardado(requiereActividades)
        }
        listaDiaria={listaDiaria}
        pagosDiarios={pagosDiarios}
        unidad={unidad}
        idTurno={activeTurnoId} 
      />
      <ModalFinDiaCompleto
        isOpen={isModalFinDiaCompletoOpen}
        onClose={() => setIsModalFinDiaCompletoOpen(false)}
        registrador={registrador}
        onDiaFinalizado={handleFinDiaCompletoGuardado}
        listaDiaria={listaDiaria}
        pagosDiarios={pagosDiarios}
        unidad={unidad}
        idTurno={activeTurnoId} 
      />
      <ModalAgendarCliente
        isOpen={isModalAgendaOpen}
        onClose={() => setIsModalAgendaOpen(false)}
        agendaItem={selectedAgendaItem}
        onAgendaGuardada={() => {
          fetchAgenda();
          setSelectedAgendaItem(null);
        }}
      />
      <ModalPersonal
        isOpen={isModalPersonalOpen}
        onClose={() => setIsModalPersonalOpen(false)}
        onSave={handlePersonalGuardado}
        appUser={appUser}
      />
      <ModalUnidad
        isOpen={isModalUnidadOpen}
        onClose={() => setIsModalUnidadOpen(false)}
        onSave={handleUnidadGuardada}
      />
      <ModalBanco
        isOpen={isModalBancoOpen}
        onClose={() => setIsModalBancoOpen(false)}
        onSave={handleBancoGuardado}
      />
      <ModalTarifa
        isOpen={isModalTarifaOpen}
        onClose={() => setIsModalTarifaOpen(false)}
        onSave={handleTarifaGuardada}
      />
      
      {/* MODALES DISPARADOS DESDE EL BUSCADOR FLOTANTE */}
      <ModalNuevoCliente
        isOpen={isNuevoClienteModalOpen}
        onClose={() => setIsNuevoClienteModalOpen(false)}
        cliente={clienteSeleccionadoApp}
      />
      <ModalReporteCliente
        isOpen={isReporteModalOpen}
        onClose={() => setIsReporteModalOpen(false)}
        cliente={clienteParaReporte}
      />

      <BuscadorFlotante 
        onEdit={handleEditClientFromSearch}
        onReport={handleReportClientFromSearch}
      />
    </main>
  );
};
