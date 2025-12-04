import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import ModalNuevoCliente from "./ModalNuevoCliente";
import { useAuth } from "../../../auth/useAuth";

// Helper para fecha local (igual que en tus otros modales)
const getLocalDateString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
};

const ModalCreditoManual = ({ isOpen, onClose, onGuardado }) => {
    const { user, appUser } = useAuth();
  // Estados del Formulario
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Estados para Modal Nuevo Cliente
  const [isModalNuevoClienteOpen, setIsModalNuevoClienteOpen] = useState(false);
  const [nuevoContrato, setNuevoContrato] = useState(null);

  // --- LÓGICA DE BÚSQUEDA ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (busqueda.length > 2 && !clienteSeleccionado) {
        setIsSearching(true);
        const { data } = await supabase
          .from("casa_habitacion")
          .select("*")
          .or(`nombre_cliente.ilike."%${busqueda}%",calle.ilike."%${busqueda}%"`)
          .limit(5);
        
        setClientes(data || []);
        setIsSearching(false);
      } else {
        setClientes([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [busqueda, clienteSeleccionado]);

  // --- LÓGICA DE GUARDADO DE DEUDA ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clienteSeleccionado) return alert("Por favor selecciona un cliente.");
    if (!monto || parseFloat(monto) <= 0) return alert("Ingresa un monto válido.");

    setGuardando(true);
    try {
      const { error } = await supabase.rpc('registrar_movimiento_credito', {
        p_id_casa: clienteSeleccionado.id_casa,
        p_tipo: 'CARGO',
        p_monto: parseFloat(monto),
        p_descripcion: nota || "Deuda Manual / Préstamo",
        p_id_carga: null,
        p_id_turno: null, // Deuda manual no afecta el corte operativo del turno
        p_user_id: user?.id,         // <--- ID del usuario logueado (Auth)
        p_app_users_id: appUser?.id  // <--- ID de la empresa (AppUser) ¡NUEVO!
      });

      if (error) throw error;

      onGuardado();
      handleClose();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // --- LÓGICA PARA NUEVO CLIENTE ---
  const handleOpenModalNuevoCliente = async () => {
    try {
      // Creamos un contrato temporal para el nuevo cliente
      const todayDate = getLocalDateString();
      const { data, error } = await supabase
        .from("contrato")
        .insert([{ fecha_inicio: todayDate }])
        .select()
        .single();
        
      if (error) throw error;

      setNuevoContrato(data);
      setIsModalNuevoClienteOpen(true);
      // Limpiamos búsqueda para evitar conflictos visuales
      setClientes([]); 
    } catch (error) {
      console.error("Error creando contrato:", error);
    }
  };

  const handleCloseModalNuevoCliente = () => {
    setIsModalNuevoClienteOpen(false);
    setNuevoContrato(null);
    // Opcional: Podrías buscar automáticamente al cliente recién creado aquí
    // pero por simplicidad dejamos que el usuario lo busque por nombre.
    setBusqueda(""); 
  };

  const handleClose = () => {
    setBusqueda("");
    setClientes([]);
    setClienteSeleccionado(null);
    setMonto("");
    setNota("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
      
      {/* CONTENEDOR PRINCIPAL (Estilo ModalNuevaVenta) */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* HEADER CON GRADIENTE */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon icon="mdi:cash-plus" className="text-white w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Agregar Deuda Manual
              </h2>
              <p className="text-xs text-blue-100 opacity-80">
                Registrar cargo sin venta de gas
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white transition-colors">
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* SECCIÓN BUSCADOR */}
          <div className="relative group z-30">
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
               Buscar Deudor
             </label>
             
             {!clienteSeleccionado ? (
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500">
                      <Icon icon="mdi:account-search" width="20" />
                   </div>
                   <input
                      type="text"
                      placeholder="Nombre, calle..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all sm:text-sm shadow-sm"
                      autoFocus
                   />
                   
                   {/* LOADING ICON */}
                   {isSearching && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-500">
                         <Icon icon="line-md:loading-loop" />
                      </div>
                   )}
                </div>
             ) : (
                /* CLIENTE SELECCIONADO (CARD VISUAL) */
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                         <Icon icon="mdi:account-check" width="24"/>
                      </div>
                      <div>
                         <p className="font-bold text-gray-800">{clienteSeleccionado.nombre_cliente}</p>
                         <p className="text-xs text-gray-500">{clienteSeleccionado.calle} #{clienteSeleccionado.numero}</p>
                      </div>
                   </div>
                   <button 
                      onClick={() => { setClienteSeleccionado(null); setBusqueda(""); }}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                   >
                      <Icon icon="mdi:close-circle" width="24" />
                   </button>
                </div>
             )}

             {/* LISTA DE RESULTADOS */}
             {clientes.length > 0 && !clienteSeleccionado && (
                <ul className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                   {clientes.map((c) => (
                      <li 
                         key={c.id_casa} 
                         onClick={() => { setClienteSeleccionado(c); setClientes([]); }}
                         className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex flex-col"
                      >
                         <span className="font-bold text-gray-800">{c.nombre_cliente}</span>
                         <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Icon icon="mdi:map-marker" width="12"/> {c.calle}, {c.colonia}
                         </span>
                      </li>
                   ))}
                </ul>
             )}

             {/* NO ENCONTRADO + CREAR NUEVO */}
             {clientes.length === 0 && busqueda.length > 2 && !isSearching && !clienteSeleccionado && (
                <div className="mt-2 flex items-center justify-between bg-amber-50 p-3 rounded-lg border border-amber-200 animate-in fade-in">
                   <span className="text-sm text-amber-800 flex items-center gap-2">
                      <Icon icon="mdi:alert-circle-outline" /> Cliente no encontrado.
                   </span>
                   <button
                      type="button"
                      onClick={handleOpenModalNuevoCliente}
                      className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1"
                   >
                      <Icon icon="mdi:account-plus" /> Crear Nuevo
                   </button>
                </div>
             )}
          </div>

          <div className="grid grid-cols-1 gap-5">
             {/* INPUT MONTO */}
             <InputGroup
                label="Monto de la Deuda"
                icon="mdi:currency-usd"
                type="number"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
             />

             {/* INPUT NOTA */}
             <div className="group">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                   Motivo / Nota
                </label>
                <div className="relative">
                   <div className="absolute top-3 left-3 text-gray-400 group-focus-within:text-blue-500">
                      <Icon icon="mdi:comment-text-outline" width="20" />
                   </div>
                   <textarea
                      rows="3"
                      placeholder="Ej. Préstamo personal, Ajuste de saldo..."
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all sm:text-sm shadow-sm resize-none"
                   />
                </div>
             </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 mt-auto">
           <button
             onClick={handleClose}
             className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white hover:text-gray-900 transition-all"
             disabled={guardando}
           >
             Cancelar
           </button>
           <button
             onClick={handleSubmit}
             disabled={guardando}
             className={`
                px-6 py-2.5 rounded-lg text-white font-medium shadow-lg shadow-blue-500/30
                flex items-center gap-2 transition-all transform active:scale-95
                ${guardando 
                   ? 'bg-gray-400 cursor-not-allowed' 
                   : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5'
                }
             `}
           >
             {guardando ? (
                <><Icon icon="line-md:loading-loop" /> Guardando...</>
             ) : (
                <><Icon icon="mdi:content-save-check" /> Guardar Deuda</>
             )}
           </button>
        </div>
      </div>
    </div>

    {/* MODAL HIJO: NUEVO CLIENTE */}
    <ModalNuevoCliente 
       isOpen={isModalNuevoClienteOpen}
       onClose={handleCloseModalNuevoCliente}
       contrato={nuevoContrato}
    />
    </>
  );
};

// Componente Reutilizable (Igual que en tus otros modales)
const InputGroup = ({ label, icon, className = "", ...props }) => (
  <div className="group">
    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
        <Icon icon={icon} width="20" />
      </div>
      <input
        {...props}
        className={`block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm ${className}`}
      />
    </div>
  </div>
);

export default ModalCreditoManual;