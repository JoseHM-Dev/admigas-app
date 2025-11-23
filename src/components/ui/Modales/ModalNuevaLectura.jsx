import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// --- Iconos SVG ---
const IconCamera = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-6 h-6 text-indigo-600"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
    />
  </svg>
);

const IconUpload = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-8 h-8 text-gray-400 mb-2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
    />
  </svg>
);

const IconClose = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// --- Helpers ---
function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

const ModalNuevaLectura = ({
  isOpen,
  onClose,
  departamento,
  onLecturaGuardada,
}) => {
  const [lectura, setLectura] = useState({
    fecha_lectura: "",
    valor_lectura: "",
  });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);

  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const fileInputRef = useRef(null); // Ref para el input de archivo oculto
  const aspect = 966 / 321;

  const idDepartamento = departamento?.id_departamento;

  useEffect(() => {
    if (isOpen) {
      setLectura({
        fecha_lectura: new Date().toISOString().split("T")[0],
        valor_lectura: "",
      });
      setError("");
      setImgSrc("");
      setCrop(undefined);
      setCompletedCrop(null);
    }
  }, [isOpen, departamento]);

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        setImgSrc(reader.result?.toString() || "")
      );
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  };

  const getCroppedImg = (image, crop, fileName) => {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const targetWidth = 966;
    const targetHeight = 321;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      targetWidth,
      targetHeight
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }
          blob.name = fileName;
          resolve(blob);
        },
        "image/jpeg",
        0.8
      );
    });
  };

  const handleGuardarLectura = async () => {
    if (!idDepartamento) {
      setError("Error interno: No se ha seleccionado un departamento.");
      return;
    }
    if (!lectura.fecha_lectura || !lectura.valor_lectura) {
      setError("Complete la fecha y el valor de la lectura.");
      return;
    }
    if (
      !imgSrc ||
      !completedCrop ||
      completedCrop.width === 0 ||
      completedCrop.height === 0
    ) {
      setError("Debe cargar y recortar la evidencia fotográfica.");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const image = imgRef.current;
      if (!image || !completedCrop.width || !completedCrop.height) {
        throw new Error("Error al procesar el recorte de imagen.");
      }

      const croppedImageBlob = await getCroppedImg(
        image,
        completedCrop,
        "lectura.jpg"
      );

      // Upload Supabase
      const fileName = `lectura_${idDepartamento}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("fotos_diarias")
        .upload(fileName, croppedImageBlob, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError)
        throw new Error(`Upload fallido: ${uploadError.message}`);

      // Get URL
      const { data: urlData } = supabase.storage
        .from("fotos_diarias")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Insert DB
      const { data, error: insertError } = await supabase
        .from("lectura")
        .insert([
          {
            id_departamento: idDepartamento,
            fecha_lectura: lectura.fecha_lectura,
            valor_lectura: parseFloat(lectura.valor_lectura),
            url: imageUrl,
          },
        ])
        .select();

      if (insertError) throw insertError;

      console.log("Lectura guardada:", data);
      onLecturaGuardada();
      onClose();
    } catch (error) {
      console.error("Error:", error.message);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  // Effect para actualizar el canvas de preview
  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      previewCanvasRef.current
    ) {
      const image = imgRef.current;
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const targetWidth = 966;
      const targetHeight = 321;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        targetWidth,
        targetHeight
      );
    }
  }, [completedCrop]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 flex flex-col overflow-hidden animate-fadeInUp h-[90vh]">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <IconCamera />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Nueva Lectura</h2>
              <p className="text-xs text-gray-500">
                Registre el consumo y evidencia.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <IconClose />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto grow space-y-6">
          {/* Contexto Depto */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex flex-col">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">
              Registrando para
            </span>
            <div className="flex justify-between items-center">
              <span className="text-blue-900 font-medium">
                {departamento?.no_depto
                  ? `Depto. ${departamento.no_depto}`
                  : "Departamento desconocido"}
              </span>
              <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded border border-blue-100">
                {departamento?.titular_depto || "Sin titular"}
              </span>
            </div>
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Fecha de Lectura
              </label>
              <input
                type="date"
                value={lectura.fecha_lectura}
                onChange={(e) =>
                  setLectura((prev) => ({
                    ...prev,
                    fecha_lectura: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Valor Medidor (m³)
              </label>
              <input
                type="number"
                placeholder="0000.00"
                value={lectura.valor_lectura}
                onChange={(e) =>
                  setLectura((prev) => ({
                    ...prev,
                    valor_lectura: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono"
              />
            </div>
          </div>

          {/* Image Uploader - Custom Style */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-bold text-gray-800 mb-3">
              Evidencia Fotográfica
            </label>

            {!imgSrc && (
              <div
                onClick={() => fileInputRef.current.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-all group"
              >
                <IconUpload />
                <p className="text-sm text-gray-500 group-hover:text-indigo-600 font-medium">
                  Haz clic para subir una foto
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG soportados
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onSelectFile}
              className="hidden"
            />

            {/* Area de Recorte */}
            {imgSrc && (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-gray-900 p-1 rounded-lg shadow-inner max-w-full overflow-hidden">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    className="max-h-[300px]"
                  >
                    <img
                      ref={imgRef}
                      alt="Upload"
                      src={imgSrc}
                      onLoad={onImageLoad}
                      className="max-h-[300px] object-contain"
                    />
                  </ReactCrop>
                </div>
                <button
                  onClick={() => {
                    setImgSrc("");
                    setCompletedCrop(null);
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Cambiar imagen
                </button>
              </div>
            )}
          </div>

          {/* Preview Final */}
          {completedCrop && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">
                Vista Previa (Se guardará esto)
              </h3>
              <div className="flex justify-center">
                <canvas
                  ref={previewCanvasRef}
                  className="w-full max-w-[400px] h-auto border border-gray-300 rounded shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 text-center">
              {error}
            </div>
          )}
        </div>

        {/* Footer (Fixed at bottom) */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={cargando}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardarLectura}
            disabled={cargando}
            className={`px-6 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 
              ${
                cargando
                  ? "bg-indigo-400 cursor-wait"
                  : "bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
              }`}
          >
            {cargando ? "Guardando..." : "Guardar Lectura"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalNuevaLectura;
