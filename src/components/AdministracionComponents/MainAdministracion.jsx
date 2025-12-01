import React, { useState, useEffect, useCallback, useMemo } from "react";
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
    <main className="min-h-screen pb-20">
      <div className="pt-6"><Titulo Texto="Panel de Administración" /></div>

      <section className="m-auto max-w-7xl p-4 space-y-6">
        
        {/* --- TOP BAR: BUSCADOR Y ACCIONES GLOBALES --- */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
           <div className="relative w-full md:w-1/3">
              <Icon icon="mdi:search" className="absolute left-3 top-3 text-gray-400" width="20"/>
              <input 
                 type="text" 
                 placeholder="Buscar edificio..." 
                 value={searchTerm}
                 onChange={(e)=>setSearchTerm(e.target.value)}
                 className="pl-10 pr-4 py-2 w-full bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
           </div>
           <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <Link to="/dashboard" className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-200"><Icon icon="mdi:arrow-left"/> Dashboard</Link>
              <button onClick={()=>setIsContratoModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-200"><Icon icon="mdi:plus"/> Nuevo Edificio</button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* --- SIDEBAR: LISTA DE EDIFICIOS --- */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
               <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-500 uppercase text-xs tracking-wider">
                  Edificios Registrados ({edificios.length})
               </div>
               <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  {edificios.filter(e => e.responsable_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || e.calle.toLowerCase().includes(searchTerm.toLowerCase())).map(edificio => (
                     <div 
                        key={edificio.id_edificio}
                        onClick={() => handleSelectEdificio(edificio)}
                        className={`p-4 border-b border-gray-100 cursor-pointer transition-all hover:bg-indigo-50 group
                           ${selectedEdificio?.id_edificio === edificio.id_edificio ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}
                        `}
                     >
                        <div className="flex justify-between items-start">
                           <h4 className={`font-bold text-sm ${selectedEdificio?.id_edificio === edificio.id_edificio ? 'text-indigo-700' : 'text-gray-700'}`}>
                              {edificio.calle} #{edificio.numero}
                           </h4>
                           <div className="flex gap-1">
                               <button onClick={(e)=>{e.stopPropagation(); setEdificioParaEditar(edificio); setIsEdificioModalOpen(true);}} className="text-gray-300 hover:text-indigo-500 p-1"><Icon icon="mdi:pencil"/></button>
                               <button onClick={(e)=>{e.stopPropagation(); handleInhabilitarEdificio(edificio.id_edificio);}} className="text-gray-300 hover:text-red-500 p-1"><Icon icon="mdi:delete"/></button>
                           </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{edificio.colonia}</p>
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 font-medium bg-gray-100 w-fit px-2 py-0.5 rounded-full">
                           <Icon icon="mdi:account"/> {edificio.responsable_nombre.split(" ")[0]}
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="lg:col-span-3 space-y-6">
               {selectedEdificio ? (
                  <>
                     {/* HEADER EDIFICIO */}
                     <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>
                        <div className="relative z-10">
                           <h2 className="text-2xl font-black text-gray-800">{selectedEdificio.calle} #{selectedEdificio.numero}</h2>
                           <p className="text-gray-500 font-medium flex items-center gap-2">
                              <Icon icon="mdi:map-marker" className="text-indigo-500"/> {selectedEdificio.colonia}, {selectedEdificio.delegacion}
                           </p>
                           <div className="flex flex-wrap gap-4 mt-6">
                              <button onClick={()=>{if(!selectedEdificio) return; setIsCargaModalOpen(true);}} className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-indigo-200 transition-colors">
                                 <Icon icon="hugeicons:tanker-truck"/> Registrar Carga Gas
                              </button>
                              <button onClick={()=>{setIsDepartamentoModalOpen(true)}} className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-green-200 transition-colors">
                                 <Icon icon="mdi:home-plus"/> Nuevo Departamento
                              </button>
                           </div>
                        </div>
                     </div>

                     {/* TABS DE NAVEGACIÓN */}
                     <div className="flex gap-1 border-b border-gray-200">
                        <button onClick={()=>setActiveTab("deptos")} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'deptos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Departamentos</button>
                        <button onClick={()=>setActiveTab("facturas")} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'facturas' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Facturas</button>
                        <button onClick={()=>setActiveTab("cargas")} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'cargas' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Historial Cargas</button>
                     </div>

                     {/* --- CONTENIDO TABS --- */}
                     <div className="min-h-[400px]">
                        
                        {/* TAB 1: DEPARTAMENTOS */}
                        {activeTab === "deptos" && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                              {departamentos.map(depto => (
                                 <div key={depto.id_departamento} className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${selectedDepartamento?.id_departamento === depto.id_departamento ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-200'}`} onClick={()=>handleSelectDepartamento(depto)}>
                                    <div className="flex justify-between items-start mb-2">
                                       <div className="bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded text-xs uppercase">Depto {depto.no_depto}</div>
                                       <div className="flex gap-1">
                                          <button onClick={(e)=>{e.stopPropagation(); handleOpenGenerarFacturaModal(depto)}} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Generar Factura"><Icon icon="mdi:receipt-text-plus"/></button>
                                          <button onClick={(e)=>{e.stopPropagation(); setDepartamentoParaEditar(depto); setIsDepartamentoModalOpen(true)}} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Icon icon="mdi:pencil"/></button>
                                       </div>
                                    </div>
                                    <h4 className="font-bold text-gray-800">{depto.titular_depto}</h4>
                                    <p className="text-xs text-gray-500">{depto.telefono_depto}</p>

                                    {/* Subsección de Lecturas (Solo si está seleccionado) */}
                                    {selectedDepartamento?.id_departamento === depto.id_departamento && (
                                       <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-xl">
                                          <div className="flex justify-between items-center mb-3">
                                             <h5 className="text-xs font-bold text-gray-500 uppercase">Últimas Lecturas</h5>
                                             <button onClick={(e)=>{e.stopPropagation(); setLecturaParaEditar(null); setIsLecturaModalOpen(true)}} className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded font-bold hover:bg-indigo-700 flex items-center gap-1">
                                                <Icon icon="mdi:plus"/> Nueva
                                             </button>
                                          </div>
                                          <div className="space-y-2">
                                             {lecturas.map(lec => (
                                                <div key={lec.id_lectura} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-200">
                                                   <span className="text-gray-500 text-xs">{new Date(lec.fecha_lectura).toLocaleDateString()}</span>
                                                   <span className="font-mono font-bold text-gray-800">{lec.valor_lectura} m³</span>
                                                   <button onClick={(e)=>{e.stopPropagation(); setLecturaParaEditar(lec); setIsLecturaModalOpen(true)}} className="text-indigo-500 text-xs font-bold hover:underline">Editar</button>
                                                </div>
                                             ))}
                                             {lecturas.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">Sin lecturas recientes.</p>}
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              ))}
                           </div>
                        )}

                        {/* TAB 2: FACTURAS (POR MES) */}
                        {activeTab === "facturas" && (
                           <div className="animate-in fade-in slide-in-from-bottom-2">
                              <div className="flex items-center gap-4 mb-6 bg-white p-3 rounded-xl border border-gray-200 w-fit">
                                 <label className="text-xs font-bold text-gray-500 uppercase">Filtrar Mes:</label>
                                 <input type="month" value={monthFilter} onChange={(e)=>setMonthFilter(e.target.value)} className="font-bold text-gray-700 outline-none cursor-pointer"/>
                              </div>
                              
                              <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">
                                 <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-200">
                                       <tr>
                                          <th className="px-4 py-3">Depto</th>
                                          <th className="px-4 py-3">Fecha</th>
                                          <th className="px-4 py-3 text-right">Monto</th>
                                          <th className="px-4 py-3 text-right">Saldo</th>
                                          <th className="px-4 py-3 text-center">Estado</th>
                                          <th className="px-4 py-3 text-center">Acciones</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                       {facturas.map(factura => (
                                          <tr key={factura.id_factura} className="hover:bg-indigo-50/30">
                                             <td className="px-4 py-3 font-bold text-gray-700">{factura.departamento?.no_depto}</td>
                                             <td className="px-4 py-3 text-xs text-gray-500">{new Date(factura.fecha_factura).toLocaleDateString()}</td>
                                             <td className="px-4 py-3 text-right font-bold">{formatMoney(factura.monto)}</td>
                                             <td className="px-4 py-3 text-right text-red-500 font-bold">{formatMoney(factura.saldo_por_pagar)}</td>
                                             <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${factura.estado_pago ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                   {factura.estado_pago ? 'Pagado' : 'Pendiente'}
                                                </span>
                                             </td>
                                             <td className="px-4 py-3 flex justify-center gap-2">
                                                <a href={factura.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-600"><Icon icon="mdi:file-pdf-box" width="20"/></a>
                                                <button onClick={()=>{setSelectedFactura(factura); setIsPagoModalOpen(true)}} className="text-green-500 hover:text-green-700" title="Registrar Pago"><Icon icon="mdi:cash-plus" width="20"/></button>
                                             </td>
                                          </tr>
                                       ))}
                                       {facturas.length === 0 && (
                                          <tr><td colSpan="6" className="p-8 text-center text-gray-400 italic">No se encontraron facturas en este mes.</td></tr>
                                       )}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        )}

                        {/* TAB 3: CARGAS */}
                        {activeTab === "cargas" && (
                           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
                              <table className="w-full text-sm text-left">
                                 <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-200">
                                    <tr>
                                       <th className="px-6 py-3">Fecha</th>
                                       <th className="px-6 py-3 text-center">Litros Suministrados</th>
                                       <th className="px-6 py-3 text-right">Costo Total</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                    {cargasEdificio.map((carga, i) => (
                                       <tr key={i} className="hover:bg-gray-50">
                                          <td className="px-6 py-3 font-bold text-gray-700">{new Date(carga.fecha_carga).toLocaleDateString()}</td>
                                          <td className="px-6 py-3 text-center text-blue-600 font-medium">{carga.consumo_litros} L</td>
                                          <td className="px-6 py-3 text-right font-mono text-gray-800">{formatMoney(carga.monto_total)}</td>
                                       </tr>
                                    ))}
                                    {cargasEdificio.length === 0 && (
                                       <tr><td colSpan="3" className="p-8 text-center text-gray-400">Sin historial de cargas.</td></tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        )}

                     </div>
                  </>
               ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl p-10 bg-gray-50/50">
                     <Icon icon="solar:buildings-2-bold-duotone" width="64" className="mb-4 opacity-30"/>
                     <p className="font-medium text-lg">Selecciona un edificio del listado</p>
                     <p className="text-sm">Para ver departamentos, facturas y reportes.</p>
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