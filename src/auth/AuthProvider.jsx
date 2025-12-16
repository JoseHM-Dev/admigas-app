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
    // 1. Carga inicial
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        fetchUserData(currentSession);
      }
      setLoading(false);
    });

    // 2. Listener de cambios de auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Aquí está el truco:
        // Solo mostramos el loader y hacemos fetch si la sesión cambió DE VERDAD (ej. login/logout)
        // O si es la primera vez que obtenemos datos.
        
        // Comparamos los IDs directamente de la nueva sesión vs el estado actual (usando una función de actualización para acceder al estado fresco si fuera necesario, pero aquí newSession es la autoridad).
        
        setSession(newSession);

        if (newSession) {
          // Si el evento es TOKEN_REFRESHED o SIGNED_IN (pero ya estabamos dentro), 
          // a veces no queremos recargar todo si ya tenemos datos.
          
          // Pero para simplificar y evitar el error de ESLint:
          // Simplemente llamamos a fetchUserData. 
          // LA CLAVE es que el fetchUserData maneja el 'loadingPersonal' 
          // y nuestra UI (el return de abajo) decide si bloquear la pantalla o no.
          
          fetchUserData(newSession);
        } else {
          // Si no hay sesión (logout), limpiamos todo
          setAppUser(null);
          setPersonal(null);
          setUnidad(null);
          setDatosBancarios(null);
          setTarifa(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserData]); // Solo dependemos de fetchUserData (que usa useCallback)

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

  // Muestra un loader SOLO si es la carga inicial o si hay sesión pero AÚN NO hay datos de usuario.
  // Si ya tenemos 'appUser', no mostramos el loader aunque estemos actualizando (loadingPersonal true).
  if (loading || (session && loadingPersonal && !appUser)) {
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
