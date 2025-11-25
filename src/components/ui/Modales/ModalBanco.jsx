import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import { useAuth } from '../../../auth/useAuth';

const ModalBanco = ({ isOpen, onClose, bancoData, onSave }) => {
  const { personal } = useAuth();
  
  // Agregamos num_tarjeta al estado inicial
  const [formData, setFormData] = useState({
    nom_responsable: "",
    apodo: "",
    banco: "",
    cuenta: "",
    clave_int: "",
    num_tarjeta: "", // Nuevo campo
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (bancoData) {
        setFormData({
          nom_responsable: bancoData.nom_responsable || "",
          telefono: bancoData.telefono || "",
          apodo: bancoData.apodo || "",
          banco: bancoData.banco || "",
          cuenta: bancoData.cuenta || "",
          clave_int: bancoData.clave_int || "",
          num_tarjeta: bancoData.num_tarjeta || "", // Cargar dato existente
        });
      } else {
        // Resetear formulario para registro nuevo
        setFormData({
          nom_responsable: "",
          apodo: "",
          banco: "",
          cuenta: "",
          clave_int: "",
          num_tarjeta: "",
        });
      }
      setError(""); // Limpiar errores al abrir
    }
  }, [bancoData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    // 1. SANITIZACIÓN DE DATOS (Vital para campos numéricos opcionales)
    // Convertimos cadenas vacías "" a null para que PostgreSQL no devuelva error
    const datosParaEnviar = { ...formData };
    Object.keys(datosParaEnviar).forEach((key) => {
      if (datosParaEnviar[key] === "") {
        datosParaEnviar[key] = null;
      }
    });

    let errorResult = null;

    try {
      if (bancoData) {
        // Actualizar
        const { error: updateError } = await supabase
          .from("datos_bancarios")
          .update(datosParaEnviar)
          .eq("id", bancoData.id);
        errorResult = updateError;
      } else {
        // Insertar
        const { error: insertError } = await supabase
          .from("datos_bancarios")
          .insert({ ...datosParaEnviar, personal_id: personal.id });
        errorResult = insertError;
      }

      if (errorResult) throw errorResult;

      onSave();
      onClose();
    } catch (err) {
      console.error("Error al guardar:", err);
      setError(`Error al guardar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    // Fondo oscuro con efecto Glass (blur)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm p-4 transition-all duration-300">
      
      {/* Contenedor Principal con animación */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        
        {/* Encabezado con Gradiente */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon icon="mdi:bank-outline" className="text-white w-7 h-7" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">
              {bancoData ? "Editar Cuenta" : "Registrar Datos Bancarios"}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sección: Información del Titular */}
            <div className="space-y-4 md:col-span-2">
               <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b pb-1 mb-3 flex items-center gap-2">
                 <Icon icon="mdi:account-details-outline" /> Información del Titular
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
                    label="Apodo / Alias de la Cuenta" 
                    icon="mdi:tag-text-outline" 
                    name="apodo" 
                    value={formData.apodo} 
                    onChange={handleChange} 
                    placeholder="Ej. Nómina Bancomer"
                    required
                 />
               </div>
            </div>

            {/* Sección: Datos Financieros */}
            <div className="space-y-4 md:col-span-2 mt-2">
               <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b pb-1 mb-3 flex items-center gap-2">
                 <Icon icon="mdi:credit-card-settings-outline" /> Detalles de la Cuenta
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
                 <InputGroup 
                    label="Número de Cuenta" 
                    icon="mdi:file-document-outline" 
                    name="cuenta" 
                    value={formData.cuenta} 
                    onChange={handleChange} 
                    placeholder="10 dígitos"
                    type="number"
                    required
                 />
                 <InputGroup 
                    label="Clave Interbancaria" 
                    icon="mdi:numeric" 
                    name="clave_int" 
                    value={formData.clave_int} 
                    onChange={handleChange} 
                    placeholder="18 dígitos"
                    type="number"
                    required
                 />
                 {/* NUEVO CAMPO: Num Tarjeta (Opcional) */}
                 <InputGroup 
                    label="No. Tarjeta (Opcional)" 
                    icon="mdi:credit-card-outline" 
                    name="num_tarjeta" 
                    value={formData.num_tarjeta} 
                    onChange={handleChange} 
                    placeholder="16 dígitos"
                    type="number"
                 />
               </div>
            </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="mt-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded-r animate-in fade-in slide-in-from-top-2">
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
              disabled={isSaving}
              className={`
                px-6 py-2.5 rounded-lg text-white font-medium shadow-lg shadow-blue-500/30
                flex items-center gap-2 transition-all transform active:scale-95
                ${isSaving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5'
                }
              `}
            >
              {isSaving ? (
                 <><Icon icon="line-md:loading-loop" width="24"/> Guardando...</>
              ) : (
                 <><Icon icon="line-md:confirm-circle" width="24" /> Guardar Cuenta</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Reutilizable para Inputs (Mismo estilo que en Unidades)
const InputGroup = ({ label, icon, name, value, onChange, placeholder, type = "text", required = false }) => (
  <div className="group">
    <label htmlFor={name} className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
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

export default ModalBanco;