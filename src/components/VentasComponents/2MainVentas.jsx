import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import ModalNuevaVenta from "../ui/Modales/ModalNuevaVenta";
import { DailySummary } from "../ui/DailySummary";
import { useAuth } from "../../auth/useAuth";

export const MainVentas = () => {
  const { user, tarifa, personal, unidad, datosBancarios } = useAuth();

  const today = new Date();
  const offset = today.getTimezoneOffset();
  today.setMinutes(today.getMinutes() - offset);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    today.toISOString().split("T")[0]
  );
  const [ventas, setVentas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Datos para Reporte
  const [turnoData, setTurnoData] = useState(null);
  const [plantData, setPlantData] = useState({
    autotanque: [],
    carburacion: [],
  });
  const [reporteCerrado, setReporteCerrado] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- 1. CONSULTA DE DATOS CORREGIDA ---
  const fetchData = useCallback(async () => {
    if (!fechaSeleccionada) return;

    setCargando(true);
    // Limpieza inicial
    setTurnoData(null);
    setPagos([]);
    setVentas([]);
    setPlantData({ autotanque: [], carburacion: [] });
    setReporteCerrado(false);

    try {
      // A. BUSCAR EL TURNO DE LA FECHA SELECCIONADA
      // Ojo: Si tienes varios turnos por día, aquí deberíamos listar todos o seleccionar el último.
      // Por ahora mantenemos la lógica de "El último registrado en esa fecha".
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

        // B. OBTENER PAGOS DEL TURNO (Filtrado estricto por ID)
        const { data: pagosData } = await supabase
          .from("pagos")
          .select(
            `
            id, monto_pago, tipo_pago, fecha_pago, id_turno,
            carga_casa ( casa_habitacion ( nombre_cliente ) )
          `
          )
          .eq("id_turno", turno.id); // <--- FILTRO POR ID DE TURNO

        const pagosFormateados = (pagosData || []).map((p) => ({
          ...p,
          nombre_cliente:
            p.carga_casa?.casa_habitacion?.nombre_cliente ||
            "Cliente / Abono General",
        }));
        setPagos(pagosFormateados);

        // C. OBTENER VENTAS DEL TURNO (CORRECCIÓN PRINCIPAL)
        // Ya no filtramos por fecha y hora, sino por la columna 'id_porcentaje'
        const { data: ventasData, error: ventasError } = await supabase
          .from("carga_casa")
          .select(
            `
            id_carga, fecha_carga, consumo_litros, ret, monto_total,monto_pendiente, tipo_pago, id_porcentaje,
            casa_habitacion ( calle, numero, colonia )
          `
          )
          .eq("id_porcentaje", turno.id) // <--- FILTRO ESTRICTO: Solo ventas de ESTE turno
          .order("fecha_carga", { ascending: false });

        if (ventasError) throw ventasError;
        setVentas(ventasData || []);

        // D. VERIFICAR SI HAY REPORTE DE CIERRE (reporte_diario)
        // Esto confirma si el turno ya fue "cerrado administrativamente"
        const { data: reporte } = await supabase
          .from("reporte_diario")
          .select("id, finalizado")
          .eq("fecha", fechaSeleccionada) // Podrías agregar .eq("id_personal", turno.registrador_id) para ser más específico
          .maybeSingle();

        if (reporte) setReporteCerrado(true);

        // E. DATOS DE PLANTA (Opcional: Si estos también tienen id_turno, úsalo. Si no, fecha está bien)
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
      } else {
        // SI NO HAY TURNO: No mostramos nada mezclado.
        console.log("No se encontró turno para esta fecha.");
      }
    } catch (err) {
      console.error(err);
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
  const handlePrint = () => window.print();

  // Lógica para mostrar el estado correcto en el Badge
  const renderEstadoBadge = () => {
    if (!turnoData) {
      return (
        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold uppercase rounded-full flex items-center gap-1 border border-gray-200">
          <Icon icon="mdi:close-octagon-outline" /> Sin Turno Iniciado
        </span>
      );
    }
    if (reporteCerrado) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full flex items-center gap-1 border border-green-200">
          <Icon icon="mdi:check-circle" /> Día Cerrado
        </span>
      );
    }
    // Si hay turno pero no reporte cerrado:
    return (
      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold uppercase rounded-full flex items-center gap-1 border border-amber-200 animate-pulse">
        <Icon icon="mdi:clock-outline" /> Turno Abierto (En Curso)
      </span>
    );
  };

  return (
    <main className="pb-20 min-h-screen">
      <div className="print:hidden">
        <Titulo Texto="Historial y Reportes" />
      </div>

      <section className="m-auto max-w-6xl p-4 space-y-8">
        {/* BARRA DE NAVEGACIÓN */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200 print:hidden">
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
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Link
              to="/dashboard"
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
            >
              <Icon icon="mdi:view-dashboard-outline" width="18" /> Dashboard
            </Link>
            {/* Solo permitimos nueva venta manual si hay un turno abierto ese día (opcional, pero recomendado) */}
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
            <p className="text-gray-400 animate-pulse">Buscando registros...</p>
          </div>
        ) : (
          <div className="print:p-0">
            {/* ENCABEZADO REPORTE */}
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
              <div className="mt-2 flex justify-center print:justify-start">
                {renderEstadoBadge()}
              </div>
            </div>

            {/* SI HAY TURNO MOSTRAMOS LA DATA, SI NO, MENSAJE VACÍO */}
            {turnoData ? (
              <>
                {/* FOTOS EVIDENCIA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:grid-cols-2 print:gap-4">
                  {/* ... (Tu código de tarjetas de fotos se mantiene igual, usando turnoData) ... */}
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

                {/* RESUMEN FINANCIERO */}
                <div className="mb-8">
                  <DailySummary listaDiaria={ventas} pagosDiarios={pagos} />
                </div>

                {/* ACTIVIDADES PLANTA */}
                {(plantData.autotanque.length > 0 ||
                  plantData.carburacion.length > 0) && (
                  <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex gap-2">
                      <Icon icon="mdi:factory" className="text-orange-500" />{" "}
                      Planta
                    </h3>
                    {/* ... (Tu código de planta igual) ... */}
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

                {/* TABLA DETALLADA */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Hora</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3 text-center">Lts</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-center">Pago</th>
                        <th className="px-4 py-3 print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ventas.map((v) => (
                        <tr key={v.id_carga} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">
                            {new Date(v.fecha_carga).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700">
                            {v.casa_habitacion?.calle} #
                            {v.casa_habitacion?.numero}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {v.consumo_litros}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {formatMoney(v.monto_total)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] px-2 py-1 rounded bg-gray-100 font-bold uppercase">
                              {v.tipo_pago}
                            </span>
                          </td>
                          <td className="px-4 py-3 print:hidden text-right">
                            <button
                              onClick={() => handleDelete(v.id_carga)}
                              className="text-gray-300 hover:text-red-500"
                            >
                              <Icon icon="mdi:trash-can" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              // MENSAJE CUANDO NO HAY TURNO
              <div className="p-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Icon
                  icon="mdi:calendar-remove"
                  className="mx-auto text-gray-300 w-16 h-16 mb-2"
                />
                <h3 className="text-lg font-bold text-gray-500">
                  No hay turno registrado
                </h3>
                <p className="text-gray-400 text-sm">
                  No se inició operación en esta fecha.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* MODAL NUEVA VENTA */}
      {/* Pasamos el ID del turno actual si existe para que la venta manual se ligue correctamente */}
      <ModalNuevaVenta
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onVentaGuardada={fetchData}
        user={user}
        tarifa={tarifa}
        unidad={unidad}
        datosBancarios={datosBancarios}
        idTurnoExterno={turnoData?.id}
      />
    </main>
  );
};
