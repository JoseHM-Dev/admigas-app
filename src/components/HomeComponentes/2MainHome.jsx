import LogoTransparente from "../../assets/img/logo-transparente.png";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";

export const MainHome = () => {
  return (
    <main className="flex flex-col items-center bg-slate-50 min-h-screen font-sans w-full">
      
      {/* --- HERO SECTION --- */}
      <section className="flex flex-col items-center w-full max-w-6xl px-6 py-16 md:py-24">
        <div className="relative mb-10">
          <img
            className="h-[180px] w-[180px] sm:h-[220px] sm:w-[220px] object-contain drop-shadow-2xl animate-[float_3s_ease-in-out_infinite]"
            src={LogoTransparente}
            alt="Logo AdmiGas"
          />
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-center text-blue-900 leading-tight max-w-4xl tracking-tight">
          Tu socio confiable en la <span className="text-sky-500">administración</span> de Gas LP
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-500 text-center max-w-2xl font-medium">
          Herramientas digitales diseñadas para optimizar el control, distribución y cobranza de tu empresa gasera.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 mt-10 w-full sm:w-auto">
          <a
            href="https://wa.me/5215521758607"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-lg py-3.5 px-8 rounded-xl shadow-lg shadow-sky-500/30 transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto"
          >
            <Icon icon="mdi:whatsapp" width="24" /> Contactar
          </a>
          <Link to="/Login" className="w-full sm:w-auto">
            <button className="flex items-center justify-center gap-2 bg-white border-2 border-blue-900 text-blue-900 hover:bg-blue-50 font-bold text-lg py-3 px-8 rounded-xl shadow-sm transition-all duration-300 transform hover:-translate-y-1 w-full">
              <Icon icon="mdi:login-variant" width="24" /> Ya soy parte
            </button>
          </Link>
        </div>
      </section>

      {/* --- SECCIÓN SERVICIOS --- */}
      <section className="w-full max-w-7xl px-6 py-16">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-blue-900">
            Nuestros Servicios
          </h2>
          <p className="text-slate-500 mt-3 text-lg font-medium">Soluciones integrales para digitalizar tu negocio</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Tarjeta 1 */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
            <div className="bg-sky-50 p-5 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
              <Icon icon="mdi:account-group-outline" className="text-sky-500 w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-3">Módulo de Gestión de Clientes (CRM)</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Crear un expediente digital completo para cada usuario y administrar sus necesidades ágilmente.
            </p>
          </div>

          {/* Tarjeta 2 */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
            <div className="bg-sky-50 p-5 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
              <Icon icon="mdi:credit-card-outline" className="text-sky-500 w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-3">Administración de Crédito y Cobranza</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Control financiero y análisis de riesgo de crédito detallado para optimizar el flujo de tu empresa.
            </p>
          </div>

          {/* Tarjeta 3 */}
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
            <div className="bg-sky-50 p-5 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
              <Icon icon="mdi:receipt-text-outline" className="text-sky-500 w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-3">Generador de Recibos y Facturas</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Creación de tickets detallados y facturación con base en el consumo o servicio prestado.
            </p>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN COMPROMISO --- */}
      <section className="w-full bg-white border-t border-slate-200 mt-8 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-blue-900">
              Nuestro Compromiso
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-50 p-5 rounded-2xl mb-5 shadow-sm border border-blue-100">
                <Icon icon="mdi:shield-check-outline" className="text-blue-900 w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">Seguridad y Confianza</h3>
              <p className="text-slate-500 font-medium">
                Implementamos altos estándares de seguridad con la finalidad de que tus datos se encuentren en resguardo seguro.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-50 p-5 rounded-2xl mb-5 shadow-sm border border-blue-100">
                <Icon icon="mdi:chart-timeline-variant-shimmer" className="text-blue-900 w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">Eficiencia Operativa</h3>
              <p className="text-slate-500 font-medium">
                Garantizamos una eficiencia con los más altos estándares operativos y automatización de procesos.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-50 p-5 rounded-2xl mb-5 shadow-sm border border-blue-100">
                <Icon icon="mdi:account-wrench-outline" className="text-blue-900 w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">Servicio Personalizado</h3>
              <p className="text-slate-500 font-medium">
                Servicio técnico las 24 hrs, con técnicos capacitados para resolver y atender todo tipo de eventualidad.
              </p>
            </div>
          </div>
        </div>
      </section>

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
