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
        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold uppercase rounded-full flex items-center gap-1 border border-gray-200">
          <Icon icon="mdi:close-octagon-outline" /> Sin Turno
        </span>
      );
    }
    if (turnoData.porcentaje_final !== null) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full flex items-center gap-1 border border-green-200">
          <Icon icon="mdi:check-circle" /> Turno Finalizado
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold uppercase rounded-full flex items-center gap-1 border border-amber-200 animate-pulse">
        <Icon icon="mdi:clock-outline" /> Turno Abierto
      </span>
    );
  };

  return (
    <main className="pb-20 min-h-screen relative">
      <div className="print:hidden">
        <Titulo Texto="Historial y Reportes" />
      </div>

      <section className="m-auto max-w-6xl p-4 space-y-8">
        {/* FILTROS */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200 print:hidden">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Icon icon="mdi:calendar-search" width="24" />
              </div>
              <div className="flex flex-col w-full">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Fecha de Consulta
                </label>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="font-bold text-gray-700 bg-transparent outline-none cursor-pointer"
                />
              </div>
            </div>

            {turnosDelDia.length > 0 && (
              <div className="flex items-center gap-3 w-full md:w-auto border-l pl-4 border-gray-200 animate-in fade-in">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                  <Icon icon="mdi:clock-time-four-outline" width="24" />
                </div>
                <div className="flex flex-col w-full">
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Seleccionar Turno
                  </label>
                  <select
                    value={selectedTurnoId || ""}
                    onChange={(e) => setSelectedTurnoId(Number(e.target.value))}
                    className="font-bold text-gray-700 bg-transparent outline-none cursor-pointer pr-4"
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

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Link
              to="/dashboard"
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
            >
              <Icon icon="mdi:view-dashboard-outline" width="18" /> Dashboard
            </Link>
            {turnoData && !reporteCerrado && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md transition-all text-sm flex items-center gap-2"
              >
                <Icon icon="mdi:plus" width="18" /> Nueva Venta
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
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
              className="text-indigo-500 mb-4"
            />
            <p className="text-gray-400 animate-pulse">Cargando reporte...</p>
          </div>
        ) : (
          <div className="print:p-0">
            {/* ENCABEZADO */}
            <div className="text-center mb-8 print:text-left print:mb-6">
              <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
                Reporte Operativo
              </h2>
              <p className="text-gray-500 font-medium text-lg">
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
                <p className="text-xs text-gray-400 font-bold uppercase mt-1">
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
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-blue-600 p-4 flex justify-between items-center text-white print:bg-gray-200 print:text-black">
                      <span className="font-bold text-sm uppercase flex items-center gap-2">
                        <Icon icon="mdi:login" /> Inicio de Turno
                      </span>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">
                        {turnoData.registrador_inicial?.nombre}
                      </span>
                    </div>
                    <div className="p-6 flex gap-6 items-center">
                      <div className="w-1/2">
                        <p className="text-xs text-gray-400 uppercase font-bold">
                          Nivel Inicial
                        </p>
                        <p className="text-4xl font-black text-gray-800">
                          {turnoData.porcentaje_inicial}%
                        </p>
                      </div>
                      <div className="w-1/2 aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={turnoData.url_inicial}
                          className="w-full h-full object-cover"
                          alt="Ini"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-rose-600 p-4 flex justify-between items-center text-white print:bg-gray-200 print:text-black">
                      <span className="font-bold text-sm uppercase flex items-center gap-2">
                        <Icon icon="mdi:logout" /> Cierre de Turno
                      </span>
                    </div>
                    <div className="p-6 flex gap-6 items-center">
                      <div className="w-1/2">
                        <p className="text-xs text-gray-400 uppercase font-bold">
                          Nivel Final
                        </p>
                        <p className="text-4xl font-black text-gray-800">
                          {turnoData.porcentaje_final ?? "--"}%
                        </p>
                      </div>
                      <div className="w-1/2 aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                        {turnoData.url_final ? (
                          <img
                            src={turnoData.url_final}
                            className="w-full h-full object-cover"
                            alt="Fin"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">
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
                  <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex gap-2">
                      <Icon icon="mdi:factory" className="text-orange-500" />{" "}
                      Planta
                    </h3>
                    {plantData.carburacion.map((c, i) => (
                      <div
                        key={i}
                        className="flex justify-between border-b py-2 last:border-0"
                      >
                        <span>Salida Carburación</span>
                        <span className="font-bold">{c.litros} Lts</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* TABLA DE VENTAS CON CLICK */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-3 bg-blue-50 text-blue-800 text-xs font-bold text-center border-b border-blue-100 flex items-center justify-center gap-2">
                    <Icon icon="mdi:information-outline" />
                    Da clic en cualquier venta para ver todos sus detalles
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-center">Lts</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Pago</th>
                        <th className="px-4 py-3 print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ventas.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="p-8 text-center text-gray-400"
                          >
                            No hay ventas registradas en este turno.
                          </td>
                        </tr>
                      ) : (
                        ventas.map((v) => (
                          <tr
                            key={v.id_carga}
                            onClick={() => handleRowClick(v)}
                            className="hover:bg-blue-50 cursor-pointer transition-colors group"
                          >
                            <td className="px-4 py-3 font-mono text-xs text-gray-400 group-hover:text-blue-600">
                              {/* AQUÍ USAMOS LA HORA REAL DE CREACIÓN SI EXISTE, O LA FECHA CARGA */}
                              {fixFechaVisual(
                                v.created_at || v.fecha_carga,
                                true
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-700">
                              <div className="flex flex-col">
                                <span className="group-hover:text-blue-700 font-bold transition-colors">
                                  {v.casa_habitacion?.nombre_cliente ||
                                    "Público General"}
                                </span>
                                <span className="text-[10px] text-gray-400 group-hover:text-blue-400">
                                  {v.casa_habitacion?.calle} #
                                  {v.casa_habitacion?.numero}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-gray-600">
                              {v.consumo_litros}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-gray-800">
                              {formatMoney(v.monto_total)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                                  v.tipo_pago === "credito"
                                    ? "bg-red-50 text-red-600"
                                    : v.tipo_pago === "tarjeta"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-green-50 text-green-600"
                                }`}
                              >
                                {v.tipo_pago}
                              </span>
                            </td>
                            <td className="px-4 py-3 print:hidden text-right">
                              <button
                                onClick={(e) => handleDelete(e, v.id_carga)}
                                className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors"
                              >
                                <Icon icon="mdi:trash-can" width="18" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Icon
                  icon="mdi:calendar-remove"
                  className="mx-auto text-gray-300 w-16 h-16 mb-2"
                />
                <h3 className="text-lg font-bold text-gray-500">
                  No hay turnos registrados
                </h3>
                <p className="text-gray-400 text-sm">
                  No se inició operación en esta fecha.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* --- MODAL DE DETALLE DE VENTA (SOLO LECTURA) --- */}
      {selectedVentaDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Icon icon="mdi:receipt-text-outline" /> Detalle de Venta
                </h3>
                <p className="text-xs text-slate-400">
                  ID: {selectedVentaDetalle.id_carga}
                </p>
              </div>
              <button
                onClick={() => setSelectedVentaDetalle(null)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <Icon icon="mdi:close" width="24" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Sección 1: Cliente */}
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Icon icon="mdi:account" width="24" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">
                    Cliente
                  </p>
                  <p className="font-bold text-gray-800 text-lg leading-tight">
                    {selectedVentaDetalle.casa_habitacion?.nombre_cliente ||
                      "Público General"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedVentaDetalle.casa_habitacion?.calle} #
                    {selectedVentaDetalle.casa_habitacion?.numero},{" "}
                    {selectedVentaDetalle.casa_habitacion?.colonia}
                  </p>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Sección 2: Operativo (Litros y Ret) */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    Totales
                  </p>
                  <p className="font-bold text-gray-800 text-lg">
                    {selectedVentaDetalle.consumo_litros} L
                  </p>
                </div>
                <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                  <p className="text-[10px] font-bold text-red-400 uppercase">
                    RET
                  </p>
                  <p className="font-bold text-red-700 text-lg">
                    {selectedVentaDetalle.ret
                      ? `-${selectedVentaDetalle.ret}`
                      : "0"}{" "}
                    L
                  </p>
                </div>
                <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                  <p className="text-[10px] font-bold text-green-600 uppercase">
                    Reales
                  </p>
                  <p className="font-black text-green-700 text-lg">
                    {(
                      Number(selectedVentaDetalle.consumo_litros) -
                      Number(selectedVentaDetalle.ret || 0)
                    ).toFixed(2)}{" "}
                    L
                  </p>
                </div>
              </div>

              {/* Sección 3: Financiero */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-medium text-slate-500">
                    Monto Total
                  </span>
                  <span className="text-2xl font-black text-slate-800">
                    {formatMoney(selectedVentaDetalle.monto_total)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-500">Método Principal:</span>
                  <span className="font-bold uppercase text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                    {selectedVentaDetalle.tipo_pago}
                  </span>
                </div>

                {/* Detalles extra si es Crédito o Mixto */}
                {selectedVentaDetalle.monto_pendiente > 0 && (
                  <div className="bg-red-50 p-2 rounded border border-red-100 mt-2">
                    <div className="flex justify-between text-xs text-red-700 font-bold">
                      <span>Deuda/Pendiente:</span>
                      <span>
                        {formatMoney(selectedVentaDetalle.monto_pendiente)}
                      </span>
                    </div>
                    {selectedVentaDetalle.tipo_pago_resto && (
                      <div className="flex justify-between text-[10px] text-red-500 mt-1">
                        <span>Resto pagado con:</span>
                        <span className="uppercase">
                          {selectedVentaDetalle.tipo_pago_resto}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-gray-400 font-mono">
                {/* USAMOS LA FUNCION DE CORRECCIÓN AQUÍ TAMBIÉN */}
                Fecha Carga: {fixFechaVisual(selectedVentaDetalle.fecha_carga)}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedVentaDetalle(null)}
                className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors w-full"
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
    </main>
  );
};
