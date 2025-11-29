import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { Icon } from '@iconify/react';
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../../../utils/cropUtils"; // Asegúrate de que la ruta sea correcta

const ModalCargaAutotanque = ({ isOpen, onClose, registradorId, onCargaSuccess }) => {
  // Estados del Formulario
  const [precio, setPrecio] = useState('');
  const [litros, setLitros] = useState('');
  const [monto, setMonto] = useState(0);
  
  const [porcentajeInicial, setPorcentajeInicial] = useState('');
  const [fotoInicial, setFotoInicial] = useState(null); // Blob recortado
  const [previewInicial, setPreviewInicial] = useState(null); // URL para mostrar

  const [porcentajeFinal, setPorcentajeFinal] = useState('');
  const [fotoFinal, setFotoFinal] = useState(null); // Blob recortado
  const [previewFinal, setPreviewFinal] = useState(null); // URL para mostrar

  // Estados de Recorte (Cropper)
  const [tempImgUrl, setTempImgUrl] = useState(null);
  const [activeField, setActiveField] = useState(null); // 'inicial' o 'final'
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Estados de UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Refs para inputs ocultos
  const fileInputInicialRef = useRef(null);
  const fileInputFinalRef = useRef(null);

  useEffect(() => {
    if (precio && litros) {
      setMonto(parseFloat(precio) * parseFloat(litros));
    } else {
      setMonto(0);
    }
  }, [precio, litros]);

  // Limpiar estados al cerrar o abrir
  useEffect(() => {
    if (isOpen) {
       setPrecio(''); setLitros(''); setPorcentajeInicial(''); setPorcentajeFinal('');
       setFotoInicial(null); setFotoFinal(null);
       setPreviewInicial(null); setPreviewFinal(null);
       setTempImgUrl(null); setActiveField(null);
       setErrorMsg(''); setSuccessMsg('');
    }
  }, [isOpen]);

  // 1. Manejar Selección de Archivo (Abre el Cropper)
  const handleFileChange = (e, field) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setTempImgUrl(reader.result);
        setActiveField(field); // Guardamos qué foto estamos editando
      });
      reader.readAsDataURL(file);
    }
  };

  // 2. Guardar coordenadas
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 3. Confirmar Recorte y Guardar en Estado
  const handleCropSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(tempImgUrl, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(croppedBlob);

      if (activeField === 'inicial') {
        setFotoInicial(croppedBlob);
        setPreviewInicial(previewUrl);
      } else if (activeField === 'final') {
        setFotoFinal(croppedBlob);
        setPreviewFinal(previewUrl);
      }

      // Resetear cropper
      setTempImgUrl(null);
      setActiveField(null);
      setZoom(1);
    } catch (e) {
      console.error(e);
      setErrorMsg("Error al recortar la imagen");
    }
  };

  const uploadFoto = async (fotoBlob, registroId, tipo) => {
    if (!fotoBlob) return null;

    const today = new Date();
    // Usamos .jpg explícitamente porque el cropper devuelve jpegs
    const fileName = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}_${registroId}_${tipo}.jpg`;
    const filePath = `fotos_diarias/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('fotos_diarias')
      .upload(filePath, fotoBlob, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) {
      throw new Error(`Error al subir la foto: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('fotos_diarias').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!precio || !litros || !porcentajeInicial || !fotoInicial || !porcentajeFinal || !fotoFinal) {
      setErrorMsg('Todos los campos y fotos son requeridos.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'America/Mexico_City' });
      const calculatedMonto = parseFloat(precio) * parseFloat(litros);

      const cargaData = {
        fecha: today,
        precio: parseFloat(precio),
        litros: parseFloat(litros),
        monto: calculatedMonto,
        porcentaje_inicial: parseFloat(porcentajeInicial),
        porcentaje_final: parseFloat(porcentajeFinal),
        registrador_id: registradorId,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('carga_autotanque')
        .insert(cargaData)
        .select('id')
        .single();

      if (insertError) throw insertError;

      const cargaId = insertedData.id;

      // Subir fotos ya recortadas
      const url_inicial = await uploadFoto(fotoInicial, cargaId, 'carga_inicial');
      const url_final = await uploadFoto(fotoFinal, cargaId, 'carga_final');

      const { error: updateError } = await supabase
        .from('carga_autotanque')
        .update({ url_inicial, url_final })
        .eq('id', cargaId);

      if (updateError) throw updateError;

      setSuccessMsg('Carga de autotanque registrada con éxito.');
      setTimeout(() => {
        onCargaSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error al registrar la carga:', error);
      setErrorMsg(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      
      {/* --- CROPPER UI (Se muestra si hay una imagen temporal) --- */}
      {tempImgUrl ? (
         <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px] z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-black text-white p-3 flex justify-between items-center z-10">
              <h3 className="font-bold">Ajustar Foto ({activeField === 'inicial' ? 'Inicial' : 'Final'})</h3>
              <button onClick={() => { setTempImgUrl(null); setActiveField(null); }} className="text-gray-300 hover:text-white"><Icon icon="mdi:close"/></button>
            </div>
            <div className="relative flex-1 bg-black">
               <Cropper
                  image={tempImgUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1} // CUADRADO 1:1
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
               />
            </div>
            <div className="p-4 bg-white flex justify-between items-center">
               <div className="w-1/2 pr-4">
                 <label className="text-xs font-bold text-gray-500">Zoom</label>
                 <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e)=>setZoom(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
               </div>
               <button onClick={handleCropSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Confirmar</button>
            </div>
         </div>
      ) : (
        /* --- FORMULARIO NORMAL --- */
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 transform transition-all duration-300 animate-in fade-in zoom-in">
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h3 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
              <Icon icon="hugeicons:tanker-truck" width="28" />
              Registrar Carga de Autotanque
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-red-600 transition-colors">
              <Icon icon="line-md:close" width="24" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Precio por Litro</label>
                <div className="relative mt-1">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Icon icon="mdi:currency-usd"/></div>
                   <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Litros</label>
                <div className="relative mt-1">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Icon icon="mdi:gas-station"/></div>
                   <input type="number" step="0.01" value={litros} onChange={(e) => setLitros(e.target.value)} className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" required />
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center shadow-inner">
              <h4 className="text-sm uppercase font-bold text-blue-400 mb-1">Costo Total Estimado</h4>
              <p className="text-2xl font-black text-blue-700">${monto.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* --- COLUMNA INICIAL --- */}
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2 mb-3 text-blue-800 font-bold border-b border-gray-200 pb-2">
                    <Icon icon="mdi:clock-start" /> Estado Inicial
                </div>
                
                <label className="block text-xs font-bold text-gray-500 mb-1">Porcentaje Inicial</label>
                <div className="relative mb-4">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Icon icon="mdi:percent"/></div>
                   <input type="number" step="0.01" value={porcentajeInicial} onChange={(e) => setPorcentajeInicial(e.target.value)} className="block w-full pl-10 p-2 border border-gray-300 rounded-md" required />
                </div>

                <label className="block text-xs font-bold text-gray-500 mb-2">Foto Inicial</label>
                <input type="file" accept="image/*" ref={fileInputInicialRef} onChange={(e) => handleFileChange(e, 'inicial')} className="hidden" />
                
                {!previewInicial ? (
                    <button type="button" onClick={() => fileInputInicialRef.current.click()} className="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-white transition-all">
                       <Icon icon="mdi:camera-plus" width="24" />
                       <span className="text-xs mt-1">Subir Foto</span>
                    </button>
                ) : (
                    <div className="relative group">
                       <img src={previewInicial} alt="Ini" className="w-full h-32 object-cover rounded-lg border shadow-sm" />
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                          <button type="button" onClick={() => fileInputInicialRef.current.click()} className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1"><Icon icon="mdi:camera-retake"/> Cambiar</button>
                       </div>
                    </div>
                )}
              </div>

              {/* --- COLUMNA FINAL --- */}
              <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2 mb-3 text-green-800 font-bold border-b border-gray-200 pb-2">
                    <Icon icon="mdi:clock-end" /> Estado Final
                </div>
                
                <label className="block text-xs font-bold text-gray-500 mb-1">Porcentaje Final</label>
                <div className="relative mb-4">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Icon icon="mdi:percent"/></div>
                   <input type="number" step="0.01" value={porcentajeFinal} onChange={(e) => setPorcentajeFinal(e.target.value)} className="block w-full pl-10 p-2 border border-gray-300 rounded-md" required />
                </div>

                <label className="block text-xs font-bold text-gray-500 mb-2">Foto Final</label>
                <input type="file" accept="image/*" ref={fileInputFinalRef} onChange={(e) => handleFileChange(e, 'final')} className="hidden" />
                
                {!previewFinal ? (
                    <button type="button" onClick={() => fileInputFinalRef.current.click()} className="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-400 hover:bg-white transition-all">
                       <Icon icon="mdi:camera-plus" width="24" />
                       <span className="text-xs mt-1">Subir Foto</span>
                    </button>
                ) : (
                    <div className="relative group">
                       <img src={previewFinal} alt="Fin" className="w-full h-32 object-cover rounded-lg border shadow-sm" />
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                          <button type="button" onClick={() => fileInputFinalRef.current.click()} className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1"><Icon icon="mdi:camera-retake"/> Cambiar</button>
                       </div>
                    </div>
                )}
              </div>
            </div>

            {errorMsg && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-center gap-2"><Icon icon="mdi:alert-circle"/> {errorMsg}</div>}
            {successMsg && <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm flex items-center gap-2"><Icon icon="mdi:check-circle"/> {successMsg}</div>}

            <div className="mt-6 pt-4 border-t flex justify-end gap-3">
               <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 shadow-lg shadow-blue-500/30">
                <Icon icon={isSubmitting ? "line-md:loading-loop" : "line-md:confirm-circle"} width="20" />
                {isSubmitting ? 'Guardando...' : 'Guardar Carga'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ModalCargaAutotanque;