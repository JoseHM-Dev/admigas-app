import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import ModalPersonal from "./ModalPersonal";

const frasesMotivacion = [
  "¡El éxito es la suma de pequeños esfuerzos repetidos día tras día!",
  "Un nuevo día, una nueva oportunidad para brillar. ¡A por ello!",
  "Que tu esfuerzo de hoy sea la semilla del éxito de mañana. ¡Empecemos!",
  "La mejor forma de predecir el futuro es creándolo. ¡Hoy lo creamos!",
  "Hoy es el día perfecto para empezar a vivir tus sueños. ¡Actívate!",
];

// Componente de Búsqueda de Personal (Reutilizable)
const PersonalSearch = ({
  onSelect,
  excludeIds = [],
  allPersonal = [],
  onSavePersonal,
  disabled,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtrar los resultados para excluir a los que ya están seleccionados
  const filteredPersonal = useMemo(() => {
    return allPersonal.filter(
      (p) =>
        // Excluir IDs ya seleccionados y filtrar por término de búsqueda
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

    if (term.length > 0) {
      setSearchResults(filteredPersonal);
    } else {
      setSearchResults([]);
    }
  };

  const handleSaveAndClose = () => {
    setIsModalOpen(false);
    onSavePersonal(); // Llama a la función para recargar el personal en el componente padre
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Buscar personal por nombre o apellido..."
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

      {/* Opción para Agregar Personal si no se encuentra */}
      {searchTerm.length > 0 && searchResults.length === 0 && (
        <div className="mt-2 flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-700">
            "{searchTerm}" no encontrado.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center text-xs px-2 py-1 bg-[#6432e4] text-white rounded-md hover:opacity-90 transition-opacity"
          >
            <Icon icon="line-md:plus-circle-twotone" width="16" />
            Agregar
          </button>
        </div>
      )}

      {/* Modal para Agregar Personal (Reutilizado de MainAjustes) */}
      <ModalPersonal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        personalData={null} // Siempre en modo "Nuevo"
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
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Cargar todo el personal al inicio
  const fetchAllPersonal = useCallback(async () => {
    // Limpiar listas temporalmente para evitar que el personal antiguo aparezca si hay un error
    setAllPersonal([]);
    setPersonalAbordo([]);
    setLoading(true);

    const { data, error } = await supabase
      .from("personal")
      .select("id, nombre, apellidos, trabajando");

    if (error) {
      console.error("Error fetching all personal:", error);
      setErrorMsg("Error al cargar la lista de personal.");
    } else {
      setAllPersonal(data);
      // Cargar personal que ya está "trabajando" al iniciar el modal
      const aBordo = data.filter((p) => p.trabajando);
      setPersonalAbordo(aBordo);
      // Si solo hay una persona a bordo, la preselecciona como registrador
      if (aBordo.length === 1) {
        setRegistradorId(aBordo[0].id);
      }
    }
    setLoading(false);
  }, []);

  // Recargar personal si el modal está abierto (e.g., después de agregar uno nuevo)
  const handleReloadPersonal = useCallback(() => {
    fetchAllPersonal();
  }, [fetchAllPersonal]);

  useEffect(() => {
    if (isOpen) {
      // Frase de motivación aleatoria
      setMotivacion(
        frasesMotivacion[Math.floor(Math.random() * frasesMotivacion.length)]
      );
      fetchAllPersonal();
      setErrorMsg("");
      setSuccessMsg("");
    } else {
      // Limpiar estados al cerrar
      setPersonalAbordo([]);
      setPorcentajeInicial(0);
      setRegistradorId("");
      setImagenFile(null);
      setImagenPreview(null);
    }
  }, [isOpen, fetchAllPersonal]);

  // Funciones de Personal Abordo
  const handleSelectPersonal = (person) => {
    setPersonalAbordo((prev) => {
      // Evitar duplicados
      if (!prev.find((p) => p.id === person.id)) {
        return [...prev, person];
      }
      return prev;
    });
    setSuccessMsg("");
  };

  const handleRemovePersonal = (id) => {
    setPersonalAbordo((prev) => prev.filter((p) => p.id !== id));
    setSuccessMsg("");
  };

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

  // Función Principal de Guardado
  const handleGuardarNuevoDia = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    // --- 0. PRE-VALIDACIÓN DE EXISTENCIA ---
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayDateString = `${year}-${month}-${day}`; // YYYY-MM-DD

    const { data: existingEntry, error: checkError } = await supabase
      .from("porcentaje_diario")
      .select("id")
      .eq("fecha", todayDateString)
      .maybeSingle();

    if (checkError) {
      console.error("Error al verificar inicio de día:", checkError);
      setErrorMsg(`Error al verificar inicio de día: ${checkError.message}`);
      return;
    }

    if (existingEntry) {
      setErrorMsg(
        "El día ya fue iniciado previamente. Por favor, usa la opción 'Fin de Día' para modificar o cerrar."
      );
      return;
    }

    // 1. Validaciones
    if (personalAbordo.length === 0) {
      setErrorMsg("Debes seleccionar al menos una persona que esté a bordo.");
      return;
    }
    if (!registradorId) {
      setErrorMsg("Debes seleccionar un registrador de porcentaje.");
      return;
    }
    const finalPorcentaje = Number(porcentajeInicial);
    if (finalPorcentaje < 0 || finalPorcentaje > 100) {
      setErrorMsg("El porcentaje inicial debe estar entre 0 y 100.");
      return;
    }
    if (!imagenFile) {
      setErrorMsg("Debes subir una fotografía del porcentaje inicial.");
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      // 2. Subida de Imagen a Storage
      const fileExtension = imagenFile.name.split(".").pop();
      const fileName = `${Date.now()}_${registradorId}_inicial.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("fotos_diarias") // Usar el nombre del bucket de Storage
        .upload(fileName, imagenFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Error al subir la imagen: ${uploadError.message}`);
      }

      // Obtener URL pública (asumiendo que el bucket es público o configurado para acceso público temporal)
      const {
        data: { publicUrl },
      } = supabase.storage.from("fotos_diarias").getPublicUrl(uploadData.path);
      imageUrl = publicUrl;

      // 3. Actualizar la columna 'trabajando' en la tabla 'personal'

      // Poner en true a los seleccionados
      const personalIdsToSetTrue = personalAbordo.map((p) => p.id);

      const { error: updateTrueError } = await supabase
        .from("personal")
        .update({ trabajando: true })
        .in("id", personalIdsToSetTrue);

      if (updateTrueError) {
        console.warn(
          "Advertencia: No se pudieron actualizar todos los estados 'trabajando' (TRUE):",
          updateTrueError
        );
      }

      // Poner en false a los que NO están seleccionados.
      const notAbordoIds = allPersonal
        .map((p) => p.id)
        .filter((id) => !personalIdsToSetTrue.includes(id));

      if (notAbordoIds.length > 0) {
        const { error: updateFalseError } = await supabase
          .from("personal")
          .update({ trabajando: false })
          .in("id", notAbordoIds);

        if (updateFalseError) {
          console.warn(
            "Advertencia: No se pudieron actualizar todos los estados 'trabajando' (FALSE):",
            updateFalseError
          );
        }
      }

      // 4. Guardar el registro en porcentaje_diario
      const { error: insertError } = await supabase
        .from("porcentaje_diario")
        .insert([
          {
            porcentaje_inicial: finalPorcentaje,
            url_inicial: imageUrl,
            registrador_id: registradorId,
            // La columna 'fecha' se llena con la fecha actual de la base de datos o la enviada,
            // aseguramos que sea la fecha de hoy.
            fecha: todayDateString,
          },
        ]);

      if (insertError) {
        throw new Error(
          `Error al guardar el porcentaje diario: ${insertError.message}`
        );
      }

      // 5. Éxito
      setSuccessMsg("¡Día iniciado exitosamente! Se guardó la información.");
      // Usamos setTimeout para mostrar el éxito brevemente antes de cerrar
      setTimeout(() => {
        onDiaGuardado();
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error al iniciar el día:", error);
      setErrorMsg(`Error al guardar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const personalAbordoIds = personalAbordo.map((p) => p.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all duration-300">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-2xl font-bold text-[#6432e4] flex items-center gap-2">
            <Icon icon="line-md:calendar-outline-loop" width="28" />
            Inicio de Nuevo Día
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-600 transition-colors"
          >
            <Icon icon="line-md:close" width="24" />
          </button>
        </div>

        <div className="space-y-6">
          {/* SECCIÓN 1: Frase de Motivación */}
          <div className="bg-green-100 p-4 rounded-lg shadow-inner border-l-4 border-green-500">
            <h4 className="text-lg font-semibold text-green-700 mb-1">
              ¡Buenos Días!
            </h4>
            <p className="italic text-gray-700 text-md">{motivacion}</p>
          </div>

          {/* SECCIÓN 2: Quién está a bordo */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              ¿Quién está a bordo hoy?
            </label>
            <PersonalSearch
              onSelect={handleSelectPersonal}
              excludeIds={personalAbordoIds}
              allPersonal={allPersonal}
              onSavePersonal={handleReloadPersonal} // Propiedad para recargar personal
              disabled={loading}
            />
            <div className="mt-3 flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg min-h-10 border">
              {personalAbordo.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center bg-[#6432e4] text-white text-sm px-3 py-1 rounded-full shadow-md"
                >
                  {p.nombre} {p.apellidos.charAt(0)}.
                  <button
                    onClick={() => handleRemovePersonal(p.id)}
                    className="ml-2 text-red-200 hover:text-red-400"
                  >
                    <Icon icon="line-md:close" width="16" />
                  </button>
                </div>
              ))}
              {personalAbordo.length === 0 && (
                <p className="text-gray-400 text-sm">
                  Usa el buscador para añadir personal.
                </p>
              )}
            </div>
          </div>

          {/* SECCIÓN 3: Porcentaje Inicial */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              ¿Con cuánto porcentaje inicias? (0-100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={porcentajeInicial}
              onChange={(e) =>
                setPorcentajeInicial(
                  Math.min(100, Math.max(0, Number(e.target.value)))
                )
              }
              className="w-full p-2 text-center text-xl font-bold border-2 border-indigo-400 rounded-lg focus:ring-[#6432e4] focus:border-[#6432e4] transition-all duration-200"
            />
          </div>

          {/* SECCIÓN 4: Registrador de Porcentaje */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Registrador de Porcentaje
            </label>
            <select
              value={registradorId}
              onChange={(e) => setRegistradorId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-[#6432e4] focus:border-[#6432e4] transition-all duration-200 bg-white"
              disabled={personalAbordo.length === 0}
            >
              <option value="">Selecciona quién registra</option>
              {personalAbordo.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellidos}
                </option>
              ))}
            </select>
            {personalAbordo.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                Debes seleccionar personal a bordo primero.
              </p>
            )}
          </div>

          {/* SECCIÓN 5: Subida de Fotografía */}
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Fotografía del Porcentaje Inicial
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
            >
              <Icon
                icon={
                  imagenFile
                    ? "line-md:image-twotone"
                    : "line-md:cloud-alt-upload-twotone-loop"
                }
                width="24"
              />
              {imagenFile ? "Cambiar Foto" : "Subir/Tomar Foto"}
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

        {/* Botón de Guardar */}
        <div className="mt-6 pt-4 border-t flex justify-end">
          <button
            onClick={handleGuardarNuevoDia}
            disabled={isSubmitting || personalAbordo.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-[#6432e4] text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Icon
              icon={isSubmitting ? "line-md:loading-loop" : "line-md:confirm"}
              width="24"
            />
            {isSubmitting ? "Guardando..." : "Guardar Inicio de Día"}
          </button>
        </div>
      </div>
    </div>
  );
};
