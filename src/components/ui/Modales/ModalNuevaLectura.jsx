import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Icon } from "@iconify/react";

// --- Helpers de Crop (Mismos de antes) ---
function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

const ModalNuevaLectura = ({ isOpen, onClose, departamento, lectura, onLecturaGuardada }) => {
  // Si "lectura" viene con datos, es EDICIÓN. Si es null, es NUEVA.
  const isEditing = !!lectura;

  const [formState, setFormState] = useState({
    fecha_lectura: "",
    valor_lectura: "",
  });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  
  // Estados de Imagen
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [existingUrl, setExistingUrl] = useState(null); // Para mostrar la foto anterior si editas

  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const aspect = 966 / 321;

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        // MODO EDICIÓN: Cargar datos existentes
        setFormState({
            fecha_lectura: lectura.fecha_lectura,
            valor_lectura: lectura.valor_lectura
        });
        setExistingUrl(lectura.url || null); // Asumimos que tu tabla tiene columna 'url'
      } else {
        // MODO CREACIÓN: Resetear
        setFormState({
            fecha_lectura: new Date().toISOString().split("T")[0],
            valor_lectura: "",
        });
        setExistingUrl(null);
      }
      setError("");
      setImgSrc("");
      setCrop(undefined);
      setCompletedCrop(null);
    }
  }, [isOpen, lectura, isEditing]);

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () => setImgSrc(reader.result?.toString() || ""));
      reader.readAsDataURL(e.target.files[0]);
      setExistingUrl(null); // Si sube nueva, ocultamos la anterior
    }
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  };

  const getCroppedImgBlob = (image, crop, fileName) => {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = 966;
    canvas.height = 321;
    const ctx = canvas.getContext("2d");
    
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      966,
      321
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("Canvas empty")); return; }
          blob.name = fileName;
          resolve(blob);
        }, "image/jpeg", 0.8
      );
    });
  };

  const handleGuardar = async () => {
    if (!formState.fecha_lectura || !formState.valor_lectura) {
      return setError("Complete la fecha y el valor.");
    }

    // Validación de foto: Obligatoria si es nueva. Opcional si es edición y ya tiene una.
    const hasNewPhoto = imgSrc && completedCrop?.width > 0;
    if (!hasNewPhoto && !existingUrl) {
        return setError("La evidencia fotográfica es obligatoria.");
    }

    setCargando(true);
    setError("");

    try {
      let finalImageUrl = existingUrl;

      // 1. Subir nueva foto si existe
      if (hasNewPhoto) {
         const blob = await getCroppedImgBlob(imgRef.current, completedCrop, "lectura.jpg");
         const fileName = `lectura_${departamento.id_departamento}_${Date.now()}.jpg`;
         
         const { error: upError } = await supabase.storage
            .from("fotos_diarias")
            .upload(fileName, blob);
         
         if (upError) throw upError;
         
         const { data: urlData } = supabase.storage.from("fotos_diarias").getPublicUrl(fileName);
         finalImageUrl = urlData.publicUrl;
      }

      // 2. Guardar en BD (INSERT o UPDATE)
      const payload = {
        id_departamento: departamento.id_departamento,
        fecha_lectura: formState.fecha_lectura,
        valor_lectura: parseFloat(formState.valor_lectura),
        url: finalImageUrl
      };

      let dbError;
      if (isEditing) {
         const { error } = await supabase
            .from("lectura")
            .update(payload)
            .eq("id_lectura", lectura.id_lectura); // UPDATE por ID
         dbError = error;
      } else {
         const { error } = await supabase.from("lectura").insert([payload]); // INSERT
         dbError = error;
      }

      if (dbError) throw dbError;

      onLecturaGuardada();
      onClose();

    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar");
    } finally {
      setCargando(false);
    }
  };

  // Preview Effect
  useEffect(() => {
    if (completedCrop?.width && imgRef.current && previewCanvasRef.current) {
        // (Lógica de dibujo en canvas igual que antes para preview)
        const image = imgRef.current;
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext("2d");
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = 966;
        canvas.height = 321;
        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0, 0, 966, 321
        );
    }
  }, [completedCrop]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Icon icon={isEditing ? "mdi:file-edit" : "mdi:file-plus"} className="text-indigo-600"/>
                {isEditing ? "Editar Lectura" : "Nueva Lectura"}
            </h2>
            <button onClick={onClose}><Icon icon="mdi:close" className="text-gray-400 hover:text-red-500 w-6 h-6"/></button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500">Fecha</label>
                    <input type="date" value={formState.fecha_lectura} onChange={(e)=>setFormState({...formState, fecha_lectura: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500">Valor (m³)</label>
                    <input type="number" value={formState.valor_lectura} onChange={(e)=>setFormState({...formState, valor_lectura: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold"/>
                </div>
            </div>

            {/* Foto Section */}
            <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">Evidencia</label>
                
                {/* Si hay URL existente y no hay nueva imagen seleccionada */}
                {existingUrl && !imgSrc && (
                    <div className="relative group rounded-xl overflow-hidden border border-gray-200 mb-4">
                        <img src={existingUrl} alt="Actual" className="w-full h-40 object-cover opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Imagen Actual</span>
                        </div>
                    </div>
                )}

                {!imgSrc && (
                    <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-all group">
                        <Icon icon="mdi:camera-plus" className="text-gray-400 group-hover:text-indigo-500 w-8 h-8 mb-2"/>
                        <p className="text-sm text-gray-500 font-medium">
                            {existingUrl ? "Cambiar Foto" : "Subir Foto"}
                        </p>
                    </div>
                )}
                
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onSelectFile} className="hidden" />

                {/* Cropper */}
                {imgSrc && (
                    <div className="flex flex-col items-center space-y-2">
                        <ReactCrop crop={crop} onChange={(_, c)=>setCrop(c)} onComplete={(c)=>setCompletedCrop(c)} aspect={aspect} className="max-h-[300px]">
                            <img ref={imgRef} alt="Upload" src={imgSrc} onLoad={onImageLoad} className="max-h-[300px] object-contain"/>
                        </ReactCrop>
                        <button onClick={()=>{setImgSrc(""); setCompletedCrop(null);}} className="text-xs text-red-500 font-bold hover:underline">Cancelar cambio</button>
                    </div>
                )}
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">{error}</div>}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={handleGuardar} disabled={cargando} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:opacity-50">
                {cargando ? "Guardando..." : isEditing ? "Actualizar Lectura" : "Guardar Lectura"}
            </button>
        </div>
      </div>
    </div>
  );
};
export default ModalNuevaLectura;