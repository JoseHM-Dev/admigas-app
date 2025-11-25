import LogoAdmiGas from "../../assets/img/icono-logo.png";
import LetrasAdmiGas from "../../assets/img/letras-logo.png";
import { BtnIniciarSesion } from "../ui/BotonIniciarSesion";
import { BotonContactanos } from "../ui/BotonContactanos";
import { Link } from "react-router-dom"; // Importamos Link
import { useNavigate } from "react-router-dom";
import { BtnAyuda } from "../ui/BtnAyuda";
import { Icon } from "@iconify/react";

export const NavBarLogin = () => {
  const navigate = useNavigate();
  return (
    <section className=" font-medium flex flex-col w-screen max-w-[1400px] justify-between m-auto items-center gap-3 p-3 transition-all duration-300  sm:flex-row sm:justify-between sm:items-center sm:px-15 ">
      <section
        onClick={() => navigate("/*")}
        className="flex hover:scale-110 transition-all duration-300 items-center gap-2 hover:cursor-pointer"
      >
        <img className="h-20" src={LogoAdmiGas} />
        <img className="h-10" src={LetrasAdmiGas} />
      </section>

      <section className="relative group gap-4 items-center hidden sm:flex ">
        <a
          href="http://wa.me/528148054886"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:flex"
        >
          <BtnAyuda
            texto={"Ayuda"}
            iconName={"line-md:chat-round-dots-twotone"}
          />
        </a>
        <div className="sm:flex">
          <Link to="/Home">
            <BtnAyuda
              iconName={"material-symbols:home-rounded"}
              texto={"Inicio"}
            />
          </Link>
        </div>
      </section>
    </section>
  );
};
