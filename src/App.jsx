import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/useAuth";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Ventas } from "./pages/Ventas";
import { Clientes } from "./pages/Clientes";
import { Creditos } from "./pages/Creditos";
import { Administracion } from "./pages/Administracion";
import { Ajustes } from "./pages/Ajustes";
import FacturaPage from "./pages/FacturaPage";
import { useEffect } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { App as CapacitorApp } from "@capacitor/app";

function App() {
  const { session } = useAuth();

  useEffect(() => {
    const ocultarSplash = async () => {
      await SplashScreen.hide();
    };
    ocultarSplash();

    // --- CORRECCIÓN DEL BOTÓN ATRÁS ---
    const setupBackButton = async () => {
      CapacitorApp.addListener("backButton", () => {
        // 1. Al usar HashRouter, la ruta está en el 'hash', no en el 'pathname'
        // window.location.hash devuelve algo como "#/dashboard"
        const hash = window.location.hash;

        // 2. Quitamos el símbolo "#" para obtener "/dashboard"
        const rutaActual = hash.replace("#", "");

        // 3. Definimos dónde queremos que la app se cierre
        // Agregué '/login' para que si están en login no regresen al Home vacío
        const rutasPrincipales = ["/", "/dashboard", "/login"];

        if (!rutasPrincipales.includes(rutaActual)) {
          // Si NO es ruta principal, regresamos en el historial
          window.history.back();
        } else {
          // Si ES ruta principal, cerramos la app
          CapacitorApp.exitApp();
        }
      });
    };

    setupBackButton();

    return () => {
      // Es más seguro remover solo el listener específico,
      // pero removeAllListeners funciona para este caso.
      CapacitorApp.removeAllListeners();
    };
  }, []);

  return (
    <>
      <Routes>
        {session ? (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/creditos" element={<Creditos />} />
            <Route path="/administracion" element={<Administracion />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/factura" element={<FacturaPage />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </>
  );
}

export default App;
