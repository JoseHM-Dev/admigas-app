import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';

export const BtnAyuda = ({ texto, isDropdown, services, iconName }) => { 
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // ... (El resto de tus funciones handleServiceClick y handleClickOutside quedan IGUAL) ...
  const handleServiceClick = (service) => {
    if (service === 'Ventas') navigate('/ventas');
    if (service === 'Clientes') navigate('/clientes');
    if (service === 'Créditos') navigate('/creditos');
    if (service === 'Administración') navigate('/administracion');
    setIsOpen(false);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- AQUÍ ESTÁ LA SOLUCIÓN ---
  const ButtonContent = () => (
    <span className="flex items-center gap-2 min-h-6"> 
      {/* 1. Usamos 'min-w' en un contenedor para reservar el espacio del icono 
            antes de que cargue. 
         2. O fijamos width y height directamente en el componente Icon.
      */}
      {iconName && (
        <div className="flex items-center justify-center w-6 h-6">
           <Icon 
             icon={iconName} 
             width="24" 
             height="24" 
             className="text-xl shrink-0" 
           />
        </div>
      )}
      
      <span className="whitespace-nowrap">{texto}</span>
    </span>
  );

  if (isDropdown) {
    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <div>
          <button
            type="button"
            // Eliminamos transition-none y ajustamos hover para consistencia
            className="bg-black/25 rounded-[20px] px-4 py-2 shadow-lg hover:shadow-2xl hover:cursor-pointer text-black/70 font-medium hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ButtonContent />
          </button>
        </div>

        {isOpen && (
          <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white divide-y divide-gray-100 focus:outline-none ring-1 ring-black/30 ring-opacity-5 z-50">
            <div className="py-1">
              {services.map((service) => (
                <a
                  key={service}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleServiceClick(service);
                  }}
                  className="block px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:translate-x-1.5 hover:-translate-y-0.5 hover:text-white transition-all duration-150 hover:cursor-pointer"
                >
                  {service}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Versión NO Dropdown
  return (
    <section className="bg-black/25 rounded-[20px] px-4 py-2 shadow-lg hover:shadow-2xl hover:cursor-pointer hover:bg-black/40 transition-all duration-200 text-black/70 font-medium hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5">
      <ButtonContent />
    </section>
  );
};