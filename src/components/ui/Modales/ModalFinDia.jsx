import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
// ELIMINADO: import ModalFinDiaCompleto from "./ModalFinDiaCompleto"; -> Ya no lo renderizamos aquí
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../../../utils/cropUtils";

const frasesAleatorias = [
  "¡El último esfuerzo para un registro perfecto!",
  "Un paso más para cerrar la jornada con éxito.",
  "La exactitud es la llave. ¡Vamos por ese porcentaje!",
  "Cerrando el ciclo de la mejor manera. ¡Adelante!",
  "Tu registro de cierre es fundamental. ¡Gracias por el esfuerzo!",
];

const PersonalSearchForCierre = ({ onSelect, allPersonal, disabled }) => {
  // ... (El código de búsqueda se mantiene igual, omitido por brevedad pero inclúyelo) ...
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const filteredPersonal = allPersonal.filter(
    (p) =>
      p.trabajando &&
      (p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  return (
    <div className="relative group z-20">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-rose-500 transition-colors">
        <Icon icon="mdi:account-search" width="20" />
      </div>
      <input
        type="text"
        placeholder="Buscar personal activo..."
        value={searchTerm}
        onChange={handleSearchChange}
        disabled={disabled}
        className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm disabled:bg-gray-100"
      />
      {searchTerm.length > 0 && searchResults.length > 0 && (
        <ul className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {searchResults.map((person) => (
            <li
              key={person.id}
              onClick={() => handleSelect(person)}
              className="p-3 cursor-pointer hover:bg-rose-50 transition-colors duration-150 flex items-center gap-3 border-b border-gray-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">
                {person.nombre.charAt(0)}
                {person.apellidos.charAt(0)}
              </div>
              <span className="text-gray-700 font-medium">
                {person.nombre} {person.apellidos}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const ModalFinDia = ({
  isOpen,
  onClose,
  onDiaFinalizado, // Ahora acepta un booleano (true = abrir siguiente)
  listaDiaria,
  pagosDiarios,
  unidad,
}) => {
  const [motivacion, setMotivacion] = useState("");
  const [allPersonal, setAllPersonal] = useState([]);
  const [registrador, setRegistrador] = useState(null);
  const [porcentajeFinal, setPorcentajeFinal] = useState(0);

  // ESTADOS DE RECORTE
  const [tempImgUrl, setTempImgUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imagenFinal, setImagenFinal] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [registroDiarioId, setRegistroDiarioId] = useState(null);

  const fetchPersonalAndRegistroDiario = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: personal, error: personalError } = await supabase
        .from("personal")
        .select("id, nombre, apellidos, trabajando")
        .eq("trabajando", true);

      if (personalError) throw personalError;
      setAllPersonal(personal);

      const { data: registros, error: registroError } = await supabase
        .from("porcentaje_diario")
        .select("id")
        .is("porcentaje_final", null)
        .order("id", { ascending: false })
        .limit(1);

      if (registroError) throw registroError;

      if (registros && registros.length > 0) {
        setRegistroDiarioId(registros[0].id);
      } else {
        setErrorMsg("No se encontró ningún turno abierto para finalizar.");
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setErrorMsg("Error de conexión al cargar datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMotivacion(
        frasesAleatorias[Math.floor(Math.random() * frasesAleatorias.length)]
      );
      fetchPersonalAndRegistroDiario();
    } else {
      setRegistrador(null);
      setPorcentajeFinal(0);
      setImagenFinal(null);
      setImagenPreview(null);
      setTempImgUrl(null);
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, fetchPersonalAndRegistroDiario]);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setTempImgUrl(reader.result);
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(tempImgUrl, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(croppedBlob);
      setImagenFinal(croppedBlob);
      setImagenPreview(previewUrl);
      setTempImgUrl(null);
    } catch (e) {
      console.error(e);
      setErrorMsg("Error al recortar la imagen");
    }
  };

  const handleOpenFileInput = () => fileInputRef.current.click();

  const handleGuardarLlegada = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!registroDiarioId)
      return setErrorMsg("No se encontró el registro inicial del día.");
    if (!registrador) return setErrorMsg("Selecciona quién registra.");
    const finalP = Number(porcentajeFinal);
    if (isNaN(finalP) || finalP < 0 || finalP > 100)
      return setErrorMsg("Porcentaje inválido (0-100).");
    if (!imagenFinal)
      return setErrorMsg("La fotografía recortada es obligatoria.");

    setIsSubmitting(true);

    try {
      const fileName = `${Date.now()}_${registrador.id}_final.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("fotos_diarias")
        .upload(fileName, imagenFinal, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("fotos_diarias").getPublicUrl(uploadData.path);

      const { error: updateError } = await supabase
        .from("porcentaje_diario")
        .update({ porcentaje_final: finalP, url_final: publicUrl })
        .eq("id", registroDiarioId);

      if (updateError) throw updateError;

      setSuccessMsg("¡Llegada registrada! Continuando al cierre...");

      // AQUÍ ESTÁ EL CAMBIO CRÍTICO:
      setTimeout(() => {
        // Pasamos TRUE para indicar que debe abrir el siguiente modal (Actividades)
        onDiaFinalizado(true);
        // No llamamos a onClose aquí porque el Dashboard lo manejará
      }, 1000);
    } catch (error) {
      console.error(error);
      setErrorMsg(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-all duration-300`}
    >
      {tempImgUrl ? (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
          <div className="bg-black text-white p-3 flex justify-between items-center z-10">
            <h3 className="font-bold">Ajustar Imagen</h3>
            <button
              onClick={() => setTempImgUrl(null)}
              className="text-gray-300 hover:text-white"
            >
              <Icon icon="mdi:close" />
            </button>
          </div>
          <div className="relative flex-1 bg-black">
            <Cropper
              image={tempImgUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
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
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <button
              onClick={handleCropSave}
              className="px-6 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all">
          <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 p-5 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                <Icon
                  icon="mdi:weather-sunset"
                  className="text-white w-7 h-7"
                />
              </div>
              <h3 className="text-xl font-bold text-white tracking-wide">
                Finalizar Día
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white"
              disabled={isSubmitting}
            >
              <Icon icon="mdi:close" width="28" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Icon
                  icon="line-md:loading-loop"
                  width="48"
                  className="text-rose-500"
                />
                <p className="text-gray-500 font-medium">
                  Verificando estado...
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-10 text-orange-600">
                    <Icon icon="mdi:flag-checkered" width="80" />
                  </div>
                  <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Icon icon="mdi:check-decagram" /> ¡Casi listo!
                  </h4>
                  <p className="text-orange-900 font-medium italic relative z-10">
                    "{motivacion}"
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                    Responsable del Cierre
                  </label>
                  {!registrador ? (
                    <PersonalSearchForCierre
                      onSelect={setRegistrador}
                      allPersonal={allPersonal}
                      disabled={isSubmitting}
                    />
                  ) : (
                    <div className="flex items-center justify-between bg-rose-50 border border-rose-100 p-3 rounded-xl animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold">
                          {registrador.nombre.charAt(0)}
                          {registrador.apellidos.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {registrador.nombre} {registrador.apellidos}
                          </p>
                          <p className="text-xs text-rose-500 font-medium">
                            Registrador
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setRegistrador(null)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Icon icon="mdi:close-circle" width="20" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                    Porcentaje de Llegada
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Icon icon="mdi:percent" width="20" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={porcentajeFinal}
                      onChange={(e) =>
                        setPorcentajeFinal(
                          Math.min(100, Math.max(0, Number(e.target.value)))
                        )
                      }
                      className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-xl font-bold text-center focus:bg-white focus:border-rose-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Icon icon="mdi:camera" /> Foto del Medidor
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  {!imagenPreview ? (
                    <button
                      onClick={handleOpenFileInput}
                      className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:text-rose-600 hover:border-rose-400 hover:bg-rose-50 transition-all duration-200 group"
                    >
                      <Icon icon="mdi:camera-plus" width="32" />{" "}
                      <span className="mt-2 text-sm font-medium">
                        Subir Evidencia
                      </span>
                    </button>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden shadow-lg group w-full flex justify-center bg-gray-100">
                      <img
                        src={imagenPreview}
                        alt="Preview"
                        className="h-48 w-48 object-cover rounded-lg border-2 border-white"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={handleOpenFileInput}
                          className="bg-white/90 text-gray-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                        >
                          <Icon icon="mdi:camera-retake" /> Cambiar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-700 rounded text-sm">
                    {errorMsg}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-green-50 text-green-700 rounded text-sm">
                    {successMsg}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardarLlegada}
              disabled={isSubmitting || loading || !registrador || !imagenFinal}
              className={`px-6 py-2.5 rounded-lg text-white font-medium shadow-lg flex items-center gap-2 ${
                isSubmitting || loading || !registrador || !imagenFinal
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Icon icon="line-md:loading-loop" width="24" /> Guardando...
                </>
              ) : (
                <>
                  <Icon icon="mdi:content-save-check" width="20" /> Siguiente
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
