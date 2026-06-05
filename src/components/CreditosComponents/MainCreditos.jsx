import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ModalNuevoPago } from "../ui/Modales/ModalNuevoPago";
import ModalCreditoManual from "../ui/Modales/ModalCreditoManual";

export const MainCreditos = () => {
  const [cuentas, setCuentas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState(null);

  // Modales
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" o "carousel"

  // Referencias para Botón Flotante
  const [isControlBarVisible, setIsControlBarVisible] = useState(true);
  const controlBarRef = useRef(null);
  const searchInputRef = useRef(null);

  // --- FUNCIÓN PARA CORREGIR LA FECHA/HORA ---
  const fixFechaVisual = (fechaStr) => {
    if (!fechaStr) return "-";
    const fecha = new Date(fechaStr);

    // Obtenemos la diferencia horaria en milisegundos (ej. 6 horas = 21600000ms)
    const userTimezoneOffset = fecha.getTimezoneOffset() * 60000;

    // Sumamos esa diferencia para "cancelar" la resta automática del navegador
    const fechaCorregida = new Date(fecha.getTime() + userTimezoneOffset);

    return fechaCorregida.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsControlBarVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    if (controlBarRef.current) {
      observer.observe(controlBarRef.current);
    }
    return () => {
      if (controlBarRef.current) observer.unobserve(controlBarRef.current);
    };
  }, []);

  const fetchCuentas = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("cuentas_por_cobrar")
      .select(
        `
        id, id_casa, saldo_actual, fecha_actualizacion,
        casa_habitacion ( nombre_cliente, calle, numero, colonia )
      `
      )
      .gt("saldo_actual", 0)
      .order("saldo_actual", { ascending: false });

    if (error) console.error(error);
    else setCuentas(data || []);
    setCargando(false);
  }, []);

  const fetchMovimientos = async (id_cuenta) => {
    // console.log("Buscando movimientos...", id_cuenta);
    const { data, error } = await supabase
      .from("movimientos_credito")
      .select("*")
      .eq("id_cuenta", id_cuenta)
      .order("fecha", { ascending: false });

    if (!error) setMovimientos(data || []);
  };

  // Función para eliminar movimiento desde el Historial
  const handleDeleteMovimiento = async (id_movimiento) => {
    if (
      !confirm(
        "¿Eliminar este movimiento del historial?\n\nEl saldo del cliente se ajustará automáticamente."
      )
    )
      return;

    try {
      const { error } = await supabase.rpc(
        "eliminar_movimiento_credito_seguro",
        { p_id_movimiento: id_movimiento }
      );
      if (error) throw error;

      // Recargar datos para ver el cambio de saldo inmediato
      fetchCuentas();
      if (selectedCuenta) fetchMovimientos(selectedCuenta.id);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  useEffect(() => {
    fetchCuentas();
  }, [fetchCuentas]);

  const handleCardClick = (cuenta) => {
    setSelectedCuenta(cuenta);
    fetchMovimientos(cuenta.id);
  };

  const handleCloseHistory = () => {
    setSelectedCuenta(null);
    setMovimientos([]);
  };

  const handlePagoSuccess = () => {
    fetchCuentas();
    // Si hay una cuenta seleccionada, recargamos sus movimientos para ver el nuevo abono
    if (selectedCuenta) {
      fetchMovimientos(selectedCuenta.id);
    }
  };

  const handleFabClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 500);
  };

  const filteredCuentas = cuentas.filter(
    (c) =>
      c.casa_habitacion.nombre_cliente
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      c.casa_habitacion.calle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMoney = (amount) =>
    Number(amount).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

  // Renderizador reutilizable de tarjetas
  const renderCuentaCard = (cuenta) => {
    const isCarousel = viewMode === "carousel";
    return (
      <div
        key={cuenta.id}
        onClick={() => handleCardClick(cuenta)}
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700 cursor-pointer transition-all duration-300 flex flex-col relative overflow-hidden group ${
          isCarousel ? "shrink-0 snap-center w-[85vw] sm:w-[340px]" : "w-full"
        }`}
      >
        <div className="h-1.5 w-full bg-rose-500 dark:bg-rose-600 absolute top-0 left-0 transition-colors duration-300"></div>
        
        <div className="p-5 flex-1 flex flex-col mt-1">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-3 w-full">
              <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-full shrink-0 border border-rose-100 dark:border-rose-800/50">
                <Icon icon="mdi:account-cash" width="24" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-[17px] leading-tight group-hover:text-blue-900 dark:group-hover:text-sky-400 transition-colors truncate">
                  {cuenta.casa_habitacion.nombre_cliente}
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1 truncate">
                  <Icon icon="mdi:map-marker" className="text-sky-500 shrink-0" />
                  <span className="truncate">{cuenta.casa_habitacion.calle} #{cuenta.casa_habitacion.numero}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-extrabold tracking-widest">
                Saldo Pendiente
              </p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {formatMoney(cuenta.saldo_actual)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCuenta(cuenta);
                setIsPagoModalOpen(true);
              }}
              className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-500/30 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all flex items-center gap-1.5 z-10"
            >
              <Icon icon="mdi:cash-fast" width="20" /> <span className="hidden sm:inline">Abonar</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-20 font-sans relative transition-colors duration-300">
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
        <Titulo Texto="Cartera de Clientes" />
      </div>

      <section className="m-auto max-w-6xl p-4 space-y-6">
        {/* --- BARRA DE CONTROL SUPERIOR --- */}
        <div ref={controlBarRef} className="flex flex-col md:flex-row items-center justify-between gap-5 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative z-20 transition-colors duration-300">
          {/* Buscador */}
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
              placeholder="Buscar por nombre o calle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200 font-medium"
            />
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
              onClick={() => setIsManualModalOpen(true)}
              className="flex-1 md:flex-none justify-center px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-md shadow-sky-500/30 font-bold transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Icon icon="mdi:plus-box-multiple" width="22" /> Añadir Crédito
            </button>
          </div>
        </div>

        {/* --- CONTROLES DE VISTA --- */}
        <div className="flex justify-between items-center mb-6 px-1">
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
            Deudores Activos: <span className="text-blue-900 dark:text-sky-300 bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full">{filteredCuentas.length}</span>
          </p>
          <div className="flex bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 transition-colors duration-300">
            <button onClick={() => setViewMode("grid")} className={`px-4 py-2 transition-colors ${viewMode === "grid" ? "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
              <Icon icon="mdi:view-grid" width="20" className="mx-auto" />
            </button>
            <button onClick={() => setViewMode("carousel")} className={`px-4 py-2 transition-colors ${viewMode === "carousel" ? "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
              <Icon icon="mdi:view-carousel" width="20" className="mx-auto" />
            </button>
          </div>
        </div>

        {/* GRID DE DEUDORES */}
        {filteredCuentas.length === 0 && !cargando ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm transition-colors duration-300">
            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/30 rounded-full mb-4">
              <Icon icon="mdi:check-decagram-outline" className="text-emerald-400 dark:text-emerald-500 w-16 h-16" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-600 dark:text-slate-300 mb-2">
              ¡Excelente!
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-center">
              No hay clientes con deuda pendiente según la búsqueda.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 items-start">
            {filteredCuentas.map(renderCuentaCard)}
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-6 pb-8 pt-2 snap-x snap-mandatory scroll-smooth hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-1 items-start">
            {filteredCuentas.map(renderCuentaCard)}
          </div>
        )}
      </section>

      {/* --- MODAL HISTORIAL --- */}
      {selectedCuenta && !isPagoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700 transition-colors duration-300">
            {/* Header Modal */}
            <div className="bg-blue-900 dark:bg-slate-900 p-5 flex justify-between items-center shrink-0 text-white">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Icon
                    icon="mdi:format-list-bulleted-type"
                    className="text-sky-400"
                    width="24"
                  />
                  Estado de Cuenta
                </h3>
                <p className="text-xs text-blue-200 dark:text-slate-400 mt-1 font-medium tracking-wider">
                  {selectedCuenta.casa_habitacion.nombre_cliente}
                </p>
              </div>
              <button
                onClick={handleCloseHistory}
                className="p-2 bg-blue-800 hover:bg-blue-700 rounded-full transition-colors text-white"
              >
                <Icon icon="mdi:close" width="20" />
              </button>
            </div>

            {/* Body con Scroll */}
            <div className="overflow-y-auto p-0">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Descripción</th>
                    <th className="px-5 py-4 text-center">Tipo</th>
                    <th className="px-5 py-4 text-right">Monto</th>
                    <th className="px-5 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {movimientos.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-10 text-center text-slate-400 dark:text-slate-500 font-medium">
                        Cargando movimientos...
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((mov) => (
                      <tr
                        key={mov.id}
                        className="hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors group"
                      >
                        <td className="px-5 py-4 font-mono text-slate-500 dark:text-slate-400 text-xs font-bold">
                          {fixFechaVisual(mov.fecha)}
                        </td>
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">
                          {mov.descripcion}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                              mov.tipo === "CARGO"
                                ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800"
                                : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800"
                            }`}
                          >
                            {mov.tipo}
                          </span>
                        </td>
                        <td
                          className={`px-5 py-4 text-right font-black ${
                            mov.tipo === "CARGO"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {mov.tipo === "ABONO" ? "-" : "+"}{" "}
                          {formatMoney(mov.monto)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => handleDeleteMovimiento(mov.id)}
                            className="p-2 text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-all"
                            title="Eliminar movimiento"
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

            {/* Footer Acciones Rápidas */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-3 shrink-0 transition-colors duration-300">
              <button
                onClick={handleCloseHistory}
                className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => setIsPagoModalOpen(true)}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/30 hover:bg-emerald-600 hover:-translate-y-0.5 text-sm font-bold flex items-center gap-2 transition-all"
              >
                <Icon icon="mdi:cash-plus" /> Nuevo Abono
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES DE ACCIÓN */}
      <ModalNuevoPago
        isOpen={isPagoModalOpen}
        onClose={() => setIsPagoModalOpen(false)}
        onPagoGuardado={handlePagoSuccess}
        cuenta={selectedCuenta}
      />

      <ModalCreditoManual
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onGuardado={fetchCuentas}
      />
    </main>
  );
};
