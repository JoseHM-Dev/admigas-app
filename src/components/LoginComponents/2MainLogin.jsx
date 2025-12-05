import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { Icon } from "@iconify/react";
import { Link, useNavigate } from "react-router-dom"; // Agregamos useNavigate
import imgIlustrativaLogin from "../../assets/img/img-ilustrativa-login.png";
import imgTechnoLogo from "../../assets/img/icono technoart negro.png";

export const MainLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); // Para redirigir

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Éxito
      console.log("Sesión iniciada:", data);
      navigate("/dashboard"); // Redirigir al dashboard automáticamente
    } catch (error) {
      alert(`Error de acceso: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 pt-24">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        {/* LADO IZQUIERDO: IMAGEN ILUSTRATIVA */}
        <section className="w-full md:w-1/2 bg-indigo-50 flex flex-col justify-center items-center p-10 relative overflow-hidden">
          {/* Círculos decorativos de fondo */}
          <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-indigo-200 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-[-50px] right-[-50px] w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-50"></div>

          <img
            className="w-3/4 max-w-[280px] object-contain drop-shadow-xl animate-[float_4s_ease-in-out_infinite] z-10"
            src={imgIlustrativaLogin}
            alt="Ilustración Gas"
          />
          <div className="mt-8 text-center z-10">
            <h3 className="text-indigo-900 font-bold text-xl">
              Gestión Inteligente
            </h3>
            <p className="text-indigo-600/80 text-sm mt-2">
              Control total de rutas, ventas y créditos.
            </p>
          </div>
        </section>

        {/* LADO DERECHO: FORMULARIO */}
        <section className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-black text-gray-800">Bienvenido</h1>
              <p className="text-gray-400 text-sm font-medium">
                Ingresa tus credenciales corporativas
              </p>
            </div>
            <img
              src={imgTechnoLogo}
              className="w-10 opacity-30 grayscale"
              alt="TechnoArt"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Usuario */}
            <div className="group">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                  <Icon icon="mdi:email-outline" width="22" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="usuario@admigas.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div className="group">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                  <Icon icon="mdi:lock-outline" width="22" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors outline-none"
                >
                  <Icon
                    icon={
                      showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"
                    }
                    width="20"
                  />
                </button>
              </div>
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.01] active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Icon icon="line-md:loading-loop" width="24" /> Validando...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          {/* --- AVISO LEGAL PARA GOOGLE PLAY Y USUARIOS --- */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              <strong className="text-gray-500 block mb-1">
                ⚠️ Acceso Restringido
              </strong>
              Esta aplicación es para uso exclusivo del personal operativo y
              administrativo de <span className="font-bold">Admi Gas LP</span>.
              Se requieren credenciales corporativas activas para acceder. Si
              eres empleado y no tienes acceso, contacta a tu supervisor.
            </p>
          </div>
        </section>
      </div>

      {/* Copyright Footer */}
      <div className="fixed bottom-4 text-[10px] text-gray-400 font-medium opacity-60">
        © {new Date().getFullYear()} TechnoArt Development. V 1.0.0
      </div>
    </main>
  );
};
