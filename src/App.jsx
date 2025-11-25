import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import Dashboard from "./pages/Dashboard"; // Usamos el nuevo Dashboard
import { Ventas } from "./pages/Ventas";
import { Clientes } from "./pages/Clientes";
import { Creditos } from "./pages/Creditos";
import { Administracion } from "./pages/Administracion";
import { Ajustes } from "./pages/Ajustes";
import FacturaPage from "./pages/FacturaPage";
import { useEffect } from "react"; // Asegúrate de importar useEffect
import { SplashScreen } from "@capacitor/splash-screen";
import { App as CapacitorApp } from "@capacitor/app";

function App() {
  const { session } = useAuth();

  useEffect(() => {
    // Lógica del Splash Screen (que ya tenías)
    const ocultarSplash = async () => {
      await SplashScreen.hide();
    };
    ocultarSplash();

    // --- NUEVA LÓGICA DEL BOTÓN ATRÁS ---
    const setupBackButton = async () => {
      // Escuchamos el evento 'backButton'
      CapacitorApp.addListener("backButton", () => {
        // Obtenemos la ruta actual
        const currentPath = window.location.pathname;

        // DEFINIR RUTAS "PRINCIPALES" DONDE SÍ DEBE SALIRSE
        // Por ejemplo: El Login o el Dashboard principal
        const rutasPrincipales = ["/", "/login", "/dashboard"];

        if (!rutasPrincipales.includes(currentPath)) {
          // Si NO estoy en una ruta principal, regreso a la anterior
          window.history.back();
        } else {
          // Si ESTOY en una ruta principal, cierro la app
          CapacitorApp.exitApp();
        }
      });
    };

    setupBackButton();

    // Limpieza al desmontar (buena práctica)
    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, []);
  return (
    <>
      <Routes>
        {session ? (
          // Rutas privadas: si hay sesión
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/creditos" element={<Creditos />} />
            <Route path="/administracion" element={<Administracion />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/factura" element={<FacturaPage />} />
            {/* Cualquier otra ruta redirige al dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </>
        ) : (
          // Rutas públicas: si no hay sesión
          <>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            {/* Cualquier otra ruta redirige al home */}
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </>
  );
}

export default App;
