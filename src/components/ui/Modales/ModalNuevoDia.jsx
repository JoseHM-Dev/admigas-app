import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import ModalPersonal from "./ModalPersonal";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../../../utils/cropUtils"; // ASEGURA LA RUTA CORRECTA

const frasesMotivacion = [
  "¡El éxito es la suma de pequeños esfuerzos repetidos día tras día!",
  "Un nuevo día, una nueva oportunidad para brillar. ¡A por ello!",
  "Que tu esfuerzo de hoy sea la semilla del éxito de mañana. ¡Empecemos!",
  "La mejor forma de predecir el futuro es creándolo. ¡Hoy lo creamos!",
  "Hoy es el día perfecto para empezar a vivir tus sueños. ¡Actívate!",
];

// ... (El componente PersonalSearch se mantiene IGUAL, no lo repito para ahorrar espacio) ...
// Componente de Búsqueda de Personal (Cópialo del código anterior o mantenlo igual)
const PersonalSearch = ({ onSelect, excludeIds = [], allPersonal = [], onSavePersonal, disabled }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
  
    const filteredPersonal = useMemo(() => {
      return allPersonal.filter(
        (p) =>
          !excludeIds.includes(p.id) &&
          (p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }, [allPersonal, excludeIds, searchTerm]);
  
    const handleSelect = (person) => {
      onSelect(person);
      setSearchTerm("");
      setSearchResults([]);
    };
  
    const handleSearchChange = (e) => {
      const term = e.target.value;
      setSearchTerm(term);
      if (term.length > 0) setSearchResults(filteredPersonal);
      else setSearchResults([]);
    };
  
    const handleSaveAndClose = () => {
      setIsModalOpen(false);
      onSavePersonal();
    };
  
    return (
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
          <Icon icon="mdi:account-search" width="20" />
        </div>
        <input
          type="text"
          placeholder="Buscar personal..."
          value={searchTerm}
          onChange={handleSearchChange}
          disabled={disabled}
          className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm"
        />
        {searchTerm.length > 0 && searchResults.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-1">
            {searchResults.map((person) => (
              <li
                key={person.id}
                onClick={() => handleSelect(person)}
                className="p-3 cursor-pointer hover:bg-blue-50 transition-colors duration-150 flex items-center gap-2 border-b border-gray-50 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                   {person.nombre.charAt(0)}{person.apellidos.charAt(0)}
                </div>
                <span className="text-gray-700 font-medium">{person.nombre} {person.apellidos}</span>
              </li>
            ))}
          </ul>
        )}
        {searchTerm.length > 0 && searchResults.length === 0 && (
          <div className="mt-2 flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200 animate-in fade-in">
            <p className="text-sm text-yellow-700 font-medium">No encontrado.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center text-xs px-3 py-1.5 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors shadow-sm font-bold"
            >
              <Icon icon="mdi:plus" width="16" className="mr-1" /> Registrar
            </button>
          </div>
        )}
        <ModalPersonal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          personalData={null}
          onSave={handleSaveAndClose}
        />
      </div>
    );
};

export const ModalNuevoDia = ({ isOpen, onClose, onDiaGuardado }) => {
  const [motivacion, setMotivacion] = useState("");
  const [personalAbordo, setPersonalAbordo] = useState([]);
  const [allPersonal, setAllPersonal] = useState([]);
  const [porcentajeInicial, setPorcentajeInicial] = useState(0);
  const [registradorId, setRegistradorId] = useState("");
  
  // ESTADOS PARA RECORTE
  const [tempImgUrl, setTempImgUrl] = useState(null); // Imagen cruda seleccionada
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imagenFinal, setImagenFinal] = useState(null); // Blob final recortado
  const [imagenPreview, setImagenPreview] = useState(null); // URL para mostrar preview final

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAllPersonal = useCallback(async () => {
    setAllPersonal([]);
    setPersonalAbordo([]);
    setLoading(true);
    const { data, error } = await supabase.from("personal").select("id, nombre, apellidos, trabajando");
    if (error) {
      console.error("Error fetching personal:", error);
      setErrorMsg("Error al cargar la lista de personal.");
    } else {
      setAllPersonal(data);
      const aBordo = data.filter((p) => p.trabajando);
      setPersonalAbordo(aBordo);
      if (aBordo.length === 1) setRegistradorId(aBordo[0].id);
    }
    setLoading(false);
  }, []);

  const handleReloadPersonal = useCallback(() => fetchAllPersonal(), [fetchAllPersonal]);

  useEffect(() => {
    if (isOpen) {
      setMotivacion(frasesMotivacion[Math.floor(Math.random() * frasesMotivacion.length)]);
      fetchAllPersonal();
      setErrorMsg("");
      setSuccessMsg("");
    } else {
      setPersonalAbordo([]);
      setPorcentajeInicial(0);
      setRegistradorId("");
      setImagenFinal(null);
      setImagenPreview(null);
      setTempImgUrl(null);
    }
  }, [isOpen, fetchAllPersonal]);

  const handleSelectPersonal = (person) => {
    setPersonalAbordo((prev) => {
      if (!prev.find((p) => p.id === person.id)) return [...prev, person];
      return prev;
    });
    setSuccessMsg("");
  };

  const handleRemovePersonal = (id) => {
    setPersonalAbordo((prev) => prev.filter((p) => p.id !== id));
    setSuccessMsg("");
  };

  // 1. Seleccionar archivo y abrir cropper
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setTempImgUrl(reader.result); // Abrir modal de recorte
      });
      reader.readAsDataURL(file);
    }
  };

  // 2. Guardar coordenadas del crop
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 3. Confirmar recorte
  const handleCropSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(tempImgUrl, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(croppedBlob);
      
      setImagenFinal(croppedBlob);
      setImagenPreview(previewUrl);
      setTempImgUrl(null); // Cerrar cropper
    } catch (e) {
      console.error(e);
      setErrorMsg("Error al recortar la imagen");
    }
  };

  const handleOpenFileInput = () => fileInputRef.current.click();

  const handleGuardarNuevoDia = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    const todayDateString = new Date().toLocaleDateString('fr-CA', { timeZone: 'America/Mexico_City' });

    if (personalAbordo.length === 0) return setErrorMsg("Debes seleccionar al menos una persona.");
    if (!registradorId) return setErrorMsg("Debes seleccionar un registrador.");
    if (!imagenFinal) return setErrorMsg("Debes recortar y guardar la fotografía.");
    
    setIsSubmitting(true);

    try {
      const { data: existingEntry, error: checkError } = await supabase
        .from("porcentaje_diario")
        .select("id")
        .eq("fecha", todayDateString)
        .is("porcentaje_final",null,)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingEntry) {
        setIsSubmitting(false);
        return setErrorMsg("El día ya fue iniciado. Usa 'Fin de Día' para cambios.");
      }

      // Subir Imagen Recortada
      const fileName = `${Date.now()}_${registradorId}_inicial.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("fotos_diarias")
        .upload(fileName, imagenFinal, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });

      if (uploadError) throw new Error(`Error imagen: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from("fotos_diarias").getPublicUrl(uploadData.path);

      const personalIdsToSetTrue = personalAbordo.map((p) => p.id);
      await supabase.from("personal").update({ trabajando: true }).in("id", personalIdsToSetTrue);
      
      const notAbordoIds = allPersonal.map((p) => p.id).filter((id) => !personalIdsToSetTrue.includes(id));
      if (notAbordoIds.length > 0) {
        await supabase.from("personal").update({ trabajando: false }).in("id", notAbordoIds);
      }

      const { error: insertError } = await supabase.from("porcentaje_diario").insert([{
        porcentaje_inicial: Number(porcentajeInicial),
        url_inicial: publicUrl,
        registrador_id: registradorId,
        fecha: todayDateString,
      }]);

      if (insertError) throw new Error(`Error BD: ${insertError.message}`);

      setSuccessMsg("¡Día iniciado exitosamente!");
      setTimeout(() => {
        onDiaGuardado();
        onClose();
      }, 1500);

    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || "Error desconocido");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const personalAbordoIds = personalAbordo.map((p) => p.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-all duration-300">
      
      {/* UI DE RECORTE DE IMAGEN (Si hay tempImgUrl) */}
      {tempImgUrl ? (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
          <div className="bg-black text-white p-3 flex justify-between items-center z-10">
            <h3 className="font-bold">Ajustar Imagen</h3>
            <button onClick={() => setTempImgUrl(null)} className="text-gray-300 hover:text-white"><Icon icon="mdi:close"/></button>
          </div>
          <div className="relative flex-1 bg-black">
             <Cropper
                image={tempImgUrl}
                crop={crop}
                zoom={zoom}
                aspect={1} // CUADRADO PERFECTO
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
             />
          </div>
          <div className="p-4 bg-white flex justify-between items-center">
             <div className="w-1/2 pr-4">
               <label className="text-xs font-bold text-gray-500">Zoom</label>
               <input 
                 type="range" 
                 min={1} max={3} step={0.1} 
                 value={zoom} 
                 onChange={(e)=>setZoom(e.target.value)} 
                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
               />
             </div>
             <button 
                onClick={handleCropSave}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
             >
                Confirmar
             </button>
          </div>
        </div>
      ) : (
        /* MODAL NORMAL DE NUEVO DÍA */
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Icon icon="mdi:weather-sunny" className="text-white w-7 h-7 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-wide">
                Iniciar Nuevo Día
              </h3>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <Icon icon="mdi:close" width="28" />
            </button>
          </div>

          {/* CONTENIDO SCROLLEABLE */}
          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-xl border border-green-200 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-10">
                  <Icon icon="mdi:format-quote-close" width="80" />
               </div>
               <h4 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Icon icon="mdi:lightbulb-on-outline" /> Mensaje del Día
               </h4>
               <p className="text-green-900 font-medium italic relative z-10">"{motivacion}"</p>
            </div>

            <div className="space-y-3">
               <label className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                  <Icon icon="mdi:account-group" /> Equipo en Ruta
               </label>
               <PersonalSearch
                  onSelect={handleSelectPersonal}
                  excludeIds={personalAbordoIds}
                  allPersonal={allPersonal}
                  onSavePersonal={handleReloadPersonal}
                  disabled={loading}
               />
               <div className="flex flex-wrap gap-2 min-h-10 p-1">
                  {personalAbordo.map((p) => (
                    <div key={p.id} className="flex items-center bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm pl-3 pr-1 py-1 rounded-full shadow-sm animate-in zoom-in duration-150">
                       <span className="font-medium">{p.nombre} {p.apellidos.split(" ")[0]}</span>
                       <button onClick={() => handleRemovePersonal(p.id)} className="ml-2 p-1 hover:bg-red-100 text-indigo-400 hover:text-red-500 rounded-full transition-colors">
                          <Icon icon="mdi:close-circle" width="16" />
                       </button>
                    </div>
                  ))}
                  {personalAbordo.length === 0 && (
                    <span className="text-sm text-gray-400 italic flex items-center gap-1">
                      <Icon icon="mdi:arrow-up" /> Añade al personal arriba
                    </span>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Porcentaje Inicial</label>
                  <div className="relative group">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500">
                        <Icon icon="mdi:percent" width="20" />
                     </div>
                     <input
                       type="number"
                       min="0"
                       max="100"
                       value={porcentajeInicial}
                       onChange={(e) => setPorcentajeInicial(Math.min(100, Math.max(0, Number(e.target.value))))}
                       className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-bold text-center focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                     />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Responsable</label>
                  <div className="relative group">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500">
                        <Icon icon="mdi:clipboard-account" width="20" />
                     </div>
                     <select
                       value={registradorId}
                       onChange={(e) => setRegistradorId(e.target.value)}
                       disabled={personalAbordo.length === 0}
                       className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
                     >
                       <option value="">Seleccionar...</option>
                       {personalAbordo.map((p) => (
                         <option key={p.id} value={p.id}>{p.nombre} {p.apellidos.split(" ")[0]}</option>
                       ))}
                     </select>
                  </div>
               </div>
            </div>

            {/* FOTOGRAFÍA CON PREVIEW RECORTADA */}
            <div className="space-y-3">
               <label className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                  <Icon icon="mdi:camera" /> Evidencia Fotográfica
               </label>
               
               <input
                 type="file"
                 accept="image/*"
                 onChange={handleFileChange}
                 ref={fileInputRef}
                 className="hidden"
               />

               {!imagenPreview ? (
                 <button
                   onClick={handleOpenFileInput}
                   className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                 >
                   <div className="p-3 bg-gray-100 rounded-full group-hover:bg-white group-hover:shadow-md transition-all">
                      <Icon icon="mdi:camera-plus" width="32" />
                   </div>
                   <span className="mt-2 text-sm font-medium">Tocar para subir foto</span>
                 </button>
               ) : (
                 <div className="relative rounded-xl overflow-hidden shadow-lg group w-full flex justify-center bg-gray-100">
                   <img src={imagenPreview} alt="Preview" className="h-48 w-48 object-cover rounded-lg border-2 border-white shadow-sm" />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button onClick={handleOpenFileInput} className="bg-white/90 text-gray-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-xl hover:bg-white transform hover:scale-105 transition-all">
                         <Icon icon="mdi:camera-retake" /> Cambiar
                      </button>
                   </div>
                 </div>
               )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded-r animate-pulse">
                <Icon icon="mdi:alert-circle" />
                <span className="text-sm font-medium">{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 flex items-center gap-2 rounded-r animate-in fade-in">
                <Icon icon="mdi:check-circle" />
                <span className="text-sm font-medium">{successMsg}</span>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white hover:shadow-sm transition-all outline-none">
              Cancelar
            </button>
            <button
              onClick={handleGuardarNuevoDia}
              disabled={isSubmitting || personalAbordo.length === 0 || !imagenFinal}
              className={`
                px-6 py-2.5 rounded-lg text-white font-medium shadow-lg shadow-blue-500/30
                flex items-center gap-2 transition-all transform active:scale-95
                ${isSubmitting || personalAbordo.length === 0 || !imagenFinal
                  ? 'bg-gray-400 cursor-not-allowed transform-none' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5'
                }
              `}
            >
              {isSubmitting ? (
                 <><Icon icon="line-md:loading-loop" width="24"/> Iniciando...</>
              ) : (
                 <><Icon icon="mdi:rocket-launch" width="20" /> Iniciar Día</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};