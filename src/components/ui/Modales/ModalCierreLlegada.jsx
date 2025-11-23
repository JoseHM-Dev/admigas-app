import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";


// --- Frases Aleatorias de Cierre ---
const frasesAleatorias = [
  "¡El último esfuerzo para un registro perfecto!",
  "Un paso más para cerrar la jornada con éxito.",
  "La exactitud es la llave. ¡Vamos por ese porcentaje!",
  "Cerrando el ciclo de la mejor manera. ¡Adelante!",
  "Tu registro de cierre es fundamental. ¡Gracias por el esfuerzo!",
];

// Componente de Búsqueda de Personal (Adaptado del original para filtrar por 'trabajando: true')
const PersonalSearchForCierre = ({ onSelect, allPersonal, disabled }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Filtrar solo al personal que está trabajando y por término de búsqueda
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

    if (term.length > 0) {
      setSearchResults(filteredPersonal);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Buscar personal activo para registrar..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-[#6432e4] focus:border-[#6432e4] transition-all duration-200"
        disabled={disabled}
      />

      {/* Resultados del Buscador */}
      {searchTerm.length > 0 && searchResults.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
          {searchResults.map((person) => (
            <li
              key={person.id}
              onClick={() => handleSelect(person)}
              className="p-2 cursor-pointer hover:bg-indigo-100 transition-colors duration-150"
            >
              {person.nombre} {person.apellidos}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


// --- Componente Principal ---
export const ModalCierreLlegada = ({
  isOpen,
  onClose,
  registroDiario, // Registro de porcentaje_diario del día (viene de 2MainDashboard)
  onSuccessAndOpenActivities, // Callback para abrir el modal de actividades
}) => {
  const [motivacion, setMotivacion] = useState("");
  const [allPersonal, setAllPersonal] = useState([]);
  const [registrador, setRegistrador] = useState(null); // Objeto de la persona seleccionada
  const [porcentajeFinal, setPorcentajeFinal] = useState(0);
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchPersonalAndLoadData = useCallback(async () => {
    setLoading(true);
    setRegistrador(null);
    setPorcentajeFinal(0);
    setImagenFile(null);
    setImagenPreview(null);
    setErrorMsg("");
    setSuccessMsg("");
    
    // 1. Fetch de Personal (incluyendo trabajando: true/false)
    const { data: personal, error: personalError } = await supabase
      .from("personal")
      .select("id, nombre, apellidos, trabajando");

    if (personalError) {
      console.error("Error fetching all personal:", personalError);
      setErrorMsg("Error al cargar la lista de personal.");
      setLoading(false);
      return;
    }
    setAllPersonal(personal);

    // 2. Cargar borrador (si existe)
    if (registroDiario) {
      // Intentar preseleccionar al registrador que inició el día
      const initialRegistrador = personal.find(p => p.id === registroDiario.registrador_id);
      if(initialRegistrador) {
        setRegistrador(initialRegistrador);
      }
      
      // Cargar porcentaje y URL final si ya existe un borrador previo
      if (registroDiario.porcentaje_final !== null) {
        setPorcentajeFinal(registroDiario.porcentaje_final);
      }
      if (registroDiario.url_final) {
        setImagenPreview(registroDiario.url_final);
      }
    }

    setLoading(false);
  }, [registroDiario]);

  useEffect(() => {
    if (isOpen && registroDiario) {
      // Frase de motivación aleatoria
      setMotivacion(
        frasesAleatorias[Math.floor(Math.random() * frasesAleatorias.length)]
      );
      fetchPersonalAndLoadData();
    }
  }, [isOpen, registroDiario, fetchPersonalAndLoadData]);


  // Funciones de Carga de Imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagenFile(file);
      setImagenPreview(URL.createObjectURL(file));
      setErrorMsg("");
      setSuccessMsg("");
    }
  };

  const handleOpenFileInput = () => {
    fileInputRef.current.click();
  };

  // Función de guardado del porcentaje final
  const handleGuardarLlegada = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    // 1. Validaciones
    if (!registroDiario || !registroDiario.id) {
        setErrorMsg("Error: El registro del día inicial no fue encontrado.");
        return;
    }
    if (!registrador) {
      setErrorMsg("Debes seleccionar quién está registrando el porcentaje final.");
      return;
    }
    const finalPorcentaje = Number(porcentajeFinal);
    if (finalPorcentaje < 0 || finalPorcentaje > 100) {
      setErrorMsg("El porcentaje final debe estar entre 0 y 100.");
      return;
    }
    if (!imagenFile && !registroDiario.url_final) {
      setErrorMsg("Debes subir una fotografía del porcentaje final.");
      return;
    }

    setIsSubmitting(true);
    let imageUrl = registroDiario.url_final; // Usar la URL existente por defecto

    try {
      // 2. Subida de Imagen a Storage (solo si hay un nuevo archivo)
      if (imagenFile) {
        const fileExtension = imagenFile.name.split(".").pop();
        const fileName = `${Date.now()}_${registrador.id}_final.${fileExtension}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("fotos_diarias") // Usar el nombre del bucket de Storage
          .upload(fileName, imagenFile, {
            cacheControl: "3600",
            upsert: true, // Permitir sobrescribir si el nombre es el mismo (aunque usamos Date.now() para unicidad)
          });

        if (uploadError) {
          throw new Error(`Error al subir la imagen: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("fotos_diarias").getPublicUrl(uploadData.path);
        imageUrl = publicUrl;
      }

      // 3. Actualizar el registro en porcentaje_diario (solo porcentaje y url final)
      const updateData = {
          porcentaje_final: finalPorcentaje,
          url_final: imageUrl,
          registrador_final_id: registrador.id, // Nuevo campo si lo tienes, o reutilizar registrador_id si el campo original es para quien inicia. Usaremos registrador_id para simpleza, pero la petición solo pide actualizar la fila.
      };
      
      const { error: updateError } = await supabase
        .from("porcentaje_diario")
        .update(updateData)
        .eq("id", registroDiario.id);

      if (updateError) {
        throw new Error(
          `Error al guardar el porcentaje final: ${updateError.message}`
        );
      }

      // 4. Éxito: Cerrar este modal y abrir el de actividades
      setSuccessMsg("Porcentaje de llegada registrado. Abriendo actividades...");
      
      setTimeout(() => {
        onClose();
        onSuccessAndOpenActivities(registrador.id, `${registrador.nombre} ${registrador.apellidos}`);
      }, 1000);

    } catch (error) {
      console.error("Error al guardar la llegada:", error);
      setErrorMsg(`Error al guardar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !registroDiario) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all duration-300">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-2xl font-bold text-[#e43264] flex items-center gap-2">
            <Icon icon="line-md:time-lapse-twotone-loop" width="28" />
            Fin del Día: Porcentaje de Llegada
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-600 transition-colors"
            disabled={isSubmitting}
          >
            <Icon icon="line-md:close" width="24" />
          </button>
        </div>
        
        {loading ? (
            <div className="text-center p-8">
                <Icon icon="line-md:loading-loop" width="40" className="text-[#e43264] mx-auto" />
                <p className="mt-2 text-gray-600">Cargando personal...</p>
            </div>
        ) : (
            <div className="space-y-6">
                {/* SECCIÓN 1: Frase Aleatoria */}
                <div className="bg-yellow-100 p-4 rounded-lg shadow-inner border-l-4 border-yellow-500">
                    <h4 className="text-lg font-semibold text-yellow-700 mb-1">
                        ¡Casi Terminamos!
                    </h4>
                    <p className="italic text-gray-700 text-md">{motivacion}</p>
                </div>

                {/* SECCIÓN 2: Quién Registra */}
                <div>
                    <label className="block text-lg font-medium text-gray-700 mb-2">
                        ¿Quién está registrando? (Personal Activo)
                    </label>
                    <PersonalSearchForCierre
                        onSelect={setRegistrador}
                        allPersonal={allPersonal}
                        disabled={isSubmitting}
                    />
                    {registrador ? (
                        <p className="mt-2 text-md font-semibold text-[#6432e4] p-2 bg-indigo-50 rounded-lg">
                            Registrador: {registrador.nombre} {registrador.apellidos}
                        </p>
                    ) : (
                        <p className="mt-2 text-sm text-gray-500">
                            Busca y selecciona al personal que está cerrando.
                        </p>
                    )}
                </div>

                {/* SECCIÓN 3: Porcentaje de Llegada */}
                <div>
                    <label className="block text-lg font-medium text-gray-700 mb-2">
                        Porcentaje de Llegada (0-100)
                    </label>
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
                        className="w-full p-2 text-center text-xl font-bold border-2 border-red-400 rounded-lg focus:ring-[#e43264] focus:border-[#e43264] transition-all duration-200"
                    />
                </div>

                {/* SECCIÓN 4: Subida de Fotografía */}
                <div>
                    <label className="block text-lg font-medium text-gray-700 mb-2">
                        Fotografía del Porcentaje Final
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment" // Habilita la cámara en dispositivos móviles
                        onChange={handleImageChange}
                        ref={fileInputRef}
                        className="hidden"
                    />
                    <button
                        onClick={handleOpenFileInput}
                        className="flex items-center justify-center w-full p-3 gap-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-200"
                        disabled={isSubmitting}
                    >
                        <Icon
                            icon={
                                imagenFile || imagenPreview
                                    ? "line-md:image-twotone"
                                    : "line-md:cloud-alt-upload-twotone-loop"
                            }
                            width="24"
                        />
                        {imagenFile || imagenPreview ? "Cambiar Foto" : "Subir/Tomar Foto"}
                    </button>
                    {imagenPreview && (
                        <div className="mt-3 text-center">
                            <img
                                src={imagenPreview}
                                alt="Previsualización"
                                className="max-w-full max-h-48 mx-auto rounded-lg shadow-lg object-cover border border-gray-200"
                            />
                        </div>
                    )}
                </div>

                {/* Mensajes de Estado */}
                {errorMsg && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-lg border border-red-300">
                        <p className="font-medium flex items-center gap-2">
                            <Icon icon="line-md:alert-circle" width="20" /> {errorMsg}
                        </p>
                    </div>
                )}
                {successMsg && (
                    <div className="p-3 bg-green-100 text-green-700 rounded-lg border border-green-300">
                        <p className="font-medium flex items-center gap-2">
                            <Icon icon="line-md:check-all" width="20" /> {successMsg}
                        </p>
                    </div>
                )}
            </div>
        )}

        {/* Botón de Guardar */}
        <div className="mt-6 pt-4 border-t flex justify-end">
          <button
            onClick={handleGuardarLlegada}
            disabled={isSubmitting || loading || !registrador}
            className="flex items-center gap-2 px-6 py-2 bg-[#e43264] text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Icon
              icon={isSubmitting ? "line-md:loading-loop" : "line-md:confirm"}
              width="24"
            />
            {isSubmitting ? "Guardando..." : "Guardar y Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
};