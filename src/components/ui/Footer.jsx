import LogoTechnoArt from "../../assets/img/icono technoart negro.png";
import LogoLetrasTechnoArt from "../../assets/img/letras techno arte.png";
import { Icon } from "@iconify/react";

export const Footer = () => {
  return (
    <main className="w-100% p-3 ">
      <footer className="relative z-40 flex flex-col max-w-[1400px] m-auto  items-center gap-5 md:flex-row-reverse md:justify-between transition-all duration-300">
        <section className="flex flex-col gap-3 ">
          <h4 className="text-center font-bold text-lg text-black/70 md:text-justify">
            Soporte
          </h4>

          <p className="text-center font-bold text-black/60 md:text-justify">
            Tel.: +52 81 4805 4886
            <br />
            Mail: technoart.creatividad@gamail.com
          </p>
        </section>

        <section className="flex opacity-60 gap-5 cursor-pointer  ">
          <a href="https://www.facebook.com/share/1RetUBfqR1/?mibextid=wwXIfr">
            <Icon
              className="hover:scale-110 transition-all duration-300"
              icon="raphael:facebook"
              width="31"
              height="31"
            />
          </a>

          <a href="https://www.tiktok.com/@technoart98?_r=1&_t=ZS-91ex85Q7srU">
            <Icon
              className="hover:scale-110 transition-all duration-300"
              icon="lineicons:tiktok-alt"
              width="34"
              height="34"
            />
          </a>

          <a href="https://www.instagram.com/technoart.creativity?igsh=MWtwbGQ4eGNobDI4ZQ%3D%3D&utm_source=qr">
            <Icon
              className="hover:scale-110 transition-all duration-300"
              icon="uil:instagram-alt"
              width="32"
              height="32"
            />
          </a>

          <a href="http://wa.me/528148054886">
            <Icon
              className="hover:scale-110 transition-all duration-300"
              icon="uil:whatsapp-alt"
              width="32"
              height="32"
            />
          </a>
        </section>

        <section className="flex flex-col items-center p-3 ">
          <section className="opacity-60 md:flex md:items-center">
            <img className="h-30 w-30" src={LogoTechnoArt} alt="" />
            <img className="h-5 w-30" src={LogoLetrasTechnoArt} alt="" />
          </section>

          <p className="text-center font-bold text-black/60 md:text-center">
            Usted es lo más importante para nosotros
          </p>
        </section>
      </footer>
    </main>
  );
};
