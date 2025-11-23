import LogoAdmiGas from "../../assets/img/icono-logo.png";
import LetrasAdmiGas from "../../assets/img/letras-logo.png";
import { BtnAyuda } from "./BtnAyuda";
import { Icon } from "@iconify/react";
import { useAuth } from "../../auth/useAuth";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const NavBarUser = () => {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await signOut();
    navigate("/"); // Redirige al Home después de cerrar sesión
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <section className=" font-medium flex flex-col w-screen max-w-[1400px] justify-between m-auto items-center gap-3 p-3 transition-none duration-300  md:flex-row md:justify-between md:items-center md:px-15 ">
      <section onClick={() => navigate('/*')} className="flex hover:scale-110 transition-all duration-300 items-center gap-2 hover:cursor-pointer">
        <img className="h-20" src={LogoAdmiGas} />
        <img className="h-10" src={LetrasAdmiGas} />
      </section>

      <section className="relative group gap-4 items-center  md:flex ">
        <div className="flex items-center gap-6 sm:flex">
          <a href="http://wa.me/528148054886" target="_blank" rel="noopener noreferrer" className="hidden lg:flex">
            
            <BtnAyuda  texto={"Ayuda"} iconName={"line-md:chat-round-dots-twotone"} />
          </a>
          <BtnAyuda
            texto={"Servicios"}
            isDropdown={true}
            services={["Ventas","Clientes", "Créditos", "Administración"]}
            iconName={"line-md:close-to-menu-transition"}
          />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-black/25 rounded-[20px] px-4 py-2 shadow-lg hover:shadow-2xl hover:cursor-pointer hover:bg-black/40 transition-all duration-200 text-black/70 font-medium hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 flex items-center gap-2"
            >
              {user && user.user_metadata && user.user_metadata.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="User Avatar"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <Icon
                  icon="bi:person-circle"
                  width="30"
                  height="30"
                />
              )}
              <span>Mi cuenta</span>
            </button>
            {isDropdownOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white divide-y divide-gray-100 focus:outline-none ring-1 ring-black/30 ring-opacity-5 z-50">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/ajustes');
                      setIsDropdownOpen(false);
                    }}
                    className="block px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:translate-x-1.5 hover:-translate-y-0.5 hover:text-white transition-all duration-150 hover:cursor-pointer"
                    role="menuitem"
                  >
                    Ajustes
                  </a>
                  <a
                    href="#"
                    className="block px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:translate-x-1.5 hover:-translate-y-0.5 hover:text-white transition-all duration-150 hover:cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      handleLogout();
                    }}
                    role="menuitem"
                  >
                    Cerrar Sesión
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
};
