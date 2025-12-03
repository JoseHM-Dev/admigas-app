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

// --- IMPORTS DE CAPACITOR ---
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
// OJO: Este es el import correcto del nuevo paquete
import { NavigationBar } from "@hugotomazi/capacitor-navigation-bar";

function App() {
  const { session } = useAuth();

  useEffect(() => {
    const ocultarSplash = async () => {
      // Solo en nativo, para evitar errores en web
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide();
      }
    };

    // 2. CONFIGURAR COLORES DE BARRAS (Gris)
    const configurarBarras = async () => {
      if (Capacitor.isNativePlatform()) {
        const colorGris = "#a9a9a9";

        // Barra de Estado (Arriba) - Plugin Oficial
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: colorGris });

        // Barra de Navegación (Abajo) - Plugin @hugotomazi
        // Este plugin usa 'setColor'
        await NavigationBar.setColor({ color: colorGris });
      }
    };

    ocultarSplash();
    configurarBarras();

    // 3. Lógica del Botón Atrás
    const setupBackButton = async () => {
      CapacitorApp.addListener("backButton", () => {
        const hash = window.location.hash;
        const rutaActual = hash.replace("#", "");
        const rutasPrincipales = ["/", "/dashboard", "/login"];

        if (!rutasPrincipales.includes(rutaActual)) {
          window.history.back();
        } else {
          CapacitorApp.exitApp();
        }
      });
    };

    setupBackButton();

    return () => {
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
