import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ModalNuevoPago } from "../ui/Modales/ModalNuevoPago";

export const MainCreditos = () => {
  const [creditos, setCreditos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargandoCreditos, setCargandoCreditos] = useState(false);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [error, setError] = useState(null);

  const [selectedRow, setSelectedRow] = useState(null); // ID del crédito seleccionado
  const [selectedCredit, setSelectedCredit] = useState(null); // Objeto crédito completo
  const [montoParaModal, setMontoParaModal] = useState(""); 

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCreditos = useCallback(async () => {
    setCargandoCreditos(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("carga_casa")
        .select(
          `id_carga, monto_pendiente, estado_pago, tipo_pago, casa_habitacion(*)`
        )
        .eq("estado_pago", false);

      if (queryError) throw new Error(queryError.message);
      setCreditos(data || []);
    } catch (err) {
      setError(err.message);
      setCreditos([]);
    } finally {
      setCargandoCreditos(false);
    }
  }, []);

  const fetchPagos = async (id_carga) => {
    if (!id_carga) {
      setPagos([]);
      return;
    }
    setCargandoPagos(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("pagos")
        .select("id, fecha_pago, monto_pago, id_carga, tipo_pago")
        .eq("id_carga", id_carga)
        .order("fecha_pago", { ascending: false });

      if (queryError) throw new Error(queryError.message);
      setPagos(data || []);
    } catch (err) {
      setError(err.message);
      setPagos([]);
    } finally {
      setCargandoPagos(false);
    }
  };

  useEffect(() => {
    fetchCreditos();
  }, [fetchCreditos]);

  const handleCardClick = (credito) => {
    // Si ya está seleccionado, lo deseleccionamos
    if (selectedRow === credito.id_carga) {
        setSelectedRow(null);
        setPagos([]);
    } else {
        setSelectedRow(credito.id_carga);
        fetchPagos(credito.id_carga);
    }
  };

  const handleLiquidarClick = (credito) => {
    setSelectedCredit(credito);
    setMontoParaModal(credito.monto_pendiente);
    setIsModalOpen(true);
  };

  const handleNuevoPagoClick = () => {
    if (selectedRow) {
      const creditoObj = creditos.find((c) => c.id_carga === selectedRow);
      if (creditoObj) {
        setSelectedCredit(creditoObj);
        setMontoParaModal("");
        setIsModalOpen(true);
      }
    } else {
      alert("Selecciona un crédito de la lista primero.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCredit(null);
    setMontoParaModal("");
  };

  const handlePagoGuardado = () => {
    fetchCreditos();
    if (selectedRow) {
      fetchPagos(selectedRow);
    }
  };

  const filteredCreditos = creditos.filter(
    (credito) =>
      (credito.casa_habitacion?.nombre_cliente?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (credito.casa_habitacion?.calle?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (credito.casa_habitacion?.numero?.toString().toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  // --- HELPERS VISUALES ---
  const formatMoney = (amount) => Number(amount).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="pt-6">
          <Titulo Texto="Créditos y Cobranza" />
      </div>

      <section className="m-auto max-w-6xl p-4 space-y-6">
        
        {/* --- 1. BARRA DE CONTROL --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Icon icon="mdi:account-cash" width="24" />
            </div>
            <div className='flex flex-col w-full'>
                <label className="text-xs font-bold text-gray-400 uppercase">Buscar Deudor</label>
                <input
                    type="text"
                    placeholder="Nombre, Calle..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="font-bold text-gray-700 bg-transparent outline-none w-full md:w-64"
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
            {/* Solo mostramos el botón manual si hay algo seleccionado, sino, se usa el de la tarjeta */}
            {selectedRow && (
                <button
                onClick={handleNuevoPagoClick}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-md shadow-green-200 transition-all transform active:scale-95 text-sm flex items-center gap-2"
                >
                <Icon icon="mdi:cash-plus" width="18" /> Abonar Manual
                </button>
            )}
          </div>
        </div>

        <h2 className="font-extrabold flex items-center gap-2 text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mt-8 mb-4">
          <Icon icon="mdi:alert-circle-outline" className="text-blue-500" /> Cuentas por Cobrar
        </h2>

        {/* --- 2. GRID DE TARJETAS DE CRÉDITO --- */}
        {cargandoCreditos ? (
             <div className="flex flex-col items-center justify-center py-20">
                <Icon icon="line-md:loading-loop" width="48" className="text-indigo-500 mb-4"/>
                <p className="text-gray-400 animate-pulse">Buscando deudas...</p>
             </div>
        ) : filteredCreditos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCreditos.map((credito) => (
                    <div 
                        key={credito.id_carga}
                        onClick={() => handleCardClick(credito)}
                        className={`bg-white rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden group
                            ${selectedRow === credito.id_carga 
                                ? 'border-2 border-indigo-500 shadow-lg ring-4 ring-indigo-500/10' 
                                : 'border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300'
                            }
                        `}
                    >
                        {/* Indicador lateral de deuda */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>

                        <div className="p-5 pl-7">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg leading-tight">
                                        {credito.casa_habitacion?.nombre_cliente || "Cliente"}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                        <Icon icon="mdi:map-marker" />
                                        {credito.casa_habitacion?.colonia}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase border border-red-100">
                                        Deuda
                                    </span>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                                <Icon icon="mdi:home-map-marker" className="text-gray-400"/>
                                {credito.casa_habitacion?.calle} #{credito.casa_habitacion?.numero}
                            </p>

                            <div className="flex justify-between items-end border-t border-gray-100 pt-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Monto Pendiente</p>
                                    <p className="text-2xl font-black text-red-600 tracking-tight">
                                        {formatMoney(credito.monto_pendiente)}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLiquidarClick(credito);
                                    }}
                                    className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
                                >
                                    <Icon icon="mdi:check-all" /> Liquidar
                                </button>
                            </div>
                        </div>
                        
                        {/* Footer informativo */}
                        <div className="bg-gray-50 px-5 py-2 text-[10px] text-gray-400 flex justify-between uppercase font-bold tracking-wider">
                            <span>Origen: {credito.tipo_pago}</span>
                            <span className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors">
                                {selectedRow === credito.id_carga ? 'Ocultar Pagos' : 'Ver Historial'} 
                                <Icon icon={selectedRow === credito.id_carga ? "mdi:chevron-up" : "mdi:chevron-down"} />
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                <div className="p-4 bg-green-50 rounded-full mb-4">
                    <Icon icon="mdi:check-circle-outline" className="text-green-500 w-12 h-12"/>
                </div>
                <h3 className="text-lg font-bold text-gray-700">¡Todo al corriente!</h3>
                <p className="text-gray-400 text-center max-w-sm mt-1">No se encontraron créditos pendientes con los criterios de búsqueda.</p>
            </div>
        )}

        {/* --- 3. SECCIÓN DE HISTORIAL DE PAGOS (DESPLEGABLE) --- */}
        {selectedRow && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                 <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Icon icon="mdi:history" className="text-indigo-500"/> Historial de Abonos
                 </h3>
                 <button onClick={() => setSelectedRow(null)} className="text-gray-400 hover:text-gray-600">
                    <Icon icon="mdi:close" />
                 </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-6">Fecha</th>
                    <th className="py-3 px-6 text-center">Monto Abonado</th>
                    <th className="py-3 px-6 text-center">Método</th>
                    <th className="py-3 px-6 text-right">Recibo ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cargandoPagos ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-400">
                         <Icon icon="line-md:loading-loop" className="inline mr-2"/> Cargando historial...
                      </td>
                    </tr>
                  ) : pagos.length > 0 ? (
                    pagos.map((pago) => (
                      <tr key={pago.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="py-3 px-6 text-gray-600 font-mono text-xs">
                          {new Date(pago.fecha_pago).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute:'2-digit' })}
                        </td>
                        <td className="py-3 px-6 text-center font-bold text-green-600 text-base">
                          {formatMoney(pago.monto_pago)}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                              pago.tipo_pago === "efectivo"
                                ? "bg-green-50 text-green-700 border-green-100"
                                : pago.tipo_pago === "transferencia"
                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                : "bg-blue-50 text-blue-700 border-blue-100"
                            }`}
                          >
                            {pago.tipo_pago || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right text-gray-400 text-xs font-mono">
                          #{pago.id}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-10 text-center flex flex-col items-center justify-center text-gray-400 italic">
                        <Icon icon="mdi:cash-remove" width="32" className="mb-2 opacity-50"/>
                        Sin pagos registrados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <ModalNuevoPago
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPagoGuardado={handlePagoGuardado}
        credito={selectedCredit}
        montoInicial={montoParaModal}
      />
    </main>
  );
};