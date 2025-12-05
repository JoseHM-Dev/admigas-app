import LogoAdmiGas from "../../assets/img/icono-logo.png";
import LetrasAdmiGas from "../../assets/img/letras-logo.png";
import { Link, useNavigate } from "react-router-dom";
import { BtnAyuda } from "../ui/BtnAyuda";

export const NavBarLogin = () => {
  const navigate = useNavigate();
  return (
    <nav className="w-full fixed top-0 left-0 z-50  backdrop-blur-md shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* LOGO */}
          <section
            onClick={() => navigate("/*")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-110"
              src={LogoAdmiGas}
              alt="Logo Icono"
            />
            <img
              className="h-6 w-auto hidden sm:block"
              src={LetrasAdmiGas}
              alt="Admi Gas LP"
            />
          </section>

          {/* BOTONES DERECHA */}
          <section className="flex items-center gap-3">
            <a
              href="http://wa.me/528148054886"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex"
            >
              <BtnAyuda texto={"Soporte"} iconName={"mdi:whatsapp"} />
            </a>
            <Link to="/Home">
              <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors">
                <span className="hidden sm:inline">Volver al Inicio</span>
                <span className="sm:hidden">Inicio</span>
              </button>
            </Link>
          </section>
        </div>
      </div>
    </nav>
  );
};
