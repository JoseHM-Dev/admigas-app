import { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../auth/useAuth";
import { Icon } from "@iconify/react"; 

const ModalUnidad = ({ isOpen, onClose, unidadData, onSave }) => {
  const { personal, appUser } = useAuth();
  const [formData, setFormData] = useState({
    empresa: "",
    num_unidad: "",
    capacidad: "",
    permiso_reparto: "",
    telefono_1: "",
    telefono_2: "",
    telefono_3: "",
    telefono_4: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (unidadData) {
        setFormData({
          empresa: unidadData.empresa || "",
          num_unidad: unidadData.num_unidad || "",
          capacidad: unidadData.capacidad || "",
          permiso_reparto: unidadData.permiso_reparto || "",
          telefono_1: unidadData.telefono_1 || "",
          telefono_2: unidadData.telefono_2 || "",
          telefono_3: unidadData.telefono_3 || "",
          telefono_4: unidadData.telefono_4 || "",
        });
      } else {
        setFormData({
          empresa: "",
          num_unidad: "",
          capacidad: "",
          permiso_reparto: "",
          telefono_1: "",
          telefono_2: "",
          telefono_3: "",
          telefono_4: "",
        });
      }
      setError("");
    }
  }, [unidadData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const datosParaEnviar = { ...formData };
    Object.keys(datosParaEnviar).forEach((key) => {
      if (datosParaEnviar[key] === "") {
        datosParaEnviar[key] = null;
      }
    });

    let errorResult = null;

    try {
      if (unidadData) {
        const { error } = await supabase
          .from("unidad")
          .update(datosParaEnviar)
          .eq("id", unidadData.id);
        errorResult = error;
      } else {
        const { error } = await supabase.from("unidad").insert({
          ...datosParaEnviar,
          app_users_id: appUser.id,
          personal_id: personal ? personal.id : null,
        });
        errorResult = error;
      }

      if (errorResult) throw errorResult;

      onSave();
      onClose();
    } catch (err) {
      console.error("Error saving data:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm p-4 transition-all duration-300">
      
      {/* CAMBIOS AQUÍ: flex flex-col y max-h-[90vh] */}
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header (shrink-0 para que no se aplaste) */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon
                icon="mdi:truck-fast-outline"
                className="text-white w-8 h-8"
              />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">
              {unidadData ? "Editar Unidad" : "Registrar Unidad"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        {/* CAMBIO AQUÍ: overflow-y-auto en el FORM para que solo esto haga scroll */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sección: Información General */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b pb-1 mb-3 flex items-center gap-2">
                <Icon icon="mdi:information-outline" /> Datos Generales
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup
                  label="Empresa"
                  icon="mdi:domain"
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleChange}
                  placeholder="Ej. Gas Express"
                />
                <InputGroup
                  label="Número Económico"
                  icon="mdi:numeric"
                  name="num_unidad"
                  value={formData.num_unidad}
                  onChange={handleChange}
                  placeholder="Ej. U-45"
                />
                <InputGroup
                  label="Capacidad (Lts)"
                  icon="mdi:beaker-outline"
                  name="capacidad"
                  value={formData.capacidad}
                  onChange={handleChange}
                  placeholder="Ej. 5000"
                />
                <InputGroup
                  label="Permiso CRE"
                  icon="mdi:file-document-outline"
                  name="permiso_reparto"
                  value={formData.permiso_reparto}
                  onChange={handleChange}
                  placeholder="LP/1234/..."
                />
              </div>
            </div>

            {/* Sección: Contacto */}
            <div className="space-y-4 md:col-span-2 mt-2">
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b pb-1 mb-3 flex items-center gap-2">
                <Icon icon="mdi:phone-classic" /> Teléfonos de Contacto
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((num) => (
                  <InputGroup
                    key={num}
                    label={`Teléfono ${num}`}
                    icon="mdi:phone"
                    name={`telefono_${num}`}
                    value={formData[`telefono_${num}`]}
                    onChange={handleChange}
                    placeholder="55..."
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="mt-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded-r">
              <Icon icon="mdi:alert-circle" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-200 outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`
                px-6 py-2.5 rounded-lg text-white font-medium shadow-lg shadow-blue-500/30
                flex items-center gap-2 transition-all transform active:scale-95
                ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5"
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <Icon icon="line-md:loading-loop" />{" "}
                  Guardando...
                </>
              ) : (
                <>
                  <Icon icon="mdi:content-save-check" /> Guardar Unidad
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InputGroup = ({
  label,
  icon,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}) => (
  <div className="group">
    <label
      htmlFor={name}
      className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1"
    >
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
        <Icon icon={icon} width="20" />
      </div>
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm"
      />
    </div>
  </div>
);

export default ModalUnidad;