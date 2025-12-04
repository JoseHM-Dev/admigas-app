import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../auth/useAuth";
import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";

// Modales
import ModalPersonal from "../ui/Modales/ModalPersonal";
import ModalUnidad from "../ui/Modales/ModalUnidad";
import ModalBanco from "../ui/Modales/ModalBanco";
import ModalTarifa from "../ui/Modales/ModalTarifa";

export const MainAjustes = () => {
  const { user, appUser, fetchUserData } = useAuth();
  
  // Estados de Imagen
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Estados de Tarifas
  const [currentTarifas, setCurrentTarifas] = useState({
    precio_litro: "0.00",
    precio_m3: "0.00",
    fecha_vigente: null
  });
  const [isTarifaModalOpen, setIsTarifaModalOpen] = useState(false);

  // Estados de Tablas
  const [activeTab, setActiveTab] = useState(null); // 'personal', 'unidad', 'banco' o null
  
  // Datos y Estados de Carga
  const [personalList, setPersonalList] = useState([]);
  const [unidadesList, setUnidadesList] = useState([]);
  const [bancoList, setBancoList] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Estados de Modales de Edición
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(null);
  
  const [isUnidadesModalOpen, setIsUnidadesModalOpen] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState(null);

  const [isBancoModalOpen, setIsBancoModalOpen] = useState(false);
  const [editingBanco, setEditingBanco] = useState(null);

  // --- 1. LÓGICA DE TARIFAS ---
  const fetchLatestTarifas = useCallback(async () => {
    if (!appUser?.id) return; 
    const { data, error } = await supabase
      .from("tarifa")
      .select("precio_litro, precio_m3, fecha_vigente")
      .eq("app_users_id", appUser.id)
      .order("id_tarifa", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) console.error("Error fetching tarifas:", error);
    if (data) setCurrentTarifas(data);
  }, [appUser]);

  useEffect(() => {
    fetchLatestTarifas();
  }, [fetchLatestTarifas]);

  // --- 2. LÓGICA DE FOTO DE PERFIL ---
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatar")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatar")
        .getPublicUrl(fileName);

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateUserError) throw updateUserError;

      alert("Foto de perfil actualizada correctamente.");
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      alert("Error al actualizar la imagen.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // --- 3. LÓGICA DE DATOS ---
  const fetchData = useCallback(async (type) => {
    if (!appUser?.id) return;

    setLoadingData(true);
    let tableName = "";
    let orderCol = "id";

    if (type === 'personal') { tableName = "personal"; orderCol = "nombre"; }
    else if (type === 'unidad') { tableName = "unidad"; orderCol = "num_unidad"; }
    else if (type === 'banco') { tableName = "datos_bancarios"; orderCol = "id"; }

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("app_users_id", appUser.id)
      .order(orderCol, { ascending: true });

    if (!error) {
      if (type === 'personal') setPersonalList(data);
      if (type === 'unidad') setUnidadesList(data);
      if (type === 'banco') setBancoList(data);
    }
    setLoadingData(false);
  }, [appUser]);

  const handleToggleTab = (tab) => {
    if (activeTab === tab) {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
      fetchData(tab);
    }
  };

  const handleDelete = async (table, id, refreshType) => {
    if (!window.confirm("¿Estás seguro de eliminar este registro?")) return;
    
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) alert("Error al eliminar");
    else fetchData(refreshType);
  };

  const handleTarifaGuardada = async () => {
    await fetchLatestTarifas();
    await fetchUserData(); 
  };

  return (
    <div className="min-h-screen pb-20">
      
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
               <Icon icon="mdi:cog-box" className="text-gray-400"/> Ajustes
            </h1>
            <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
            <Icon icon="mdi:arrow-left" width="20" />
            Volver
            </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-8 mt-6">

        {/* 1. SECCIÓN PERFIL */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden relative bg-gray-100">
                    {previewUrl ? (
                        <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Icon icon="mdi:user" width="48" />
                        </div>
                    )}
                    {isUploadingImage && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                            Subiendo...
                        </div>
                    )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-md transition-transform hover:scale-110">
                    <Icon icon="mdi:camera" width="20" />
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
            </div>

            <div className="text-center md:text-left">
                <h2 className="text-xl font-bold text-gray-800">Tu Perfil</h2>
                <p className="text-gray-500 text-sm mt-1">Personaliza tu foto de perfil. Se guardará automáticamente.</p>
                <div className="mt-2 text-xs font-mono text-gray-400 bg-gray-100 px-3 py-1 rounded-full inline-block">
                    {user?.email}
                </div>
            </div>
        </section>

        {/* 2. SECCIÓN TARIFAS */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                       <Icon icon="mdi:tag-multiple" className="text-blue-500" /> Tarifas Vigentes
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Precios actuales aplicados a las ventas.</p>
                </div>
                <button
                    onClick={() => setIsTarifaModalOpen(true)}
                    className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all font-medium flex items-center gap-2"
                >
                    <Icon icon="mdi:plus" width="20" /> Nueva Tarifa
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg shadow-blue-200">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
                        <Icon icon="mdi:water-percent" width="100" />
                    </div>
                    <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-2">Precio por Litro</p>
                    <div className="text-4xl font-extrabold flex items-baseline gap-1">
                        <span className="text-2xl opacity-70">$</span>
                        {currentTarifas.precio_litro}
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg shadow-emerald-200">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
                        <Icon icon="mdi:cube-outline" width="100" />
                    </div>
                    <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider mb-2">Precio por M³</p>
                    <div className="text-4xl font-extrabold flex items-baseline gap-1">
                        <span className="text-2xl opacity-70">$</span>
                        {currentTarifas.precio_m3}
                    </div>
                </div>
            </div>
            
            {currentTarifas.fecha_vigente && (
                <div className="mt-4 text-center text-xs text-gray-400">
                    Última actualización: {new Date(currentTarifas.fecha_vigente + 'T00:00:00').toLocaleDateString()}
                </div>
            )}
        </section>

        {/* 3. SECCIÓN GESTIÓN (TABS) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MenuCard 
                title="Personal" 
                icon="mdi:account-group" 
                color="indigo" 
                isActive={activeTab === 'personal'}
                onClick={() => handleToggleTab('personal')}
            />
            <MenuCard 
                title="Unidades" 
                icon="mdi:truck" 
                color="orange" 
                isActive={activeTab === 'unidad'}
                onClick={() => handleToggleTab('unidad')}
            />
            <MenuCard 
                title="Bancos" 
                icon="mdi:bank" 
                color="pink" 
                isActive={activeTab === 'banco'}
                onClick={() => handleToggleTab('banco')}
            />
        </section>

        {/* 4. CONTENIDO DE GESTIÓN (TARJETAS) */}
        {activeTab && (
            <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700 text-lg capitalize flex items-center gap-2">
                        {activeTab} <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                            {(activeTab === 'personal' ? personalList : activeTab === 'unidad' ? unidadesList : bancoList).length}
                        </span>
                    </h3>
                    <button 
                        onClick={() => {
                            if (activeTab === 'personal') setIsPersonalModalOpen(true);
                            if (activeTab === 'unidad') setIsUnidadesModalOpen(true);
                            if (activeTab === 'banco') setIsBancoModalOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white shadow-md hover:bg-indigo-700 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                    >
                        <Icon icon="mdi:plus" width="20" /> Agregar Nuevo
                    </button>
                </div>
                
                <div className="bg-gray-50/50">
                    {loadingData ? (
                        <div className="p-10 text-center text-gray-500">
                            <Icon icon="line-md:loading-loop" width="30" className="mx-auto mb-2 text-indigo-500" />
                            Cargando datos...
                        </div>
                    ) : (
                        // AQUÍ LLAMAMOS AL NUEVO COMPONENTE DE TARJETAS
                        <CardsContent 
                            type={activeTab} 
                            data={activeTab === 'personal' ? personalList : activeTab === 'unidad' ? unidadesList : bancoList}
                            onEdit={(item) => {
                                if (activeTab === 'personal') { setEditingPersonal(item); setIsPersonalModalOpen(true); }
                                if (activeTab === 'unidad') { setEditingUnidad(item); setIsUnidadesModalOpen(true); }
                                if (activeTab === 'banco') { setEditingBanco(item); setIsBancoModalOpen(true); }
                            }}
                            onDelete={(id) => handleDelete(
                                activeTab === 'banco' ? 'datos_bancarios' : activeTab, 
                                id, 
                                activeTab
                            )}
                        />
                    )}
                </div>
            </section>
        )}

      </div>

      {/* MODALES */}
      <ModalPersonal
        isOpen={isPersonalModalOpen}
        onClose={() => { setIsPersonalModalOpen(false); setEditingPersonal(null); }}
        personalData={editingPersonal}
        onSave={() => fetchData('personal')}
      />

      <ModalUnidad
        isOpen={isUnidadesModalOpen}
        onClose={() => { setIsUnidadesModalOpen(false); setEditingUnidad(null); }}
        unidadData={editingUnidad}
        onSave={() => fetchData('unidad')}
      />

      <ModalBanco
        isOpen={isBancoModalOpen}
        onClose={() => { setIsBancoModalOpen(false); setEditingBanco(null); }}
        bancoData={editingBanco}
        onSave={() => fetchData('banco')}
      />

      <ModalTarifa
        isOpen={isTarifaModalOpen}
        onClose={() => setIsTarifaModalOpen(false)}
        onSave={handleTarifaGuardada}
      />
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

// 1. Tarjeta de Menú (Tabs)
const MenuCard = ({ title, icon, color, isActive, onClick }) => {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100',
        orange: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100',
        pink: 'bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100',
    };
    
    return (
        <button 
            onClick={onClick}
            className={`
                p-6 rounded-2xl border transition-all duration-200 flex items-center gap-4 text-left w-full
                ${isActive ? 'ring-2 ring-offset-2 ring-blue-500 shadow-md scale-[1.02]' : 'shadow-sm hover:shadow-md hover:bg-gray-50'}
                bg-white border-gray-100
            `}
        >
            <div className={`p-3 rounded-xl transition-colors ${colors[color]}`}>
                <Icon icon={icon} width="24" />
            </div>
            <div>
                <h3 className="font-bold text-gray-800">{title}</h3>
                <p className="text-xs text-gray-400 font-medium">Gestionar {title.toLowerCase()}</p>
            </div>
            <div className="ml-auto text-gray-300">
                <Icon icon={isActive ? "mdi:chevron-up" : "mdi:chevron-down"} width="24" />
            </div>
        </button>
    )
}

// 2. NUEVO: Contenido de Tarjetas (Reemplaza a TableContent)
const CardsContent = ({ type, data, onEdit, onDelete }) => {
    if (data.length === 0) return (
        <div className="p-10 flex flex-col items-center justify-center text-gray-400">
            <Icon icon="mdi:package-variant-closed" width="48" className="mb-2 opacity-50"/>
            <p>No hay registros disponibles.</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {data.map((item) => (
                <div 
                    key={item.id} 
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-200 relative group flex flex-col"
                >
                    {/* Encabezado de la Tarjeta con Icono y Acciones */}
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-lg ${
                            type === 'personal' ? 'bg-indigo-100 text-indigo-600' :
                            type === 'unidad' ? 'bg-orange-100 text-orange-600' :
                            'bg-pink-100 text-pink-600'
                        }`}>
                            <Icon icon={
                                type === 'personal' ? "mdi:account" :
                                type === 'unidad' ? "mdi:truck" :
                                "mdi:bank"
                            } width="24" />
                        </div>
                        
                        <div className="flex gap-1">
                            <button 
                                onClick={() => onEdit(item)} 
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                <Icon icon="mdi:pencil" width="18" />
                            </button>
                            <button 
                                onClick={() => onDelete(item.id)} 
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Icon icon="mdi:trash-can" width="18" />
                            </button>
                        </div>
                    </div>

                    {/* Contenido Específico según el tipo */}
                    
                    {/* --- PERSONAL --- */}
                    {type === 'personal' && (
                        <div className="space-y-2">
                            <div>
                                <h4 className="font-bold text-gray-800 text-lg leading-tight">
                                    {item.nombre} {item.apellidos}
                                </h4>
                                <span className="inline-block px-2 py-0.5 mt-1 rounded text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    {item.roll}
                                </span>
                            </div>
                            <div className="pt-3 mt-2 border-t border-gray-100 flex items-center gap-2 text-gray-500 text-sm">
                                <Icon icon="mdi:phone" /> {item.telefono}
                            </div>
                        </div>
                    )}

                    {/* --- UNIDADES --- */}
                    {type === 'unidad' && (
                        <div className="space-y-2">
                            <div>
                                <h4 className="font-bold text-gray-800 text-lg leading-tight">
                                    Unidad: {item.num_unidad}
                                </h4>
                                <p className="text-sm text-gray-500">{item.empresa}</p>
                            </div>
                            <div className="pt-3 mt-2 border-t border-gray-100 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Permiso CRE:</span>
                                    <span className="font-mono text-gray-600">{item.permiso_reparto || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Capacidad:</span>
                                    <span className="font-bold text-gray-600">{item.capacidad || '0'} Lts</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- BANCOS --- */}
                    {type === 'banco' && (
                        <div className="space-y-2">
                            <div>
                                <h4 className="font-bold text-gray-800 text-lg leading-tight">
                                    {item.banco}
                                </h4>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-1">{item.apodo}</p>
                            </div>
                            <div className="pt-3 mt-2 border-t border-gray-100 space-y-2">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase">Titular</p>
                                    <p className="text-sm font-medium text-gray-700 truncate">{item.nom_responsable}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase">Cuenta / CLABE</p>
                                    <p className="font-mono text-sm text-gray-600 bg-gray-50 p-1 rounded border border-gray-200 text-center">
                                        {item.cuenta || item.clave_int || '****'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            ))}
        </div>
    );
}