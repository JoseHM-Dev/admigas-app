import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";

// Modales
import ModalContrato from "../ui/Modales/ModalContrato";
import ModalNuevoEdificio from "../ui/Modales/ModalNuevoEdificio";
import ModalNuevaCarga from "../ui/Modales/ModalNuevaCarga";
import ModalNuevoDepartamento from "../ui/Modales/ModalNuevoDepartamento";
import ModalNuevaLectura from "../ui/Modales/ModalNuevaLectura";
import { ModalNuevoPagoEdificio } from "../ui/Modales/ModalNuevoPagoEdificio";
import ModalFacturacion from "../ui/Modales/ModalFacturacion";
import ModalGenerarFactura from "../ui/Modales/ModalGenerarFactura";

export const MainAdministracion = () => {
  // --- ESTADOS DE DATOS ---
  const [edificios, setEdificios] = useState([]);
  const [selectedEdificio, setSelectedEdificio] = useState(null);
  
  // Datos del Edificio Seleccionado
  const [departamentos, setDepartamentos] = useState([]);
  const [lecturas, setLecturas] = useState([]); // Lecturas del depto seleccionado
  const [selectedDepartamento, setSelectedDepartamento] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [cargasEdificio, setCargasEdificio] = useState([]);

  // Estados de Interfaz
  const [activeTab, setActiveTab] = useState("deptos"); // deptos | facturas | cargas
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados Modales
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [isEdificioModalOpen, setIsEdificioModalOpen] = useState(false);
  const [isCargaModalOpen, setIsCargaModalOpen] = useState(false);
  const [isDepartamentoModalOpen, setIsDepartamentoModalOpen] = useState(false);
  const [isLecturaModalOpen, setIsLecturaModalOpen] = useState(false);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);
  const [isGenerarFacturaModalOpen, setIsGenerarFacturaModalOpen] = useState(false);
  
  // Estados para Edición
  const [lecturaParaEditar, setLecturaParaEditar] = useState(null);
  const [edificioParaEditar, setEdificioParaEditar] = useState(null);
  const [departamentoParaEditar, setDepartamentoParaEditar] = useState(null);
  const [nuevoContrato, setNuevoContrato] = useState(null);
  const [selectedFactura, setSelectedFactura] = useState(null);

  // --- 1. CARGA INICIAL DE EDIFICIOS ---
  const fetchEdificios = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("edificio").select("*").eq("estado", true).order("id_edificio");
    setEdificios(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEdificios(); }, [fetchEdificios]);

  // --- 2. CARGA DE DATOS AL SELECCIONAR EDIFICIO ---
  const handleSelectEdificio = async (edificio) => {
    setSelectedEdificio(edificio);
    setActiveTab("deptos");
    setSelectedDepartamento(null);
    setLoading(true);

    // Cargar Deptos
    const { data: deptos } = await supabase.from("departamento").select("*, edificio(*)").eq("id_edificio", edificio.id_edificio);
    setDepartamentos(deptos || []);

    // Cargar Cargas (Historial completo por ahora)
    const { data: cargas } = await supabase.from("carga_edificio").select("*").eq("id_edificio", edificio.id_edificio).order("fecha_carga", {ascending: false});
    setCargasEdificio(cargas || []);

    setLoading(false);
  };

  // --- 3. CARGA DE FACTURAS POR MES ---
  const fetchFacturasPorMes = useCallback(async () => {
    if (!selectedEdificio || !monthFilter) return;
    
    setLoading(true);
    // Obtener IDs deptos
    const { data: deptos } = await supabase.from("departamento").select("id_departamento").eq("id_edificio", selectedEdificio.id_edificio);
    const deptoIds = deptos?.map(d => d.id_departamento) || [];

    if (deptoIds.length === 0) {
        setFacturas([]); setLoading(false); return;
    }

    // Calcular rango de fechas del mes seleccionado
    const [year, month] = monthFilter.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // Último día del mes

    const { data: facs } = await supabase
        .from("factura_departamento")
        .select(`*, departamento(no_depto)`)
        .in("departamento_id", deptoIds)
        .gte("fecha_factura", startDate)
        .lte("fecha_factura", endDate)
        .order("fecha_factura", {ascending: false});
    
    setFacturas(facs || []);
    setLoading(false);
  }, [selectedEdificio, monthFilter]);

  useEffect(() => {
    if (activeTab === "facturas") {
        fetchFacturasPorMes();
    }
  }, [activeTab, monthFilter, fetchFacturasPorMes]);

  // --- 4. CARGA DE LECTURAS (Al seleccionar depto) ---
  const handleSelectDepartamento = async (depto) => {
      // Toggle selección
      if (selectedDepartamento?.id_departamento === depto.id_departamento) {
          setSelectedDepartamento(null);
          setLecturas([]);
      } else {
          setSelectedDepartamento(depto);
          const { data } = await supabase
            .from("lectura")
            .select("*")
            .eq("id_departamento", depto.id_departamento)
            .order("fecha_lectura", {ascending: false})
            .limit(10);
          setLecturas(data || []);
      }
  };

  // --- HANDLERS FALTANTES (Corregidos) ---
  
  const handleOpenGenerarFacturaModal = (depto) => {
    setSelectedDepartamento(depto);
    setIsGenerarFacturaModalOpen(true);
  };

  const handleInhabilitarEdificio = async (id_edificio) => {
    if (window.confirm("¿Está seguro de que desea inhabilitar este edificio?")) {
      try {
        const { error } = await supabase
          .from("edificio")
          .update({ estado: false })
          .eq("id_edificio", id_edificio);

        if (error) throw error;
        
        // Si el edificio inhabilitado era el seleccionado, limpiamos la selección
        if (selectedEdificio?.id_edificio === id_edificio) {
            setSelectedEdificio(null);
        }
        fetchEdificios();
      } catch (error) {
        alert("Error al inhabilitar el edificio: " + error.message);
      }
    }
  };

  const refreshData = () => {
     if(selectedEdificio) handleSelectEdificio(selectedEdificio);
     if(selectedDepartamento) handleSelectDepartamento(selectedDepartamento); // Refresca lecturas
     if(activeTab === "facturas") fetchFacturasPorMes();
  };

  // --- HELPERS VISUALES ---
  const formatMoney = (amount) => Number(amount).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  return (
    <main className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-20 font-sans transition-colors duration-300">
      <div className="pt-6 print:hidden">
        <Titulo Texto="Panel de Administración" />
      </div>

      <section className="m-auto max-w-7xl p-4 space-y-6">
        
        {/* --- TOP BAR: BUSCADOR Y ACCIONES GLOBALES --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative z-20 transition-colors duration-300">
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
              type="text"
              placeholder="Buscar edificio..."
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
              <Icon icon="mdi:arrow-left" width="20" />{" "}
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button
              onClick={() => setIsContratoModalOpen(true)}
              className="flex-1 md:flex-none justify-center px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-md shadow-sky-500/30 font-bold transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Icon icon="mdi:domain-plus" width="22" /> Nuevo Edificio
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* --- SIDEBAR: LISTA DE EDIFICIOS --- */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden lg:sticky lg:top-4 z-10 flex flex-col transition-colors duration-300">
               <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 font-extrabold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider flex justify-between items-center">
                  <span>Edificios Registrados</span>
                  <span className="bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full">{edificios.length}</span>
               </div>
               <div className="max-h-64 lg:max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {edificios.filter(e => e.responsable_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || e.calle.toLowerCase().includes(searchTerm.toLowerCase())).map(edificio => (
                     <div 
                        key={edificio.id_edificio}
                        onClick={() => handleSelectEdificio(edificio)}
                        className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition-colors hover:bg-sky-50 dark:hover:bg-slate-700/50 group
                           ${selectedEdificio?.id_edificio === edificio.id_edificio ? 'bg-sky-50 dark:bg-sky-900/20 border-l-4 border-l-sky-500' : 'border-l-4 border-l-transparent'}
                        `}
                     >
                        <div className="flex justify-between items-start">
                           <h4 className={`font-extrabold text-[15px] leading-tight ${selectedEdificio?.id_edificio === edificio.id_edificio ? 'text-sky-700 dark:text-sky-400' : 'text-slate-700 dark:text-slate-200'} group-hover:text-sky-600 dark:group-hover:text-sky-300`}>
                              {edificio.calle} #{edificio.numero}
                           </h4>
                           <div className="flex gap-1 shrink-0">
                               <button onClick={(e)=>{e.stopPropagation(); setEdificioParaEditar(edificio); setIsEdificioModalOpen(true);}} className="text-slate-300 hover:text-sky-500 p-1 transition-colors"><Icon icon="mdi:pencil-outline" width="18"/></button>
                               <button onClick={(e)=>{e.stopPropagation(); handleInhabilitarEdificio(edificio.id_edificio);}} className="text-slate-300 hover:text-rose-500 p-1 transition-colors"><Icon icon="mdi:trash-can-outline" width="18"/></button>
                           </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">{edificio.colonia}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 w-fit px-2.5 py-1 rounded-lg">
                           <Icon icon="mdi:account-tie" className="text-sky-500"/> {edificio.responsable_nombre.split(" ")[0]}
                        </div>
                     </div>
                  ))}
                  {edificios.length === 0 && !loading && (
                     <div className="p-6 text-center text-slate-400 dark:text-slate-500 font-medium text-sm">
                       No hay edificios registrados.
                     </div>
                  )}
               </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="lg:col-span-3 space-y-6">
               {selectedEdificio ? (
                  <>
                     {/* HEADER EDIFICIO */}
                     <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden transition-colors duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 dark:bg-sky-900/10 rounded-bl-full -mr-10 -mt-10 z-0"></div>
                        <div className="relative z-10">
                           <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-2">{selectedEdificio.calle} #{selectedEdificio.numero}</h2>
                           <p className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 text-sm md:text-base">
                              <Icon icon="mdi:map-marker" className="text-sky-500" width="20"/> {selectedEdificio.colonia}, {selectedEdificio.delegacion}
                           </p>
                           <div className="flex flex-col sm:flex-row gap-3 mt-6 w-full sm:w-auto">
                              <button onClick={()=>{if(!selectedEdificio) return; setIsCargaModalOpen(true);}} className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-amber-600 shadow-md shadow-amber-500/30 transition-all hover:-translate-y-0.5">
                                 <Icon icon="mdi:gas-station" width="20"/> Registrar Carga
                              </button>
                              <button onClick={()=>{setIsDepartamentoModalOpen(true)}} className="w-full sm:w-auto px-5 py-2.5 bg-blue-900 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-blue-800 shadow-md transition-all hover:-translate-y-0.5">
                                 <Icon icon="mdi:home-plus" width="20"/> Nuevo Depto
                              </button>
                           </div>
                        </div>
                     </div>

                     {/* TABS DE NAVEGACIÓN */}
                     <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto hide-scrollbar whitespace-nowrap px-1">
                        <button onClick={()=>setActiveTab("deptos")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'deptos' ? 'border-blue-900 dark:border-sky-400 text-blue-900 dark:text-sky-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                           <Icon icon="mdi:home-group" className="inline mr-1" width="18"/> Departamentos
                        </button>
                        <button onClick={()=>setActiveTab("facturas")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'facturas' ? 'border-blue-900 dark:border-sky-400 text-blue-900 dark:text-sky-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                           <Icon icon="mdi:receipt-text" className="inline mr-1" width="18"/> Facturas
                        </button>
                        <button onClick={()=>setActiveTab("cargas")} className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'cargas' ? 'border-blue-900 dark:border-sky-400 text-blue-900 dark:text-sky-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                           <Icon icon="mdi:truck-cargo-container" className="inline mr-1" width="18"/> Historial Cargas
                        </button>
                     </div>

                     {/* --- CONTENIDO TABS --- */}
                     <div className="min-h-[400px]">
                        
                        {/* TAB 1: DEPARTAMENTOS */}
                        {activeTab === "deptos" && (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-2">
                              {departamentos.map(depto => (
                                 <div key={depto.id_departamento} className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 transition-all hover:shadow-md cursor-pointer flex flex-col ${selectedDepartamento?.id_departamento === depto.id_departamento ? 'border-sky-500 ring-2 ring-sky-500/10 shadow-sm' : 'border-slate-200 dark:border-slate-700'}`} onClick={()=>handleSelectDepartamento(depto)}>
                                    <div className="flex justify-between items-start mb-2">
                                       <div className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5">
                                          <Icon icon="mdi:door-closed" className="text-sky-500"/> Depto {depto.no_depto}
                                       </div>
                                       <div className="flex gap-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-600 rounded-lg p-0.5">
                                          <button onClick={(e)=>{e.stopPropagation(); handleOpenGenerarFacturaModal(depto)}} className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-md transition-colors" title="Generar Factura"><Icon icon="mdi:receipt-text-plus-outline" width="18"/></button>
                                          <button onClick={(e)=>{e.stopPropagation(); setDepartamentoParaEditar(depto); setIsDepartamentoModalOpen(true)}} className="p-2 text-slate-400 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 rounded-md transition-colors" title="Editar Departamento"><Icon icon="mdi:pencil-outline" width="18"/></button>
                                       </div>
                                    </div>
                                    
                                    <div className="mt-2 flex-1">
                                       <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-[15px] leading-tight">{depto.titular_depto}</h4>
                                       <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-1"><Icon icon="mdi:phone" className="text-emerald-500"/> {depto.telefono_depto}</p>
                                    </div>

                                    {/* Subsección de Lecturas (Solo si está seleccionado) */}
                                    {selectedDepartamento?.id_departamento === depto.id_departamento && (
                                       <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 -mx-5 -mb-5 p-5 rounded-b-2xl">
                                          <div className="flex justify-between items-center mb-3">
                                             <h5 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1"><Icon icon="mdi:counter"/> Últimas Lecturas</h5>
                                             <button onClick={(e)=>{e.stopPropagation(); setLecturaParaEditar(null); setIsLecturaModalOpen(true)}} className="text-xs bg-sky-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-sky-600 flex items-center gap-1 shadow-sm transition-transform hover:-translate-y-0.5">
                                                <Icon icon="mdi:plus" width="16"/> Agregar
                                             </button>
                                          </div>
                                          <div className="space-y-2.5">
                                             {lecturas.map(lec => (
                                                <div key={lec.id_lectura} className="flex justify-between items-center text-sm bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
                                                   <span className="text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center gap-1"><Icon icon="mdi:calendar-blank-outline"/> {new Date(lec.fecha_lectura).toLocaleDateString()}</span>
                                                   <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">{lec.valor_lectura} m³</span>
                                                   <button onClick={(e)=>{e.stopPropagation(); setLecturaParaEditar(lec); setIsLecturaModalOpen(true)}} className="text-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-slate-700 p-1.5 rounded-md hover:bg-sky-100 dark:hover:bg-slate-600 transition-colors" title="Editar"><Icon icon="mdi:pencil-outline" width="16"/></button>
                                                </div>
                                             ))}
                                             {lecturas.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 font-medium text-center py-3 bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">Sin lecturas recientes.</p>}
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              ))}
                              {departamentos.length === 0 && (
                                 <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <Icon icon="mdi:home-remove-outline" className="w-16 h-16 text-slate-200 dark:text-slate-600 mb-3"/>
                                    <p className="text-slate-500 dark:text-slate-400 font-bold">Este edificio no tiene departamentos registrados.</p>
                                 </div>
                              )}
                           </div>
                        )}

                        {/* TAB 2: FACTURAS (POR MES) */}
                        {activeTab === "facturas" && (
                           <div className="animate-in fade-in slide-in-from-bottom-2">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 w-full sm:w-fit shadow-sm">
                                 <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Icon icon="mdi:calendar-search" width="18"/> Filtrar Mes:</label>
                                 <input type="month" value={monthFilter} onChange={(e)=>setMonthFilter(e.target.value)} className="font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 transition-all w-full sm:w-auto"/>
                              </div>
                              
                              <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 w-full">
                                 <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                                       <tr>
                                          <th className="px-5 py-4">Depto</th>
                                          <th className="px-5 py-4">Fecha</th>
                                          <th className="px-5 py-4 text-right">Monto</th>
                                          <th className="px-5 py-4 text-right">Saldo</th>
                                          <th className="px-5 py-4 text-center">Estado</th>
                                          <th className="px-5 py-4 text-center">Acciones</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                       {facturas.map(factura => (
                                          <tr key={factura.id_factura} className="hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors">
                                             <td className="px-5 py-4 font-black text-slate-700 dark:text-slate-200 text-[15px]">{factura.departamento?.no_depto}</td>
                                             <td className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">{new Date(factura.fecha_factura).toLocaleDateString()}</td>
                                             <td className="px-5 py-4 text-right font-black text-slate-800 dark:text-slate-100">{formatMoney(factura.monto)}</td>
                                             <td className="px-5 py-4 text-right text-rose-500 dark:text-rose-400 font-black bg-rose-50/30 dark:bg-rose-900/20">{formatMoney(factura.saldo_por_pagar)}</td>
                                             <td className="px-5 py-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider border ${factura.estado_pago ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
                                                   {factura.estado_pago ? 'Pagado' : 'Pendiente'}
                                                </span>
                                             </td>
                                             <td className="px-5 py-4 flex justify-center gap-3">
                                                <a href={factura.url} target="_blank" rel="noreferrer" className="text-slate-400 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 bg-slate-50 dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-slate-600 p-2 rounded-full transition-all border border-slate-200 dark:border-slate-600" title="Ver PDF"><Icon icon="mdi:file-document-outline" width="20"/></a>
                                                {!factura.estado_pago && (
                                                   <button onClick={()=>{setSelectedFactura(factura); setIsPagoModalOpen(true)}} className="text-emerald-600 dark:text-emerald-400 hover:text-white bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-500 dark:hover:bg-emerald-600 p-2 rounded-full transition-all border border-emerald-200 dark:border-emerald-800 shadow-sm" title="Registrar Pago"><Icon icon="mdi:cash-fast" width="20"/></button>
                                                )}
                                             </td>
                                          </tr>
                                       ))}
                                       {facturas.length === 0 && (
                                          <tr><td colSpan="6" className="p-10 text-center text-slate-400 dark:text-slate-500 font-medium">No se encontraron facturas en este mes.</td></tr>
                                       )}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        )}

                        {/* TAB 3: CARGAS */}
                        {activeTab === "cargas" && (
                           <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 w-full animate-in fade-in">
                              <table className="w-full text-sm text-left whitespace-nowrap">
                                 <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                       <th className="px-5 py-4">Fecha</th>
                                       <th className="px-5 py-4 text-center">Litros Suministrados</th>
                                       <th className="px-5 py-4 text-right">Costo Total</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {cargasEdificio.map((carga, i) => (
                                       <tr key={i} className="hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-colors">
                                          <td className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300">{new Date(carga.fecha_carga).toLocaleDateString()}</td>
                                          <td className="px-5 py-4 text-center text-sky-600 dark:text-sky-400 font-black">{carga.consumo_litros} L</td>
                                          <td className="px-5 py-4 text-right font-black text-slate-800 dark:text-slate-100">{formatMoney(carga.monto_total)}</td>
                                       </tr>
                                    ))}
                                    {cargasEdificio.length === 0 && (
                                       <tr><td colSpan="3" className="p-10 text-center text-slate-400 dark:text-slate-500 font-medium">Sin historial de cargas.</td></tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        )}

                     </div>
                  </>
               ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 bg-white dark:bg-slate-800 shadow-sm transition-colors duration-300">
                     <Icon icon="mdi:domain" width="80" className="mb-6 opacity-30 text-slate-300 dark:text-slate-600"/>
                     <p className="font-extrabold text-2xl text-slate-500 dark:text-slate-400 mb-2">Selecciona un edificio</p>
                     <p className="text-base font-medium">Para ver departamentos, facturas y registrar nuevas cargas.</p>
                  </div>
               )}
            </div>
        </div>

        {/* MODALES */}
        <ModalContrato isOpen={isContratoModalOpen} onClose={()=>setIsContratoModalOpen(false)} onSave={(c)=>{setNuevoContrato(c); setIsContratoModalOpen(false); setIsEdificioModalOpen(true)}} />
        <ModalNuevoEdificio isOpen={isEdificioModalOpen} onClose={()=>{setIsEdificioModalOpen(false); setEdificioParaEditar(null)}} contrato={nuevoContrato} onEdificioGuardado={()=>{fetchEdificios(); refreshData();}} edificio={edificioParaEditar} />
        <ModalNuevaCarga isOpen={isCargaModalOpen} onClose={()=>setIsCargaModalOpen(false)} edificio={selectedEdificio} onCargaGuardada={refreshData} />
        <ModalNuevoDepartamento isOpen={isDepartamentoModalOpen} onClose={()=>{setIsDepartamentoModalOpen(false); setDepartamentoParaEditar(null)}} edificio={selectedEdificio} onDepartamentoGuardado={refreshData} departamento={departamentoParaEditar} />
        
        {/* Aquí pasamos lecturaParaEditar al modal actualizado */}
        <ModalNuevaLectura isOpen={isLecturaModalOpen} onClose={()=>setIsLecturaModalOpen(false)} departamento={selectedDepartamento} lectura={lecturaParaEditar} onLecturaGuardada={refreshData} />
        
        <ModalNuevoPagoEdificio isOpen={isPagoModalOpen} onClose={()=>setIsPagoModalOpen(false)} factura={selectedFactura} onPagoGuardado={refreshData} />
        <ModalFacturacion onClose={()=>setIsFacturaModalOpen(false)} /> 
        
        <ModalGenerarFactura 
            isOpen={isGenerarFacturaModalOpen} 
            departamento={selectedDepartamento} 
            onClose={()=>setIsGenerarFacturaModalOpen(false)} 
            onFacturaGenerada={refreshData} 
        />

      </section>
    </main>
  );
};