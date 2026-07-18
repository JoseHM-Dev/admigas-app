import LogoTechnoArt from "../../assets/img/icono technoart negro.png";
import LogoLetrasTechnoArt from "../../assets/img/letras techno arte.png";
import { Icon } from "@iconify/react";
import LogoTransparente from "../../assets/img/LP.png";


export const Footer = () => {
  return (
    <main>
      {/* --- FOOTER SECTION --- */}
            <footer className="w-full bg-blue-900 text-white pt-16 pb-8">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="flex flex-col items-center md:items-start">
                  <img className="h-20 object-contain drop-shadow-md mb-4" src={LogoTransparente} alt="Logo AdmiGas" />
                  <p className="text-blue-200 text-sm text-center md:text-left max-w-xs leading-relaxed">
                    Soluciones tecnológicas de vanguardia para el control y administración integral de Gas LP.
                  </p>
                </div>
      
                <div className="flex flex-col items-center md:items-start">
                  <h4 className="text-lg font-bold mb-5 text-sky-400 uppercase tracking-wider">Contacto</h4>
                  <div className="space-y-4 text-blue-100 text-sm">
                    <p className="flex items-center gap-3 hover:text-white transition-colors">
                      <Icon icon="mdi:web" width="22" className="text-sky-400" /> <a href="https://technoart.com.mx" target="_blank" rel="noopener noreferrer">technoart.com.mx</a>
                    </p>
                    <p className="flex items-center gap-3 hover:text-white transition-colors">
                      <Icon icon="mdi:whatsapp" width="22" className="text-sky-400" /> <a href="https://wa.me/5215521758607" target="_blank" rel="noopener noreferrer">5521758607</a>
                    </p>
                    <p className="flex items-center gap-3 hover:text-white transition-colors break-all">
                      <Icon icon="mdi:email-outline" width="22" className="text-sky-400" /> <a href="mailto:contacto@technoart.com.mx">contacto@technoart.com.mx</a>
                    </p>
                  </div>
                </div>
      
                <div className="flex flex-col items-center md:items-start">
                  <h4 className="text-lg font-bold mb-5 text-sky-400 uppercase tracking-wider">Síguenos</h4>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <a href="https://www.facebook.com/profile.php?id=61580540152316" target="_blank" rel="noopener noreferrer" className="bg-blue-800 p-3 rounded-full hover:bg-sky-500 hover:scale-110 transition-all text-white"><Icon icon="mdi:facebook" width="22" /></a>
                    <a href="https://www.instagram.com/technoart.studio/" target="_blank" rel="noopener noreferrer" className="bg-blue-800 p-3 rounded-full hover:bg-pink-500 hover:scale-110 transition-all text-white"><Icon icon="mdi:instagram" width="22" /></a>
                    <a href="https://x.com/TechnoArt22" target="_blank" rel="noopener noreferrer" className="bg-blue-800 p-3 rounded-full hover:bg-sky-400 hover:scale-110 transition-all text-white"><Icon icon="mdi:twitter" width="22" /></a>
                    <a href="https://www.tiktok.com/@technoart22?lang=es" target="_blank" rel="noopener noreferrer" className="bg-blue-800 p-3 rounded-full hover:bg-black hover:scale-110 transition-all text-white"><Icon icon="ic:baseline-tiktok" width="22" /></a>
                    <a href="https://www.threads.com/@technoart.studio?hl=es-la" target="_blank" rel="noopener noreferrer" className="bg-blue-800 p-3 rounded-full hover:bg-gray-800 hover:scale-110 transition-all text-white"><Icon icon="simple-icons:threads" width="22" /></a>
                    <a href="https://www.linkedin.com/company/112591192/admin/dashboard/" target="_blank" rel="noopener noreferrer" className="bg-blue-800 p-3 rounded-full hover:bg-blue-600 hover:scale-110 transition-all text-white"><Icon icon="mdi:linkedin" width="22" /></a>
                  </div>
                </div>
              </div>
      
              <div className="border-t border-blue-800 mt-12 pt-8 text-center text-blue-300 text-xs px-6">
                &copy; {new Date().getFullYear()} TechnoArt Studio. Todos los derechos reservados.
              </div>
            </footer>
    </main>
  );
};
