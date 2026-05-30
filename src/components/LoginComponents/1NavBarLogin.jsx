import LogoAdmiGas from "../../assets/img/icono-logo.png";
import LetrasAdmiGas from "../../assets/img/letras-logo.png";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";

export const NavBarLogin = () => {
  const navigate = useNavigate();
  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      <section className="font-medium flex flex-col w-full max-w-[1400px] justify-between m-auto items-center gap-3 p-4 transition-all duration-300 sm:flex-row sm:px-8 lg:px-16">
        
        {/* LOGO */}
        <div
          onClick={() => navigate("/*")}
          className="flex hover:scale-105 transition-all duration-300 items-center gap-3 hover:cursor-pointer"
        >
          <img className="h-14 sm:h-16 object-contain" src={LogoAdmiGas} alt="AdmiGas Logo" />
          <img className="h-7 sm:h-8 object-contain hidden sm:block" src={LetrasAdmiGas} alt="AdmiGas Letras" />
        </div>

        {/* BOTONES DERECHA */}
        <div className="relative group gap-6 items-center flex w-full justify-center sm:w-auto sm:justify-end">
          <a
            href="https://wa.me/5215521758607"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-2 text-slate-600 hover:text-sky-500 font-bold transition-colors"
          >
            <Icon icon="mdi:whatsapp" width="22" />
            Soporte
          </a>
          <Link to="/Home" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-600 hover:text-blue-900 hover:border-blue-900 hover:bg-blue-50 font-bold py-2.5 px-6 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5">
              <Icon icon="mdi:arrow-left" width="20" /> 
              <span className="hidden sm:inline">Volver al Inicio</span>
              <span className="sm:hidden">Inicio</span>
            </button>
          </Link>
        </div>
      </section>
    </header>
  );
};
