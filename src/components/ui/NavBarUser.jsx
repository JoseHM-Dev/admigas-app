import LogoAdmiGas from "../../assets/img/icono-logo.png";
import LetrasAdmiGas from "../../assets/img/letras-logo.png";
import { Icon } from "@iconify/react";
import { useAuth } from "../../auth/useAuth";
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export const NavBarUser = () => {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isServiciosOpen, setIsServiciosOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const serviciosRef = useRef(null);

  const handleLogout = async () => {
    await signOut();
    navigate("/"); 
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (serviciosRef.current && !serviciosRef.current.contains(event.target)) {
        setIsServiciosOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 50) {
        setIsVisible(false); // Ocultar al bajar
      } else {
        setIsVisible(true);  // Mostrar al subir
      }
      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const menuServicios = [
    { name: "Ventas", path: "/ventas", icon: "mdi:point-of-sale" },
    { name: "Clientes", path: "/clientes", icon: "mdi:account-group" },
    { name: "Créditos", path: "/creditos", icon: "mdi:credit-card-outline" },
    { name: "Administración", path: "/administracion", icon: "mdi:cog-outline" },
  ];

  return (
    <header className={`w-full bg-white shadow-sm sticky z-50 transition-all duration-300 ${isVisible ? 'top-0' : '-top-24'}`}>
      <section className="font-medium flex w-full max-w-[1400px] justify-between m-auto items-center p-3 sm:px-8 lg:px-16">
        
        <div
          onClick={() => navigate("/*")}
          className="flex hover:scale-105 transition-all duration-300 items-center gap-2 sm:gap-3 hover:cursor-pointer"
        >
          <img className="h-10 sm:h-14 object-contain" src={LogoAdmiGas} alt="AdmiGas Logo" />
          <img className="h-5 sm:h-7 object-contain hidden sm:block" src={LetrasAdmiGas} alt="AdmiGas Letras" />
        </div>

        <div className="relative group gap-3 sm:gap-6 items-center flex w-auto justify-end">
          <a
            href="https://wa.me/5215521758607"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-2 text-slate-600 hover:text-sky-500 font-bold transition-colors"
          >
            <Icon icon="mdi:whatsapp" width="22" /> Soporte
          </a>

          {/* --- DESPLEGABLE SERVICIOS --- */}
          <div className="relative" ref={serviciosRef}>
            <button
              onClick={() => setIsServiciosOpen(!isServiciosOpen)}
              className="flex items-center gap-1 sm:gap-2 bg-white border-2 border-slate-200 text-slate-600 hover:text-blue-900 hover:border-blue-900 hover:bg-blue-50 font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Icon icon="mdi:apps" width="20" />
              <span className="hidden sm:inline">Servicios</span>
              <Icon icon="mdi:chevron-down" width="18" className={`hidden sm:block transition-transform duration-200 ${isServiciosOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isServiciosOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 sm:w-56 rounded-xl shadow-lg bg-white border border-slate-100 divide-y divide-slate-100 focus:outline-none z-50 overflow-hidden">
                <div className="py-2">
                  {menuServicios.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => { navigate(s.path); setIsServiciosOpen(false); }}
                      className="w-full text-left flex items-center gap-3 px-5 py-3 text-sm text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                    >
                      <Icon icon={s.icon} width="22" className="text-blue-900" />
                      <span className="font-bold">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* --- MI CUENTA --- */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-1.5 px-3 sm:py-2.5 sm:px-4 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="User Avatar"
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-white"
                />
              ) : (
                <Icon icon="bi:person-circle" width="20" className="sm:w-[22px] sm:h-[22px]" />
              )}
              <span className="hidden sm:inline">Mi cuenta</span>
            </button>

            {isDropdownOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-40 sm:w-48 rounded-xl shadow-lg bg-white border border-slate-100 divide-y divide-slate-100 focus:outline-none z-50 overflow-hidden">
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/ajustes');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition-colors font-semibold"
                  >
                    <Icon icon="mdi:cog" width="20" /> Ajustes
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-semibold"
                  >
                    <Icon icon="mdi:logout" width="20" /> Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </header>
  );
};
