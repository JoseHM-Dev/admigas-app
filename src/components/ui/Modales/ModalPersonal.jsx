import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import { useAuth } from "../../../auth/useAuth"; // Importamos el contexto

const ModalPersonal = ({
  isOpen,
  onClose,
  personalData,
  onSave,
  appUser: propAppUser,
}) => {
  // 1. OBTENER USUARIO DEL CONTEXTO (Backup seguro)
  const { appUser: contextAppUser } = useAuth();

  // Usamos el que venga por prop, y si no, usamos el del contexto global
  const currentUser = propAppUser || contextAppUser;

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    telefono: "",
    roll: "ayudante",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (personalData) {
        setFormData({
          nombre: personalData.nombre || "",
          apellidos: personalData.apellidos || "",
          telefono: personalData.telefono || "",
          roll: personalData.roll || "ayudante",
        });
      } else {
        setFormData({
          nombre: "",
          apellidos: "",
          telefono: "",
          roll: "ayudante",
        });
      }
      setError("");
    }
  }, [personalData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);

    // Validación de seguridad
    if (!personalData && !currentUser?.id) {
      setError(
        "Error crítico: No se identificó al usuario principal. Recarga la página."
      );
      setIsSaving(false);
      return;
    }

    // Sanitización de datos
    const datosParaEnviar = { ...formData };
    Object.keys(datosParaEnviar).forEach((key) => {
      if (datosParaEnviar[key] === "") datosParaEnviar[key] = null;
    });

    let errorResult = null;

    try {
      if (personalData) {
        // Actualizar
        const { error } = await supabase
          .from("personal")
          .update(datosParaEnviar)
          .eq("id", personalData.id);
        errorResult = error;
      } else {
        // Insertar (Usando el currentUser detectado)
        const { error } = await supabase
          .from("personal")
          .insert([{ ...datosParaEnviar, app_users_id: currentUser.id }]);
        errorResult = error;
      }

      if (errorResult) throw errorResult;

      onSave();
      onClose();
    } catch (err) {
      console.error("Error guardando:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    // CONTENEDOR GLASSMORPHISM
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
      {/* TARJETA */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        {/* HEADER */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon
                icon="mdi:account-hard-hat"
                className="text-white w-7 h-7"
              />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {personalData ? "Editar Personal" : "Nuevo Integrante"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            {/* NOMBRE */}
            <InputGroup
              label="Nombre(s)"
              icon="mdi:account"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej. Ricardo"
              required
            />

            {/* APELLIDOS */}
            <InputGroup
              label="Apellidos"
              icon="mdi:account-details"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleChange}
              placeholder="Ej. López Pérez"
              required
            />

            {/* TELÉFONO */}
            <InputGroup
              label="Teléfono Móvil"
              icon="mdi:phone"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="10 dígitos"
              type="tel"
              required
            />

            {/* ROL / CARGO */}
            <div className="group">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                Cargo / Rol <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500">
                  <Icon icon="mdi:briefcase-account" width="20" />
                </div>
                <select
                  name="roll"
                  value={formData.roll}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="ayudante">Ayudante General</option>
                  <option value="encargado">Encargado de Unidad</option>
                  <option value="chofer">Chofer</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <Icon icon="mdi:chevron-down" />
                </div>
              </div>
            </div>
          </div>

          {/* ERRORES */}
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded-r animate-pulse">
              <Icon icon="mdi:alert-circle" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* FOOTER BOTONES */}
          <div className="flex justify-end gap-3 pt-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-200 outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`
                px-6 py-2.5 rounded-lg text-white font-medium shadow-lg shadow-blue-500/30
                flex items-center gap-2 transition-all transform active:scale-95
                ${
                  isSaving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5"
                }
              `}
            >
              {isSaving ? (
                <>
                  <Icon icon="line-md:loading-loop" width="24" /> Guardando...
                </>
              ) : (
                <>
                  <Icon icon="line-md:confirm-circle" width="24" /> Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Reutilizable InputGroup
const InputGroup = ({
  label,
  icon,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) => (
  <div className="group">
    <label
      htmlFor={name}
      className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1"
    >
      {label} {required && <span className="text-red-500">*</span>}
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
        required={required}
        className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm"
      />
    </div>
  </div>
);

export default ModalPersonal;
