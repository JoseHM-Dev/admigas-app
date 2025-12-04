import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { AuthContext } from "./useAuth";

// 2. Crear el proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [personal, setPersonal] = useState(null);
  const [loadingPersonal, setLoadingPersonal] = useState(true);
  const [appUser, setAppUser] = useState(null);
  const [unidad, setUnidad] = useState(null);
  const [datosBancarios, setDatosBancarios] = useState(null);
  const [tarifa, setTarifa] = useState(null);

  const fetchUserData = useCallback(async (currentSession) => {
    if (currentSession) {
      setLoadingPersonal(true);
      const { data: appUserData, error: appUserError } = await supabase
        .from("app_users")
        .select("*")
        .eq("auth_id", currentSession.user.id)
        .single();

      setAppUser(appUserData);

      if (appUserData && !appUserError) {
        // --- 1. DATOS DE LA EMPRESA (Ligados al app_user) ---
        const { data: unidadData } = await supabase
          .from("unidad")
          .select("*")
          .eq("app_users_id", appUserData.id)
          .maybeSingle();
        setUnidad(unidadData);

        const { data: datosBancariosData } = await supabase
          .from("datos_bancarios")
          .select("*")
          .eq("app_users_id", appUserData.id)
          .maybeSingle();
        setDatosBancarios(datosBancariosData);

        const { data: tarifaData } = await supabase
          .from("tarifa")
          .select("*")
          .eq("app_users_id", appUserData.id)
          .order("id_tarifa", { ascending: false })
          .limit(1)
          .maybeSingle();
        setTarifa(tarifaData);

        // --- 2. DATOS DEL EMPLEADO (Puede no existir) ---
        const { data: personalData } = await supabase
          .from("personal")
          .select("*")
          .eq("app_users_id", appUserData.id)
          .limit(1)
          .maybeSingle();
        setPersonal(personalData);
      } else {
        setPersonal(null);
        setUnidad(null);
        setDatosBancarios(null);
        setTarifa(null);
      }
      setLoadingPersonal(false);
    }
  }, []);

  useEffect(() => {
    // Intenta obtener la sesión activa al cargar el componente
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        fetchUserData(currentSession);
      }
      setLoading(false);
    });

    // Escucha los cambios en el estado de autenticación (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          fetchUserData(newSession);
        }
        setLoading(false);
      }
    );

    // Limpia el listener cuando el componente se desmonta
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const value = {
    session,
    user: session?.user || null,
    // NUEVA VERSIÓN DE SIGNOUT:
    signOut: async () => {
      // 1. Intentamos avisar a Supabase
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Error de red al salir:", error);
      }
      // 2. IMPERATIVO: Borramos todo localmente SIEMPRE, aunque falle lo de arriba
      setSession(null);
      setPersonal(null);
      setAppUser(null);
      setUnidad(null);
      setDatosBancarios(null);
      setTarifa(null);
    },
    personal,
    loadingPersonal,
    appUser,
    unidad,
    datosBancarios,
    tarifa,
    fetchUserData: () => fetchUserData(session),
  };

  // Muestra un loader mientras se verifica la sesión o se cargan los datos del personal
  if (loading || (session && loadingPersonal)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <h2 className="text-gray-500 font-medium animate-pulse">
          Cargando sistema...
        </h2>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
