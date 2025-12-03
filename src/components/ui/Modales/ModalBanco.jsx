import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import { useAuth } from "../../../auth/useAuth";

const ModalBanco = ({ isOpen, onClose, bancoData, onSave }) => {
  const { personal, appUser } = useAuth();

  const [formData, setFormData] = useState({
    nom_responsable: "",
    apodo: "",
    banco: "",
    cuenta: "",
    clave_int: "",
    num_tarjeta: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (bancoData) {
        setFormData({
          nom_responsable: bancoData.nom_responsable || "",
          apodo: bancoData.apodo || "",
          banco: bancoData.banco || "",
          // Aseguramos que se carguen como String para preservar ceros
          cuenta: bancoData.cuenta ? String(bancoData.cuenta) : "",
          clave_int: bancoData.clave_int ? String(bancoData.clave_int) : "",
          num_tarjeta: bancoData.num_tarjeta
            ? String(bancoData.num_tarjeta)
            : "",
        });
      } else {
        setFormData({
          nom_responsable: "",
          apodo: "",
          banco: "",
          cuenta: "",
          clave_int: "",
          num_tarjeta: "",
        });
      }
      setError("");
    }
  }, [bancoData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Lógica especial para campos numéricos que deben ser texto (Cuenta, Clabe, Tarjeta)
    if (["cuenta", "clave_int", "num_tarjeta"].includes(name)) {
      // Solo permitir dígitos (elimina letras o símbolos)
      const numericValue = value.replace(/[^0-9]/g, "");
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    const datosParaEnviar = { ...formData };

    // Convertir vacíos a null, pero MANTENER LOS STRINGS DE NÚMEROS
    Object.keys(datosParaEnviar).forEach((key) => {
      if (datosParaEnviar[key] === "") {
        datosParaEnviar[key] = null;
      }
    });

    try {
      if (bancoData) {
        const { error: updateError } = await supabase
          .from("datos_bancarios")
          .update(datosParaEnviar)
          .eq("id", bancoData.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("datos_bancarios")
          .insert({
            ...datosParaEnviar,
            app_users_id: appUser.id,
            personal_id: personal ? personal.id : null,
          });
        if (insertError) throw insertError;
      }

      onSave();
      onClose();
    } catch (err) {
      console.error("Error al guardar:", err);
      setError(`Error al guardar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm p-4 transition-all duration-300">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon icon="mdi:bank-outline" className="text-white w-7 h-7" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">
              {bancoData ? "Editar Cuenta" : "Registrar Datos Bancarios"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información del Titular */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b pb-1 mb-3 flex items-center gap-2">
                <Icon icon="mdi:account-details-outline" /> Información del
                Titular
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup
                  label="Nombre del Titular"
                  icon="mdi:account"
                  name="nom_responsable"
                  value={formData.nom_responsable}
                  onChange={handleChange}
                  placeholder="Ej. Juan Pérez"
                  required
                />
                <InputGroup
                  label="Apodo / Alias"
                  icon="mdi:tag-text-outline"
                  name="apodo"
                  value={formData.apodo}
                  onChange={handleChange}
                  placeholder="Ej. Nómina Bancomer"
                  required
                />
              </div>
            </div>

            {/* Datos Financieros - AQUÍ ESTÁ EL CAMBIO CLAVE */}
            <div className="space-y-4 md:col-span-2 mt-2">
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b pb-1 mb-3 flex items-center gap-2">
                <Icon icon="mdi:credit-card-settings-outline" /> Detalles de la
                Cuenta
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup
                  label="Banco"
                  icon="mdi:bank"
                  name="banco"
                  value={formData.banco}
                  onChange={handleChange}
                  placeholder="Ej. BBVA"
                  required
                />

                {/* CAMBIO: type="text", inputMode="numeric", maxLength */}
                <InputGroup
                  label="Número de Cuenta"
                  icon="mdi:file-document-outline"
                  name="cuenta"
                  value={formData.cuenta}
                  onChange={handleChange}
                  placeholder="10 dígitos (acepta ceros al inicio)"
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  required
                />

                <InputGroup
                  label="Clave Interbancaria"
                  icon="mdi:numeric"
                  name="clave_int"
                  value={formData.clave_int}
                  onChange={handleChange}
                  placeholder="18 dígitos"
                  type="text"
                  inputMode="numeric"
                  maxLength={18}
                  required
                />

                <InputGroup
                  label="No. Tarjeta (Opcional)"
                  icon="mdi:credit-card-outline"
                  name="num_tarjeta"
                  value={formData.num_tarjeta}
                  onChange={handleChange}
                  placeholder="16 dígitos"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded-r animate-in fade-in slide-in-from-top-2">
              <Icon icon="mdi:alert-circle" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-lg text-white font-medium shadow-lg flex items-center gap-2 transition-all 
                ${
                  isSaving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:-translate-y-0.5"
                }`}
            >
              {isSaving ? (
                <>
                  <Icon icon="line-md:loading-loop" /> Guardando...
                </>
              ) : (
                <>
                  <Icon icon="line-md:confirm-circle" /> Guardar Cuenta
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Input actualizado para aceptar inputMode y maxLength
const InputGroup = ({
  label,
  icon,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  inputMode,
  maxLength,
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
        inputMode={inputMode} // Clave para teclado numérico en móvil
        maxLength={maxLength} // Limita longitud sin convertir a número
        className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm"
      />
    </div>
  </div>
);

export default ModalBanco;
