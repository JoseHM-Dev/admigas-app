import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from './useAuth';

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
                .from('app_users')
                .select('*')
                .eq('auth_id', currentSession.user.id)
                .single();
            
            setAppUser(appUserData);

            if (appUserData && !appUserError) {
                const { data: personalData } = await supabase
                    .from('personal')
                    .select('*')
                    .eq('app_users_id', appUserData.id)
                    .maybeSingle();
                setPersonal(personalData);

                if (personalData) {
                    const { data: unidadData } = await supabase
                        .from('unidad')
                        .select('*')
                        .eq('personal_id', personalData.id)
                        .maybeSingle();
                    setUnidad(unidadData);

                    const { data: datosBancariosData } = await supabase
                        .from('datos_bancarios')
                        .select('*')
                        .eq('personal_id', personalData.id)
                        .maybeSingle();
                    setDatosBancarios(datosBancariosData);

                    const { data: tarifaData } = await supabase
                        .from('tarifa')
                        .select('*')
                        .eq('personal_id', personalData.id)
                        .maybeSingle();
                    setTarifa(tarifaData);
                }
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
        signOut: () => supabase.auth.signOut(),
        personal,
        loadingPersonal,
        appUser,
        unidad,
        datosBancarios,
        tarifa,
        fetchUserData: () => fetchUserData(session), // Exponer la función para refrescar
    };

    // Muestra un loader mientras se verifica la sesión
    if (loading) {
        return <div>Cargando...</div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
