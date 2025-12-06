import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Icon } from "@iconify/react";

const ModalNuevoEdificio = ({ isOpen, onClose, contrato, onEdificioGuardado, edificio: edificioAEditar }) => {
  const [edificio, setEdificio] = useState({
    responsable_nombre: '',
    responsable_telefono: '',
    calle: '',
    numero: '',
    colonia: '',
    delegacion: '',
    cp: '',
  });

  const [coloniasDisponibles, setColoniasDisponibles] = useState([]);
  const [cargandoCP, setCargandoCP] = useState(false);
  
  // NUEVO ESTADO: Para saber si dejamos escribir libremente
  const [modoManual, setModoManual] = useState(false);

  const isEditMode = Boolean(edificioAEditar);
  const idContrato = contrato?.id_contrato;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setEdificio(edificioAEditar);
        // Si estamos editando, asumimos modo manual por defecto para no bloquear,
        // a menos que quieras volver a consultar la API al abrir.
        setModoManual(true); 
      } else {
        setEdificio({
          responsable_nombre: '', responsable_telefono: '', calle: '', numero: '', colonia: '', delegacion: '', cp: '',
        });
        setColoniasDisponibles([]);
        setModoManual(false);
      }
    }
  }, [isOpen, edificioAEditar, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEdificio((prev) => ({ ...prev, [name]: value }));
  };

  const handleCPChange = async (e) => {
    const cpIngresado = e.target.value;
    if (!/^\d*$/.test(cpIngresado)) return;
    
    // Resetear lógica al cambiar CP
    setEdificio(prev => ({ ...prev, cp: cpIngresado }));
    
    if (cpIngresado.length === 5) {
      setCargandoCP(true);
      setModoManual(false); // Intentamos usar API primero
      
      try {
        const response = await fetch(`https://api.copomex.com/query/info_cp/${cpIngresado}?token=20040ebb-6c71-494d-a8ce-f926fceded6a`);
        
        // Si la API falla a nivel red (404, 500) lanzará error y caerá en el catch
        if (!response.ok) throw new Error("API Error");

        const data = await response.json();
        
        if (!data.error) {
          setColoniasDisponibles(data);
          // Auto-llenar delegación si viene en la respuesta
          const municipio = data[0]?.response?.municipio || "";
          setEdificio(prev => ({ ...prev, delegacion: municipio, colonia: '' }));
        } else {
          // Si la API dice "no encontrado", activamos manual
          throw new Error("CP no encontrado");
        }
      } catch (error) { 
        console.warn("API CP Falló o sin datos, activando manual:", error);
        setColoniasDisponibles([]);
        setModoManual(true); // <--- AQUÍ LA SOLUCIÓN: Activamos escritura manual
        setEdificio(prev => ({ ...prev, colonia: '', delegacion: '' }));
      } 
      finally { setCargandoCP(false); }
    } else {
      setColoniasDisponibles([]);
      setEdificio(prev => ({ ...prev, delegacion: '', colonia: '' }));
    }
  };

  const handleColoniaChange = (e) => {
    setEdificio(prev => ({ ...prev, colonia: e.target.value }));
  };

  const handleGuardarEdificio = async () => {
    // ... (Tu lógica de guardado sigue igual)
    try {
      if (isEditMode) {
        const { error } = await supabase.from('edificio').update(edificio).eq('id_edificio', edificioAEditar.id_edificio);
        if (error) throw error;
      } else {
        if (!idContrato) return alert('Error: No hay contrato.');
        const { error } = await supabase.from('edificio').insert([{ id_contrato: idContrato, ...edificio, estado: true }]);
        if (error) throw error;
      }
      onEdificioGuardado();
      onClose();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleCancel = async () => {
     // ... (Tu lógica de cancelar sigue igual)
    if (!isEditMode && idContrato) {
      if (window.confirm("¿Cancelar? Se eliminará el contrato.")) {
        await supabase.from('contrato').delete().eq('id_contrato', idContrato);
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        
        {/* HEADER (Igual) */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon icon={isEditMode ? "mdi:office-building-cog" : "mdi:office-building-plus"} className="text-white w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">{isEditMode ? 'Editar Edificio' : 'Nuevo Edificio'}</h2>
          </div>
          <button onClick={handleCancel} className="text-white/80 hover:text-white transition-colors">
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
          
          {/* ... (Badge Contrato y Datos Responsable siguen igual) ... */}
          {!isEditMode && (
             <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                   <Icon icon="mdi:file-document-check-outline" width="24" />
                </div>
                <div>
                   <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Contrato Asociado</div>
                   <div className="font-mono font-bold text-gray-800 text-lg">#{idContrato || "---"}</div>
                </div>
             </div>
          )}

          <div>
             <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2 border-b pb-2">
               <Icon icon="mdi:account-tie" /> Responsable
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InputGroup label="Nombre Completo" icon="mdi:account" name="responsable_nombre" value={edificio.responsable_nombre} onChange={handleChange} placeholder="Ej. Juan Pérez" />
                <InputGroup label="Teléfono" icon="mdi:phone" name="responsable_telefono" value={edificio.responsable_telefono} onChange={handleChange} placeholder="55..." type="tel" />
             </div>
          </div>

          {/* DIRECCIÓN CON LÓGICA MANUAL */}
          <div>
             <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2 border-b pb-2">
               <Icon icon="mdi:map-marker-radius" /> Ubicación
             </h3>
             
             <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8">
                   <InputGroup label="Calle" icon="mdi:road-variant" name="calle" value={edificio.calle} onChange={handleChange} />
                </div>
                <div className="col-span-4">
                   <InputGroup label="Número" icon="mdi:numeric" name="numero" value={edificio.numero} onChange={handleChange} placeholder="#" />
                </div>

                {/* CP */}
                <div className="col-span-4 relative">
                   <InputGroup label="C.P." icon="mdi:mailbox" name="cp" value={edificio.cp} onChange={handleCPChange} maxLength="5" />
                   {cargandoCP && (
                      <div className="absolute right-3 top-9 animate-spin text-blue-500">
                         <Icon icon="mdi:loading" />
                      </div>
                   )}
                </div>

                {/* COLONIA: INTERCAMBIABLE ENTRE SELECT E INPUT */}
                <div className="col-span-8 group">
                   <div className="flex justify-between items-end mb-1.5 ml-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Colonia</label>
                      {/* BOTÓN PARA CAMBIAR A MANUAL SI LA API FUNCIONA PERO NO TRAE LA COLONIA */}
                      {!modoManual && coloniasDisponibles.length > 0 && (
                        <button 
                          type="button"
                          onClick={() => { setModoManual(true); setEdificio(prev => ({...prev, colonia: ''})); }}
                          className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                        >
                          ¿No aparece? Escribir manual
                        </button>
                      )}
                      {modoManual && coloniasDisponibles.length > 0 && (
                         <button 
                         type="button"
                         onClick={() => setModoManual(false)}
                         className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                       >
                         Volver a lista
                       </button>
                      )}
                   </div>

                   {/* CONDICIONAL: SI HAY DATOS DE API Y NO ES MANUAL, MUESTRA SELECT. SI NO, MUESTRA INPUT */}
                   {!modoManual && coloniasDisponibles.length > 0 ? (
                       <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                             <Icon icon="mdi:home-group" width="20" />
                          </div>
                          <select
                            name="colonia"
                            value={edificio.colonia}
                            onChange={handleColoniaChange}
                            className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="">Selecciona...</option>
                            {coloniasDisponibles.map((c, i) => ( <option key={i} value={c.response.asentamiento}>{c.response.asentamiento}</option> ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400"><Icon icon="mdi:chevron-down" /></div>
                       </div>
                   ) : (
                       /* FALLBACK: INPUT MANUAL */
                       <InputGroup 
                          icon="mdi:home-edit" 
                          name="colonia" 
                          value={edificio.colonia} 
                          onChange={handleChange} 
                          placeholder="Escribe la colonia..." 
                       />
                   )}
                </div>

                {/* DELEGACIÓN: EDITABLE SI ESTAMOS EN MODO MANUAL */}
                <div className="col-span-12">
                   <InputGroup 
                      label="Delegación / Municipio" 
                      icon="mdi:map" 
                      name="delegacion" 
                      value={edificio.delegacion} 
                      onChange={handleChange}
                      // Si hay datos de API y no estamos en manual, bloqueamos. Si no, permitimos editar.
                      readOnly={!modoManual && coloniasDisponibles.length > 0} 
                      className={!modoManual && coloniasDisponibles.length > 0 ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"}
                   />
                </div>
             </div>
          </div>
        </div>

        {/* FOOTER (Igual) */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
           <button onClick={handleCancel} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white hover:shadow-sm transition-all">Cancelar</button>
           <button onClick={handleGuardarEdificio} className="px-6 py-2.5 rounded-lg text-white font-medium bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all flex items-center gap-2">
              <Icon icon="mdi:content-save-check" /> {isEditMode ? 'Guardar Cambios' : 'Guardar Edificio'}
           </button>
        </div>
      </div>
    </div>
  );
};

const InputGroup = ({ label, icon, className = "", ...props }) => (
  <div className="group">
    {label && <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">{label}</label>}
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
        <Icon icon={icon} width="20" />
      </div>
      <input {...props} className={`block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm ${className}`} />
    </div>
  </div>
);

export default ModalNuevoEdificio;