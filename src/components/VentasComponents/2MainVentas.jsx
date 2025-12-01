import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import ModalNuevaVenta from "../ui/Modales/ModalNuevaVenta";
import { DailySummary } from "../ui/DailySummary";

export const MainVentas = () => {
  // Ajuste de fecha local para que el input date inicie en hoy
  const today = new Date();
  const offset = today.getTimezoneOffset();
  today.setMinutes(today.getMinutes() - offset);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    today.toISOString().split("T")[0]
  );
  const [ventas, setVentas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Datos para armar el Reporte Visual de Turno
  const [turnoData, setTurnoData] = useState(null);
  const [plantData, setPlantData] = useState({
    autotanque: [],
    carburacion: [],
  });
  const [reporteCerrado, setReporteCerrado] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- 1. CONSULTA DE DATOS ---
  const fetchData = useCallback(async () => {
    if (!fechaSeleccionada) return;

    setCargando(true);
    // Limpiamos datos previos para evitar "parpadeos" de datos viejos
    setTurnoData(null);
    setPagos([]);
    setVentas([]);
    setPlantData({ autotanque: [], carburacion: [] });
    setReporteCerrado(false);

    try {
      // 1. OBTENER EL TURNO (Primero buscamos esto para tener el ID)
      const { data: turno, error: turnoError } = await supabase
        .from("porcentaje_diario")
        .select(
          `*, registrador_inicial:personal!registrador_id (nombre, apellidos)`
        )
        .eq("fecha", fechaSeleccionada)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (turnoError) throw turnoError;

      if (turno) {
        setTurnoData(turno);

        // 2. OBTENER PAGOS FILTRADOS POR EL ID DEL TURNO
        // Solo traemos pagos si EXISTE un turno ese día y coinciden con el ID
        const { data: pagosData, error: pagosError } = await supabase
          .from("pagos")
          .select(
            `
            id, monto_pago, tipo_pago, fecha_pago, id_turno,
            carga_casa ( casa_habitacion ( nombre_cliente ) )
          `
          )
          .eq("id_turno", turno.id); // <--- AQUÍ ESTÁ EL FILTRO MÁGICO

        if (pagosError) console.error("Error fetching pagos:", pagosError);

        const pagosFormateados = (pagosData || []).map((p) => ({
          ...p,
          nombre_cliente:
            p.carga_casa?.casa_habitacion?.nombre_cliente ||
            "Cliente / Abono General",
        }));
        setPagos(pagosFormateados);
      } else {
        // SI NO HAY TURNO ese día, no mostramos pagos (según tu requerimiento)
        setPagos([]);
      }

      // 3. OBTENER VENTAS (CARGA CASA)
      // Las ventas siguen siendo por rango de FECHA (independiente del turno, o puedes cambiarlas también si agregas id_turno a carga_casa)
      const [year, month, day] = fechaSeleccionada.split("-").map(Number);
      const startLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endLocal = new Date(year, month - 1, day, 23, 59, 59, 999);

      const { data: ventasData, error: ventasError } = await supabase
        .from("carga_casa")
        .select(
          `
          id_carga, fecha_carga, consumo_litros, ret, monto_total, tipo_pago,
          casa_habitacion ( calle, numero, colonia )
        `
        )
        .gte("fecha_carga", startLocal.toISOString())
        .lte("fecha_carga", endLocal.toISOString())
        .order("fecha_carga", { ascending: false });

      if (ventasError) throw ventasError;
      setVentas(ventasData || []);

      // 4. VERIFICAR REPORTE CERRADO Y PLANTA (Igual que antes)
      const { data: reporte } = await supabase
        .from("reporte_diario")
        .select("id")
        .eq("fecha", fechaSeleccionada)
        .maybeSingle();
      if (reporte) setReporteCerrado(true);

      const { data: autoData } = await supabase
        .from("carga_autotanque")
        .select("*")
        .eq("fecha", fechaSeleccionada);
      const { data: carbData } = await supabase
        .from("carburacion")
        .select("*")
        .eq("fecha", fechaSeleccionada);

      setPlantData({ autotanque: autoData || [], carburacion: carbData || [] });
    } catch (err) {
      console.error(err);
      // setError("Error cargando la información.");
    } finally {
      setCargando(false);
    }
  }, [fechaSeleccionada]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este registro de venta?")) return;
    const { error } = await supabase
      .from("carga_casa")
      .delete()
      .eq("id_carga", id);
    if (!error) fetchData();
  };

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="pb-20 min-h-screen">
      <div className="print:hidden">
        <Titulo Texto="Historial y Reportes" />
      </div>

      <section className="m-auto max-w-6xl p-4 space-y-8">
        {/* --- 1. BARRA DE NAVEGACIÓN Y FILTRO --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200 print:hidden">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Icon icon="mdi:calendar-search" width="24" />
            </div>
            <div className="flex flex-col w-full">
              <label
                htmlFor="fecha-venta"
                className="text-xs font-bold text-gray-400 uppercase"
              >
                Fecha de Consulta
              </label>
              <input
                type="date"
                id="fecha-venta"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="font-bold text-gray-700 bg-transparent outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Link
              to="/dashboard"
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
            >
              <Icon icon="mdi:view-dashboard-outline" width="18" /> Dashboard
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md shadow-indigo-200 transition-all transform active:scale-95 text-sm flex items-center gap-2"
            >
              <Icon icon="mdi:plus" width="18" /> Nueva Venta
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
              title="Imprimir Reporte"
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
            <p className="text-gray-400 animate-pulse">
              Consultando base de datos...
            </p>
          </div>
        ) : (
          <div className="print:p-0">
            {/* --- 2. ENCABEZADO DEL REPORTE --- */}
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
              {/* Badge de Estado */}
              <div className="mt-2 flex justify-center print:justify-start">
                {reporteCerrado ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full flex items-center gap-1 border border-green-200">
                    <Icon icon="mdi:check-circle" /> Día Cerrado Correctamente
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold uppercase rounded-full flex items-center gap-1 border border-amber-200 animate-pulse">
                    <Icon icon="mdi:clock-outline" /> Día en Curso (Abierto)
                  </span>
                )}
              </div>
            </div>

            {/* --- 3. EVIDENCIA VISUAL (FOTOS CUADRADAS) --- */}
            {turnoData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:grid-cols-2 print:gap-4">
                {/* Tarjeta INICIO */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col print:border-gray-300">
                  <div className="bg-blue-600 p-4 flex justify-between items-center text-white print:bg-gray-200 print:text-black">
                    <span className="font-bold text-sm uppercase flex items-center gap-2">
                      <Icon icon="mdi:login" width="20" /> Inicio de Turno
                    </span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded text-white font-medium print:text-black print:bg-gray-300">
                      {turnoData.registrador_inicial?.nombre || "N/A"}
                    </span>
                  </div>
                  <div className="p-6 flex gap-6 items-center flex-1">
                    <div className="w-1/2 flex flex-col justify-center">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">
                        Nivel Inicial
                      </p>
                      <p className="text-5xl font-black text-gray-800">
                        {turnoData.porcentaje_inicial}%
                      </p>
                    </div>
                    <div className="w-1/2 aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-100 shadow-inner">
                      {turnoData.url_inicial ? (
                        <img
                          src={turnoData.url_inicial}
                          alt="Inicio"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-xs font-medium">
                          Sin Foto
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tarjeta FIN */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col print:border-gray-300">
                  <div className="bg-rose-600 p-4 flex justify-between items-center text-white print:bg-gray-200 print:text-black">
                    <span className="font-bold text-sm uppercase flex items-center gap-2">
                      <Icon icon="mdi:logout" width="20" /> Cierre de Turno
                    </span>
                    {reporteCerrado && (
                      <Icon
                        icon="mdi:check-decagram"
                        className="text-white/80 print:text-black"
                        width="20"
                      />
                    )}
                  </div>
                  <div className="p-6 flex gap-6 items-center flex-1">
                    <div className="w-1/2 flex flex-col justify-center">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">
                        Nivel Final
                      </p>
                      <p
                        className={`text-5xl font-black ${
                          turnoData.porcentaje_final !== null
                            ? "text-gray-800"
                            : "text-gray-300"
                        }`}
                      >
                        {turnoData.porcentaje_final ?? "--"}%
                      </p>
                    </div>
                    <div className="w-1/2 aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-100 shadow-inner">
                      {turnoData.url_final ? (
                        <img
                          src={turnoData.url_final}
                          alt="Final"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <Icon
                            icon="mdi:camera-off"
                            width="24"
                            className="mb-1 opacity-50"
                          />
                          <span className="text-[10px] font-medium">
                            Pendiente
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 mb-8 bg-red-50 border border-red-100 rounded-xl text-center text-red-600 font-medium">
                No hay registro de turno iniciado para esta fecha.
              </div>
            )}

            {/* --- 4. RESUMEN FINANCIERO (CON FIX ABONOS) --- */}
            <div className="mb-8">
              <DailySummary listaDiaria={ventas} pagosDiarios={pagos} />
            </div>

            {/* --- 5. ACTIVIDADES EN PLANTA --- */}
            {(plantData.autotanque.length > 0 ||
              plantData.carburacion.length > 0) && (
              <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm break-inside-avoid print:border-gray-300">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                  <Icon icon="mdi:factory" className="text-orange-500" />{" "}
                  Actividades en Planta
                </h3>

                {/* Autotanques */}
                {plantData.autotanque.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {plantData.autotanque.map((at, idx) => (
                      <div
                        key={idx}
                        className="bg-orange-50 rounded-lg p-3 border border-orange-100 flex gap-4 print:bg-white print:border-gray-300"
                      >
                        <div className="flex flex-col gap-2 w-20 shrink-0">
                          <div className="aspect-square bg-gray-200 rounded overflow-hidden">
                            <img
                              src={at.url_inicial}
                              className="w-full h-full object-cover"
                              alt="AT Ini"
                            />
                          </div>
                          <div className="aspect-square bg-gray-200 rounded overflow-hidden">
                            <img
                              src={at.url_final}
                              className="w-full h-full object-cover"
                              alt="AT Fin"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="font-bold text-orange-800 text-xs uppercase mb-1">
                            Carga Autotanque
                          </p>
                          <p className="text-xl font-bold text-gray-800">
                            {at.litros} Lts
                          </p>
                          <p className="text-sm text-gray-600 font-mono">
                            {formatMoney(at.monto)}
                          </p>
                          <div className="flex gap-2 mt-2 text-[10px] font-bold text-orange-600">
                            <span className="bg-white px-2 py-1 rounded border border-orange-100">
                              Ini: {at.porcentaje_inicial}%
                            </span>
                            <span className="bg-white px-2 py-1 rounded border border-orange-100">
                              Fin: {at.porcentaje_final}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Carburación */}
                {plantData.carburacion.length > 0 && (
                  <div className="space-y-2">
                    {plantData.carburacion.map((cb, idx) => (
                      <div
                        key={idx}
                        className="bg-yellow-50 rounded-lg p-3 border border-yellow-100 flex items-center justify-between print:bg-white print:border-gray-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-100 rounded-full text-yellow-600 print:hidden">
                            <Icon icon="mdi:gas-cylinder" width="18" />
                          </div>
                          <div>
                            <p className="font-bold text-yellow-900 text-xs uppercase">
                              Salida por Carburación
                            </p>
                            <p className="font-mono text-xs text-yellow-700">
                              {formatMoney(cb.monto)}
                            </p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-800">
                          {cb.litros} Lts
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- 6. TABLA DETALLADA DE VENTAS --- */}
            <div className="space-y-4">
              <div className="flex justify-between items-end print:hidden">
                <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                  <Icon
                    icon="mdi:format-list-bulleted"
                    className="text-indigo-500"
                  />{" "}
                  Detalle de Transacciones
                </h3>
                <span className="text-xs font-bold text-gray-400 uppercase bg-white border border-gray-200 px-2 py-1 rounded">
                  {ventas.length} Registros
                </span>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border print:shadow-none print:border-gray-300">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 print:bg-gray-100 print:text-black">
                    <tr>
                      <th className="px-4 py-3">Hora</th>
                      <th className="px-4 py-3">Cliente / Dirección</th>
                      <th className="px-4 py-3 text-center">Litros</th>
                      <th className="px-4 py-3 text-center">Ret</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Método</th>
                      <th className="px-4 py-3 text-center print:hidden">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ventas.length > 0 ? (
                      ventas.map((venta) => (
                        <tr
                          key={venta.id_carga}
                          className="hover:bg-indigo-50/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">
                            {new Date(venta.fecha_carga).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-800 text-xs">
                              {venta.casa_habitacion?.calle || "S/D"} #
                              {venta.casa_habitacion?.numero}
                            </div>
                            <div className="text-[10px] text-gray-400 uppercase">
                              {venta.casa_habitacion?.colonia}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-gray-600">
                            {venta.consumo_litros}
                          </td>
                          <td className="px-4 py-3 text-center text-red-400 font-medium">
                            {venta.ret > 0 ? venta.ret : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-gray-800">
                            {formatMoney(venta.monto_total)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border
                                        ${
                                          venta.tipo_pago === "efectivo"
                                            ? "bg-green-50 text-green-700 border-green-100"
                                            : venta.tipo_pago === "credito"
                                            ? "bg-orange-50 text-orange-700 border-orange-100"
                                            : "bg-purple-50 text-purple-700 border-purple-100"
                                        }
                                     `}
                            >
                              {venta.tipo_pago}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center print:hidden">
                            <button
                              onClick={() => handleDelete(venta.id_carga)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Icon icon="mdi:trash-can-outline" width="18" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
                          className="p-8 text-center text-gray-400 italic"
                        >
                          No hay ventas registradas en esta fecha.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <ModalNuevaVenta
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        venta={null}
        onVentaGuardada={fetchData}
      />

      <style>{`
         @media print {
            body { background: white; margin: 0; padding: 0; }
            main { padding-bottom: 0; min-height: auto; }
            nav, footer, .print\\:hidden { display: none !important; }
            .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
            .border { border-color: #ccc !important; }
            .bg-gray-50 { background: white !important; }
            .text-white { color: black !important; }
         }
      `}</style>
    </main>
  );
};
