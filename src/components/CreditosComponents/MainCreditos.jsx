import { useState, useEffect, useCallback } from "react";
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

  const fetchCuentas = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("cuentas_por_cobrar")
      .select(`
        id, id_casa, saldo_actual, fecha_actualizacion,
        casa_habitacion ( nombre_cliente, calle, numero, colonia )
      `)
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

  const filteredCuentas = cuentas.filter(
    (c) =>
      c.casa_habitacion.nombre_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.casa_habitacion.calle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMoney = (amount) =>
    Number(amount).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  return (
    <main className="min-h-screen pb-20">
      <div className="pt-6">
        <Titulo Texto="Cartera de Clientes" />
      </div>

      <section className="m-auto max-w-6xl p-4 space-y-6">
        {/* BARRA SUPERIOR */}
        <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 w-full">
            <Icon icon="mdi:magnify" className="text-gray-400" width="24" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="w-full outline-none font-bold text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-100 transition"
            >
              <Icon icon="mdi:plus-box-multiple" width="24" /> Añadir
            </button>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold flex items-center gap-2"
            >
              <Icon icon="mdi:arrow-left" /> Dashboard
            </Link>
          </div>
        </div>

        {/* GRID DE DEUDORES */}
        {filteredCuentas.length === 0 && !cargando ? (
            <div className="text-center py-10 text-gray-400">No hay clientes con deuda pendiente.</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCuentas.map((cuenta) => (
                <div
                key={cuenta.id}
                onClick={() => handleCardClick(cuenta)}
                className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 relative overflow-hidden group"
                >
                <div className="absolute top-0 right-0 p-2 bg-red-50 rounded-bl-xl text-xs font-bold text-red-600 border-b border-l border-red-100">
                    DEUDA TOTAL
                </div>
                <h3 className="font-bold text-gray-800 text-lg truncate pr-16">
                    {cuenta.casa_habitacion.nombre_cliente}
                </h3>
                <p className="text-xs text-gray-500 mb-4 truncate">
                    {cuenta.casa_habitacion.calle} #{cuenta.casa_habitacion.numero}
                </p>

                <div className="flex justify-between items-end">
                    <div>
                    <p className="text-[10px] uppercase text-gray-400 font-bold">
                        Saldo Pendiente
                    </p>
                    <p className="text-3xl font-black text-slate-800">
                        {formatMoney(cuenta.saldo_actual)}
                    </p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCuenta(cuenta); // Aseguramos que se seleccione para el modal de pago
                            setIsPagoModalOpen(true);
                        }}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-green-200 hover:bg-green-600 transition z-10"
                    >
                        Abonar
                    </button>
                </div>
                </div>
            ))}
            </div>
        )}
      </section>

      {/* --- MODAL HISTORIAL (SOLUCIÓN VISUAL) --- */}
      {selectedCuenta && !isPagoModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Header Modal */}
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <Icon icon="mdi:format-list-bulleted-type" className="text-blue-600"/> 
                        Estado de Cuenta
                    </h3>
                    <p className="text-sm text-gray-500">{selectedCuenta.casa_habitacion.nombre_cliente}</p>
                 </div>
                 <button onClick={handleCloseHistory} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <Icon icon="mdi:close" width="24" className="text-gray-500"/>
                 </button>
              </div>

              {/* Body con Scroll */}
              <div className="overflow-y-auto p-0">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-500 font-bold uppercase text-[10px] sticky top-0 z-10 shadow-sm">
                        <tr>
                        <th className="px-6 py-3">Fecha</th>
                        <th className="px-6 py-3">Descripción</th>
                        <th className="px-6 py-3 text-center">Tipo</th>
                        <th className="px-6 py-3 text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {movimientos.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-400">Cargando movimientos...</td>
                            </tr>
                        ) : (
                            movimientos.map((mov) => (
                            <tr key={mov.id} className="hover:bg-blue-50 transition-colors">
                                <td className="px-6 py-3 font-mono text-gray-500 text-xs">
                                {new Date(mov.fecha).toLocaleString("es-MX", { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })}
                                </td>
                                <td className="px-6 py-3 text-gray-700 font-medium">
                                {mov.descripcion}
                                </td>
                                <td className="px-6 py-3 text-center">
                                <span
                                    className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                    mov.tipo === "CARGO"
                                        ? "bg-orange-50 text-orange-700 border-orange-100"
                                        : "bg-green-50 text-green-700 border-green-100"
                                    }`}
                                >
                                    {mov.tipo}
                                </span>
                                </td>
                                <td
                                className={`px-6 py-3 text-right font-bold ${
                                    mov.tipo === "CARGO"
                                    ? "text-orange-600"
                                    : "text-green-600"
                                }`}
                                >
                                {mov.tipo === "ABONO" ? "-" : "+"}{" "}
                                {formatMoney(mov.monto)}
                                </td>
                            </tr>
                            ))
                        )}
                    </tbody>
                 </table>
              </div>

              {/* Footer Acciones Rápidas */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                 <button onClick={handleCloseHistory} className="px-4 py-2 border rounded-lg hover:bg-white text-sm font-bold text-gray-600">
                    Cerrar
                 </button>
                 <button 
                    onClick={() => setIsPagoModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 text-sm font-bold flex items-center gap-2"
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