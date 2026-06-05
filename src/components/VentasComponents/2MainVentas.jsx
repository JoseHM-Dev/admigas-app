import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import ModalNuevaVenta from "../ui/Modales/ModalNuevaVenta";
import { DailySummary } from "../ui/DailySummary";
import { useAuth } from "../../auth/useAuth";

export const MainVentas = () => {
  const { user, tarifa, unidad, datosBancarios } = useAuth();
  // Estado para ver fotos en grande (Zoom)
  const [previewImage, setPreviewImage] = useState(null);

  const today = new Date();
  const offset = today.getTimezoneOffset();
  today.setMinutes(today.getMinutes() - offset);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    today.toISOString().split("T")[0]
  );

  // NUEVOS ESTADOS PARA MANEJO DE TURNOS MÚLTIPLES
  const [turnosDelDia, setTurnosDelDia] = useState([]);
  const [selectedTurnoId, setSelectedTurnoId] = useState(null);

  const [ventas, setVentas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estado para ver detalle de una venta
  const [selectedVentaDetalle, setSelectedVentaDetalle] = useState(null);

  // Datos para Reporte
  const [turnoData, setTurnoData] = useState(null);
  const [plantData, setPlantData] = useState({
    autotanque: [],
    carburacion: [],
  });
  const [reporteCerrado, setReporteCerrado] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- FUNCIÓN PARA CORREGIR FECHAS (SOLUCIÓN DEL DÍA ANTERIOR) ---
  const fixFechaVisual = (fechaStr, soloHora = false) => {
    if (!fechaStr) return "-";

    // 1. Convertimos el string a objeto Date
    const fechaObj = new Date(fechaStr);

    // 2. Si es solo fecha YYYY-MM-DD (sin T de tiempo), corregimos el offset
    // Esto evita que "2025-10-25" se convierta en "24 de oct a las 18:00"
    if (!fechaStr.includes("T") && !fechaStr.includes(":")) {
      const userTimezoneOffset = fechaObj.getTimezoneOffset() * 60000;
      const fechaCorregida = new Date(fechaObj.getTime() + userTimezoneOffset);

      return fechaCorregida.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    // 3. Si tiene hora (Timestamp completo), lo mostramos normal
    if (soloHora) {
      return fechaObj.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return fechaObj.toLocaleString("es-MX");
  };

  // --- 1. PRIMER PASO: BUSCAR TODOS LOS TURNOS DE LA FECHA ---
  const fetchTurnosDelDia = useCallback(async () => {
    if (!fechaSeleccionada) return;
    setCargando(true);

    try {
      const { data, error } = await supabase
        .from("porcentaje_diario")
        .select(
          `*, registrador_inicial:personal!registrador_id (nombre, apellidos)`
        )
        .eq("fecha", fechaSeleccionada)
        .order("id", { ascending: false });

      if (error) throw error;

      setTurnosDelDia(data || []);

      if (data && data.length > 0) {
        setSelectedTurnoId((prev) => {
          const existe = data.find((t) => t.id === prev);
          return existe ? prev : data[0].id;
        });
      } else {
        setSelectedTurnoId(null);
        setTurnoData(null);
        setVentas([]);
        setPagos([]);
      }
    } catch (err) {
      console.error("Error buscando turnos:", err);
      setTurnosDelDia([]);
    } finally {
      setCargando(false);
    }
  }, [fechaSeleccionada]);

  // --- 2. SEGUNDO PASO: CARGAR DATOS DEL TURNO SELECCIONADO ---
  const fetchDetallesTurno = useCallback(async () => {
    if (!selectedTurnoId) return;

    setCargando(true);
    const turnoActual = turnosDelDia.find((t) => t.id == selectedTurnoId);
    setTurnoData(turnoActual);
    setReporteCerrado(false);

    try {
      if (turnoActual) {
        // A. OBTENER PAGOS
        const { data: pagosRaw } = await supabase
          .from("pagos")
          .select(`*, carga_casa ( casa_habitacion ( nombre_cliente ) )`)
          .eq("id_turno", turnoActual.id);

        let pagosProcesados = pagosRaw || [];

        const idsCuentasVentas = pagosProcesados
          .filter((p) => !p.carga_casa && p.id_cuenta)
          .map((p) => p.id_cuenta);

        if (idsCuentasVentas.length > 0) {
          const idsUnicos = [...new Set(idsCuentasVentas)];
          const { data: infoCuentas } = await supabase
            .from("cuentas_por_cobrar")
            .select("id, casa_habitacion(nombre_cliente)")
            .in("id", idsUnicos);

          const mapa = {};
          infoCuentas?.forEach((ic) => {
            mapa[ic.id] = ic.casa_habitacion?.nombre_cliente;
          });

          pagosProcesados = pagosProcesados.map((p) => ({
            ...p,
            nombre_cliente:
              p.carga_casa?.casa_habitacion?.nombre_cliente ||
              mapa[p.id_cuenta] ||
              "Abono Crédito",
          }));
        } else {
          pagosProcesados = pagosProcesados.map((p) => ({
            ...p,
            nombre_cliente:
              p.carga_casa?.casa_habitacion?.nombre_cliente || "Cliente",
          }));
        }
        setPagos(pagosProcesados);

        // B. OBTENER VENTAS DEL TURNO
        // AGREGAMOS 'created_at' EN LA CONSULTA PARA MOSTRAR LA HORA REAL
        const { data: ventasData, error: ventasError } = await supabase
          .from("carga_casa")
          .select(
            `
            id_carga, fecha_carga, consumo_litros, ret, monto_total, monto_pendiente, tipo_pago_resto, tipo_pago, id_porcentaje,
            casa_habitacion ( calle, numero, colonia, nombre_cliente, telefono )
          `
          )
          .eq("id_porcentaje", turnoActual.id)
          .order("fecha_carga", { ascending: false });

        if (ventasError) throw ventasError;
        setVentas(ventasData || []);

        // C. VERIFICAR REPORTE CIERRE
        const { data: reporte } = await supabase
          .from("reporte_diario")
          .select("id, finalizado")
          .eq("fecha", fechaSeleccionada)
          .maybeSingle();

        if (reporte) setReporteCerrado(true);

        // D. DATOS DE PLANTA
        const { data: autoData } = await supabase
          .from("carga_autotanque")
          .select("*")
          .eq("fecha", fechaSeleccionada);
        const { data: carbData } = await supabase
          .from("carburacion")
          .select("*")
          .eq("fecha", fechaSeleccionada);
        setPlantData({
          autotanque: autoData || [],
          carburacion: carbData || [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, [selectedTurnoId, turnosDelDia, fechaSeleccionada]);

  useEffect(() => {
    fetchTurnosDelDia();
  }, [fetchTurnosDelDia]);

  useEffect(() => {
    fetchDetallesTurno();
  }, [fetchDetallesTurno]);

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Evita que se abra el modal al eliminar
    if (!window.confirm("¿Eliminar este registro de venta?")) return;
    const { error } = await supabase
      .from("carga_casa")
      .delete()
      .eq("id_carga", id);
    if (!error) {
      fetchDetallesTurno();
      if (selectedVentaDetalle?.id_carga === id) setSelectedVentaDetalle(null);
    }
  };

  const handleRowClick = (venta) => {
    setSelectedVentaDetalle(venta);
  };

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

  const handlePrint = () => window.print();

  const renderEstadoBadge = () => {
    if (!turnoData) {
      return (
        <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
          <Icon icon="mdi:close-octagon-outline" width="16" /> Sin Turno
        </span>
      );
    }
    if (turnoData.porcentaje_final !== null) {
      return (
        <span className="px-4 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
          <Icon icon="mdi:check-circle" width="16" /> Turno Finalizado
        </span>
      );
    }
    return (
      <span className="px-4 py-1.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1.5 border border-sky-200 dark:border-sky-800 animate-pulse">
        <Icon icon="mdi:clock-outline" width="16" /> Turno Abierto
      </span>
    );
  };

  return (
    <main className="bg-slate-50 dark:bg-slate-900 pb-20 min-h-screen relative font-sans transition-colors duration-300">
      <div className="pt-6 print:hidden">
        <Titulo Texto="Historial y Reportes" />
      </div>

      <section className="m-auto max-w-6xl p-4 space-y-8">
        {/* FILTROS */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 print:hidden transition-colors duration-300">
          <div className="flex flex-col md:flex-row items-center gap-5 w-full md:w-auto">
            <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg text-sky-600 dark:text-sky-400">
                <Icon icon="mdi:calendar-search" width="24" />
              </div>
              <div className="flex flex-col w-full">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Fecha de Consulta
                </label>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="font-bold text-slate-700 dark:text-slate-200 bg-transparent outline-none cursor-pointer w-full"
                />
              </div>
            </div>

            {turnosDelDia.length > 0 && (
              <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 animate-in fade-in">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                  <Icon icon="mdi:clock-time-four-outline" width="24" />
                </div>
                <div className="flex flex-col w-full">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Seleccionar Turno
                  </label>
                  <select
                    value={selectedTurnoId || ""}
                    onChange={(e) => setSelectedTurnoId(Number(e.target.value))}
                    className="font-bold text-slate-700 dark:text-slate-200 bg-transparent outline-none cursor-pointer pr-4 w-full"
                  >
                    {turnosDelDia.map((t, index) => (
                      <option key={t.id} value={t.id}>
                        Turno #{t.id} -{" "}
                        {new Date(
                          t.created_at || Date.now()
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {index === 0 ? " (Último)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <Link
              to="/dashboard"
              className="flex-1 md:flex-none px-4 py-2.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-900 dark:hover:text-sky-400 rounded-xl font-bold shadow-sm transition-all text-sm flex items-center justify-center gap-2"
            >
              <Icon icon="mdi:view-dashboard-outline" width="18" /> Dashboard
            </Link>
            {turnoData && !reporteCerrado && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex-1 md:flex-none px-4 py-2.5 bg-blue-900 dark:bg-sky-600 hover:bg-blue-800 dark:hover:bg-sky-500 text-white rounded-xl font-bold shadow-md transition-all text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5"
              >
                <Icon icon="mdi:plus" width="18" /> Nueva Venta
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex-1 md:flex-none px-4 py-2.5 bg-sky-500 text-white hover:bg-sky-600 rounded-xl font-bold shadow-md transition-all text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <Icon icon="mdi:printer" width="18" /> Imprimir
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Icon
              icon="line-md:loading-loop"
              width="48"
              className="text-sky-500 mb-4"
            />
            <p className="text-slate-400 font-bold animate-pulse">Cargando reporte...</p>
          </div>
        ) : (
          <div className="print:p-0">
            {/* ENCABEZADO */}
            <div className="text-center mb-8 print:text-left print:mb-6">
              <h2 className="text-3xl font-extrabold text-blue-900 tracking-tight">
                Reporte Operativo
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-lg mt-1">
                {new Date(fechaSeleccionada + "T00:00:00").toLocaleDateString(
                  "es-MX",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </p>
              {turnoData && (
                <p className="text-xs text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mt-2">
                  ID Turno: {turnoData.id}
                </p>
              )}
              <div className="mt-2 flex justify-center print:justify-start">
                {renderEstadoBadge()}
              </div>
            </div>

            {turnoData ? (
              <>
                {/* FOTOS EVIDENCIA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:grid-cols-2 print:gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-300">
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 p-4 flex justify-between items-center text-slate-700 dark:text-slate-300 print:bg-gray-200 print:text-black">
                      <span className="font-bold text-sm uppercase flex items-center gap-2">
                        <Icon icon="mdi:login" className="text-sky-500" width="20" /> Inicio de Turno
                      </span>
                      <span className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-1 rounded-lg font-bold shadow-sm">
                        {turnoData.registrador_inicial?.nombre}
                      </span>
                    </div>
                    <div className="p-6 flex flex-col sm:flex-row gap-6 items-center">
                      <div className="w-full sm:w-1/2 text-center sm:text-left">
                        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider">
                          Nivel Inicial
                        </p>
                        <p className="text-4xl font-black text-slate-800 dark:text-white mt-1">
                          {turnoData.porcentaje_inicial}%
                        </p>
                      </div>
                      <div className="w-full sm:w-1/2 aspect-video sm:aspect-square bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img
                          src={turnoData.url_inicial}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          alt="Ini"
                          onClick={() => setPreviewImage(turnoData.url_inicial)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-300">
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 p-4 flex justify-between items-center text-slate-700 dark:text-slate-300 print:bg-gray-200 print:text-black">
                      <span className="font-bold text-sm uppercase flex items-center gap-2">
                        <Icon icon="mdi:logout" className="text-rose-500" width="20" /> Cierre de Turno
                      </span>
                    </div>
                    <div className="p-6 flex flex-col sm:flex-row gap-6 items-center">
                      <div className="w-full sm:w-1/2 text-center sm:text-left">
                        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider">
                          Nivel Final
                        </p>
                        <p className="text-4xl font-black text-slate-800 dark:text-white mt-1">
                          {turnoData.porcentaje_final ?? "--"}%
                        </p>
                      </div>
                      <div className="w-full sm:w-1/2 aspect-video sm:aspect-square bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        {turnoData.url_final ? (
                          <img
                            src={turnoData.url_final}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            alt="Fin"
                            onClick={() => setPreviewImage(turnoData.url_final)}
                          />
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                            Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <DailySummary listaDiaria={ventas} pagosDiarios={pagos} />
                </div>

                {(plantData.autotanque.length > 0 ||
                  plantData.carburacion.length > 0) && (
                  <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm transition-colors duration-300">
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                      <Icon icon="mdi:factory" width="24" className="text-amber-500" />{" "}
                      Registro de Planta
                    </h3>
                    {/* --- SECCIÓN AUTOTANQUE CON FOTOS --- */}
                    {plantData.autotanque.map((a, i) => (
                      <div
                        key={`auto-${i}`}
                        className="flex flex-col md:flex-row justify-between items-center border-b py-4 last:border-0 border-slate-100 dark:border-slate-700 gap-4"
                      >
                        {/* 1. Título y Precio */}
                        <div className="flex flex-col w-full md:w-1/4">
                          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <div className="p-2 bg-sky-50 dark:bg-sky-900/30 rounded-lg text-sky-500 dark:text-sky-400">
                              <Icon icon="hugeicons:tanker-truck" width="20" />
                            </div>
                            Carga Autotanque
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold ml-11 mt-1 tracking-wider uppercase">
                            Precio: {formatMoney(a.precio)}
                          </span>
                        </div>

                        {/* 2. NIVELES Y FOTOS (Centro) */}
                        <div className="flex items-center justify-center gap-5 bg-slate-50 dark:bg-slate-900/50 px-5 py-3 rounded-xl border border-slate-100 dark:border-slate-700 w-full md:w-auto">
                          {/* INICIAL */}
                          <div className="flex flex-col items-center gap-1 group">
                            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              Inicial
                            </span>
                            <div
                              onClick={() => setPreviewImage(a.url_inicial)}
                              className="relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm w-14 h-14 hover:ring-2 hover:ring-sky-400 transition-all"
                            >
                              <img
                                src={a.url_inicial}
                                alt="Ini"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                            <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                              {a.porcentaje_inicial}%
                            </span>
                          </div>

                          <Icon
                            icon="mdi:arrow-right-thin"
                            className="text-slate-300"
                            width="28"
                          />

                          {/* FINAL */}
                          <div className="flex flex-col items-center gap-1 group">
                            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              Final
                            </span>
                            <div
                              onClick={() => setPreviewImage(a.url_final)}
                              className="relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm w-14 h-14 hover:ring-2 hover:ring-emerald-400 transition-all"
                            >
                              <img
                                src={a.url_final}
                                alt="Fin"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                            <span className="text-xs font-black text-sky-600 dark:text-sky-400">
                              {a.porcentaje_final}%
                            </span>
                          </div>
                        </div>

                        {/* 3. Totales */}
                        <div className="text-right w-full md:w-1/4">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500">
                              Total Litros
                            </span>
                            <span className="font-black text-slate-800 dark:text-white text-2xl">
                              {a.litros}
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                              {formatMoney(a.monto)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* --------------------------------------- */}
                    {plantData.carburacion.map((c, i) => (
                      <div
                        key={i}
                        className="flex justify-between border-b border-slate-100 dark:border-slate-700 py-3 last:border-0 items-center"
                      >
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-sm flex items-center gap-2"><Icon icon="mdi:gas-station" className="text-sky-500"/> Salida Carburación</span>
                        <span className="font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">{c.litros} Lts</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* TABLA DE VENTAS CON CLICK */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
                  <div className="p-3 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs font-bold text-center border-b border-sky-100 dark:border-sky-800/50 flex items-center justify-center gap-2">
                    <Icon icon="mdi:information-outline" width="18" />
                    Da clic en cualquier venta para ver todos sus detalles
                  </div>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-5 py-4">Fecha</th>
                          <th className="px-5 py-4">Cliente</th>
                          <th className="px-5 py-4 text-center">Lts</th>
                          <th className="px-5 py-4 text-right">Total</th>
                          <th className="px-5 py-4 text-center">Pago</th>
                          <th className="px-5 py-4 print:hidden text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {ventas.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="p-10 text-center text-slate-400 dark:text-slate-500 font-medium"
                          >
                            No hay ventas registradas en este turno.
                          </td>
                        </tr>
                      ) : (
                        ventas.map((v) => (
                          <tr
                            key={v.id_carga}
                            onClick={() => handleRowClick(v)}
                            className="hover:bg-blue-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group"
                          >
                            <td className="px-4 py-3 font-mono text-xs text-gray-400 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-sky-400">
                              {fixFechaVisual(
                                v.fecha_carga,
                                true
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-slate-200">
                              <div className="flex flex-col">
                                <span className="group-hover:text-blue-700 dark:group-hover:text-sky-300 font-bold transition-colors">
                                  {v.casa_habitacion?.nombre_cliente ||
                                    "Público General"}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-slate-400 group-hover:text-blue-400 dark:group-hover:text-sky-400">
                                  {v.casa_habitacion?.calle} #
                                  {v.casa_habitacion?.numero}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-gray-600 dark:text-slate-300">
                              {v.consumo_litros}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-gray-800 dark:text-slate-100">
                              {formatMoney(v.monto_total)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                                  v.tipo_pago === "credito"
                                    ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                    : v.tipo_pago === "tarjeta"
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                    : "bg-green-50 dark:bg-emerald-900/30 text-green-600 dark:text-emerald-400"
                                }`}
                              >
                                {v.tipo_pago}
                              </span>
                            </td>
                            <td className="px-5 py-3 print:hidden text-center">
                              <button
                                onClick={(e) => handleDelete(e, v.id_carga)}
                                className="text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-2 rounded-full transition-all"
                              >
                                <Icon icon="mdi:trash-can" width="20" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
                <Icon
                  icon="mdi:calendar-remove"
                  className="mx-auto text-slate-200 dark:text-slate-600 w-20 h-20 mb-4"
                />
                <h3 className="text-lg font-extrabold text-slate-500 dark:text-slate-400">
                  No hay turnos registrados
                </h3>
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-1">
                  No se inició operación en esta fecha.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* --- MODAL DE DETALLE DE VENTA (SOLO LECTURA) --- */}
      {selectedVentaDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700 transition-colors duration-300">
            {/* Header */}
            <div className="bg-blue-900 dark:bg-slate-900 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2 text-white">
                  <Icon icon="mdi:receipt-text-outline" width="24" className="text-sky-400" /> Detalle de Venta
                </h3>
                <p className="text-xs text-blue-200 dark:text-slate-400 mt-1 font-medium tracking-wider">
                  ID Carga: {selectedVentaDetalle.id_carga}
                </p>
              </div>
              <button
                onClick={() => setSelectedVentaDetalle(null)}
                className="p-2 bg-blue-800 hover:bg-blue-700 rounded-full transition-colors text-white"
              >
                <Icon icon="mdi:close" width="20" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Sección 1: Cliente */}
              <div className="flex gap-4 items-start bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-3 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full">
                  <Icon icon="mdi:account" width="28" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Cliente
                  </p>
                  <p className="font-black text-slate-800 dark:text-slate-100 text-lg leading-tight mt-0.5">
                    {selectedVentaDetalle.casa_habitacion?.nombre_cliente ||
                      "Público General"}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                    <Icon icon="mdi:map-marker" className="text-sky-500"/>
                    {selectedVentaDetalle.casa_habitacion?.calle} #
                    {selectedVentaDetalle.casa_habitacion?.numero},{" "}
                    {selectedVentaDetalle.casa_habitacion?.colonia}
                  </p>
                </div>
              </div>

              {/* Sección 2: Operativo (Litros y Ret) */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Totales
                  </p>
                  <p className="font-black text-slate-800 dark:text-slate-100 text-xl mt-1">
                    {selectedVentaDetalle.consumo_litros} L
                  </p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/30 p-3 rounded-2xl border border-rose-100 dark:border-rose-800/50 shadow-sm">
                  <p className="text-[10px] font-extrabold text-rose-400 dark:text-rose-500 uppercase tracking-widest">
                    RET
                  </p>
                  <p className="font-black text-rose-700 dark:text-rose-400 text-xl mt-1">
                    {selectedVentaDetalle.ret
                      ? `-${selectedVentaDetalle.ret}`
                      : "0"}{" "}
                    L
                  </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
                  <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">
                    Reales
                  </p>
                  <p className="font-black text-emerald-700 dark:text-emerald-400 text-xl mt-1">
                    {(
                      Number(selectedVentaDetalle.consumo_litros) -
                      Number(selectedVentaDetalle.ret || 0)
                    ).toFixed(2)}{" "}
                    L
                  </p>
                </div>
              </div>

              {/* Sección 3: Financiero */}
              <div className="bg-white dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Monto Total
                  </span>
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                    {formatMoney(selectedVentaDetalle.monto_total)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm border-t border-slate-100 dark:border-slate-700 pt-4">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">Método Principal:</span>
                  <span className="font-black uppercase text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm text-xs tracking-wider">
                    {selectedVentaDetalle.tipo_pago}
                  </span>
                </div>

                {/* Detalles extra si es Crédito o Mixto */}
                {selectedVentaDetalle.monto_pendiente > 0 && (
                  <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-800/50 mt-2">
                    <div className="flex justify-between text-sm text-rose-700 dark:text-rose-400 font-black">
                      <span>Deuda/Pendiente:</span>
                      <span>
                        {formatMoney(selectedVentaDetalle.monto_pendiente)}
                      </span>
                    </div>
                    {selectedVentaDetalle.tipo_pago_resto && (
                      <div className="flex justify-between text-xs font-bold text-rose-500 dark:text-rose-400 mt-2 border-t border-rose-100/50 dark:border-rose-800/50 pt-2">
                        <span>Resto pagado:</span>
                        <span className="uppercase font-black">
                          {selectedVentaDetalle.tipo_pago_resto}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
                <Icon icon="mdi:calendar-clock" />
                {fixFechaVisual(selectedVentaDetalle.fecha_carga)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedVentaDetalle(null)}
                className="px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 transition-all w-full text-sm shadow-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA VENTA (EDICIÓN/CREACIÓN) */}
      <ModalNuevaVenta
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onVentaGuardada={fetchDetallesTurno}
        user={user}
        tarifa={tarifa}
        unidad={unidad}
        datosBancarios={datosBancarios}
        idTurnoExterno={turnoData?.id}
      />

      {/* --- MODAL ZOOM DE IMAGEN --- */}
      {previewImage && (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)} // Cerrar al dar clic fuera
        >
            <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
            >
                <Icon icon="mdi:close" width="32" />
            </button>
            
            <img 
                src={previewImage} 
                alt="Evidencia" 
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()} // Evitar cierre al dar clic a la imagen
            />
        </div>
      )}
    </main>
  );
};
