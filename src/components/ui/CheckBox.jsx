import { useState } from 'react';



const CustomCheckbox = ({ label }) => {
  // 1. Estado para manejar si el checkbox está marcado o no
  const [isChecked, setIsChecked] = useState(false);

  // 2. Función para manejar el cambio (clic)
  const handleChange = () => {
    setIsChecked(!isChecked); // Cambia el estado
  };

  return (
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isChecked} // Controlado por el estado
        onChange={handleChange} // Llama a la función al cambiar
        // Clases de Tailwind para ocultar el estilo nativo y prepararlo para la personalización
        className="form-checkbox h-5 w-5 text-indigo-600 transition duration-150 ease-in-out hidden" 
      />
      
      {/* 3. El Checkbox Personalizado (El cuadrado visual) */}
      <div 
        className={`
          w-5 h-5 border-2 rounded-md flex items-center justify-center 
          transition-all duration-200 ease-in-out
          ${isChecked 
            ? 'bg-indigo-600 border-indigo-600' // Estilos cuando está marcado
            : 'bg-white border-gray-300'       // Estilos cuando no está marcado
          }
        `}
      >
        {/* 4. El ícono de 'check' (solo visible cuando está marcado) */}
        {isChecked && (
          <svg 
            className="w-4 h-4 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth="3" // Hace la línea del check más gruesa
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* 5. El texto de la etiqueta */}
      <span className="text-gray-700 select-none">{label}</span>
    </label>
  );
};

export default CustomCheckbox;