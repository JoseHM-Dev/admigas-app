import { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../auth/useAuth";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Icon } from "@iconify/react";
import { registerLocale } from "react-datepicker";
import es from 'date-fns/locale/es';

// Configuración opcional para poner el calendario en español
registerLocale('es', es);

const ModalTarifa = ({ isOpen, onClose, onSave }) => {
  const { personal, appUser } = useAuth();
  
  // Usamos un objeto único para el estado, igual que en los otros modales
  const [formData, setFormData] = useState({
    fecha_vigente: new Date(),
    nombre: "",
    precio_litro: "",
    factor: "",
    precio_m3: "",
  });
  
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // EFECTO: Calcular Precio M3 automáticamente
  useEffect(() => {
    const litro = parseFloat(formData.precio_litro);
    const factor = parseFloat(formData.factor);

    if (!isNaN(litro) && !isNaN(factor) && factor !== 0) {
      const calculado = (litro * factor).toFixed(2); // Redondeado a 2 decimales
      setFormData(prev => ({ ...prev, precio_m3: calculado }));
    } else {
      // Si borran los datos, limpiamos el calculado
      if (formData.precio_litro === "" || formData.factor === "") {
        setFormData(prev => ({ ...prev, precio_m3: "" }));
      }
    }
  }, [formData.precio_litro, formData.factor]);

  // Resetear formulario al abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        fecha_vigente: new Date(),
        nombre: "",
        precio_litro: "",
        factor: "",
        precio_m3: "",
      });
      setError("");
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, fecha_vigente: date }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Validación manual
    if (!formData.nombre || !formData.precio_litro || !formData.factor) {
        setError("Todos los campos marcados son obligatorios");
        setIsSubmitting(false);
        return;
    }

    try {
      const { error: insertError } = await supabase.from("tarifa").insert([
        {
          nombre: formData.nombre,
          factor: formData.factor,
          fecha_vigente: formData.fecha_vigente,
          precio_litro: formData.precio_litro,
          precio_m3: formData.precio_m3,
          app_users_id: appUser.id,
          personal_id: personal ? personal.id : null,
        },
      ]);

      if (insertError) throw insertError;

      onSave();
      onClose();
    } catch (err) {
      console.error("Error updating tarifas:", err);
      setError(`Error al guardar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black backdrop-blur-sm p-4 transition-all duration-300">
      
      {/* Contenedor Principal */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        
        {/* Encabezado */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon icon="mdi:tag-text-outline" className="text-white w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Nueva Tarifa
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* 1. FECHA (DatePicker customizado) */}
          <div className="group">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                Fecha de Vigencia <span className="text-red-500">*</span>
             </label>
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10 text-gray-400">
                   <Icon icon="mdi:calendar-range" width="20" />
                </div>
                <div className="custom-datepicker-wrapper">
                    <DatePicker
                        selected={formData.fecha_vigente}
                        onChange={handleDateChange}
                        dateFormat="dd/MM/yyyy"
                        locale="es"
                        className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm cursor-pointer"
                    />
                </div>
             </div>
          </div>

          {/* 2. APODO / NOMBRE */}
          <InputGroup
            label="Nombre de Referencia (Apodo)"
            icon="mdi:rename-box"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Ej. Tarifa Enero 2024"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* 3. PRECIO LITRO */}
             <InputGroup
                label="Precio por Litro"
                icon="mdi:gas-station"
                name="precio_litro"
                value={formData.precio_litro}
                onChange={handleChange}
                placeholder="$ 0.00"
                type="number"
                step="0.01"
                required
             />

             {/* 4. FACTOR DE CONVERSIÓN CON TOOLTIP */}
             <div className="group relative">
                <label htmlFor="factor" className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                  Factor Conv. <span className="text-red-500">*</span>
                  
                  {/* Tooltip Icon */}
                  <div className="relative group/tooltip inline-block ml-1">
                    <Icon icon="mdi:information-circle" className="text-blue-400 hover:text-blue-600 cursor-help transition-colors" width="16" />
                    {/* Tooltip Body */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 text-center pointer-events-none">
                       El factor de conversión es usado para calcular el precio por metro cúbico, usualmente usado en lectura de medidores de gas.
                       {/* Flechita abajo del tooltip */}
                       <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                </label>
                
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <Icon icon="mdi:calculator-variant" width="20" />
                   </div>
                   <input
                      type="number"
                      name="factor"
                      id="factor"
                      value={formData.factor}
                      onChange={handleChange}
                      placeholder="Ej. 3.92" // Ejemplo típico de conversión GLP vapor
                      step="0.001"
                      required
                      className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm"
                   />
                </div>
             </div>
          </div>

          {/* 5. PRECIO M3 (CALCULADO / SOLO LECTURA) */}
          <div className="group">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                Precio por M³ (Calculado)
             </label>
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-green-600">
                   <Icon icon="mdi:cash-multiple" width="20" />
                </div>
                <input
                   type="text" // Texto para que no muestre flechitas de número
                   name="precio_m3"
                   value={formData.precio_m3 ? `$ ${formData.precio_m3}` : ''}
                   readOnly
                   placeholder="Se calculará automáticamente..."
                   className="block w-full pl-10 pr-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-green-800 font-semibold focus:outline-none cursor-not-allowed shadow-inner"
                />
             </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-2 rounded-r animate-pulse">
              <Icon icon="mdi:alert-circle" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
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
                ${isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5'
                }
              `}
            >
              {isSubmitting ? (
                 <><Icon icon="line-md:loading-loop" width="24"/> Guardando...</>
              ) : (
                 <><Icon icon="line-md:confirm-circle" width="24" /> Crear Tarifa</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Reutilizamos el InputGroup para mantener consistencia
const InputGroup = ({ label, icon, name, value, onChange, placeholder, type = "text", step, required = false }) => (
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
        step={step}
        required={required}
        className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm"
      />
    </div>
  </div>
);

export default ModalTarifa;