
import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { supabase } from "../../supabaseClient";
import Swal from "sweetalert2";

export default function BuscadorFlotante({ onEdit, onReport }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  
  const wrapperRef = useRef(null);

  // Lógica de búsqueda con debounce
  useEffect(() => {
    const fetchResults = async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("casa_habitacion")
          .select("id_casa, nombre_cliente, apellido_cliente, calle, numero, colonia, telefono, id_contrato, delegacion, cp, latitud, longitud")
          .or(`nombre_cliente.ilike."%${searchTerm}%",calle.ilike."%${searchTerm}%"`)
          .limit(10);

        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error("Error buscando:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(fetchResults, 400);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Cerrar resultados al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Acciones
  const handleSelect = (client) => {
    setSelectedClient(client);
    setShowActionSheet(true);
    setResults([]);
    setSearchTerm("");
  };

  const handleOpenMap = (client) => {
    if (client.latitud && client.longitud) {
      const url = `https://www.google.com/maps?q=${client.latitud},${client.longitud}`;
      window.open(url, "_blank");
    } else {
      Swal.fire({
        icon: "warning",
        title: "Sin Ubicación",
        text: "Este cliente no tiene coordenadas GPS guardadas.",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  const handleCheckCredit = async (client) => {
    try {
      const { data, error } = await supabase
        .from("cuentas_por_cobrar")
        .select("saldo_actual")
        .eq("id_casa", client.id_casa)
        .gt("saldo_actual", 0);

      if (error) {
        console.error("Error consultando estado de cuenta:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        Swal.fire({
          icon: "success",
          title: "Crédito al Corriente",
          text: `${client.nombre_cliente} no presenta adeudos pendientes.`,
          confirmButtonColor: "#10b981",
        });
      } else {
        const total = data.reduce((acc, curr) => acc + Number(curr.saldo_actual), 0);
        Swal.fire({
          icon: "info",
          title: "Estado de Cuenta",
          text: `${client.nombre_cliente} tiene un saldo pendiente de $${total.toFixed(2)} MXN.`,
          confirmButtonColor: "#3b82f6",
        });
      }
    } catch (error) {
      Swal.fire("Error", "No se pudo consultar el estado de cuenta.", "error");
    }
  };

  return (
    <>
      {/* BARRA FLOTANTE ESTILO iPHONE */}
      <div ref={wrapperRef} className="fixed left-4 right-24 md:right-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-50 transition-all bottom-[calc(1.5rem+env(safe-area-inset-bottom))]">
        
        {/* Resultados Flotantes hacia arriba */}
        {results.length > 0 && (
          <ul className="absolute bottom-full mb-3 w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-h-64 overflow-y-auto z-50 animate-in slide-in-from-bottom-5">
            {results.map((client) => (
              <li
                key={client.id_casa}
                onClick={() => handleSelect(client)}
                className="px-5 py-3.5 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-0 flex items-center gap-3 transition-colors"
              >
                <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-full text-blue-600 dark:text-blue-400 shrink-0">
                  <Icon icon="mdi:account-outline" width="20" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 dark:text-slate-100 truncate text-sm">{client.nombre_cliente}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate flex items-center gap-1">
                    <Icon icon="mdi:map-marker" /> {client.calle} #{client.numero}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Barra de Búsqueda */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-xl shadow-blue-900/10 dark:shadow-black/50 rounded-full border border-gray-200/80 dark:border-slate-700/80 flex items-center px-4 py-3.5 focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <Icon icon="mdi:magnify" className="text-gray-400 dark:text-slate-400 shrink-0" width="24" />
          <input
            type="text"
            placeholder="Buscar clientes rápido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent flex-1 outline-none ml-3 text-gray-800 dark:text-white font-medium placeholder-gray-400 dark:placeholder-slate-500 text-[15px]"
          />
          {isSearching && <Icon icon="line-md:loading-loop" className="text-blue-500 shrink-0 ml-2" width="20" />}
          {searchTerm && !isSearching && (
            <button onClick={() => setSearchTerm("")} className="text-gray-400 hover:text-red-500 transition-colors ml-2">
              <Icon icon="mdi:close-circle" width="20" />
            </button>
          )}
        </div>
      </div>

      {/* ACTION SHEET (ESTILO iOS) */}
      {showActionSheet && selectedClient && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowActionSheet(false)}>
          <div className="bg-transparent p-4 pb-8 w-full max-w-md mx-auto animate-in slide-in-from-bottom-10" onClick={(e) => e.stopPropagation()}>
            
            {/* Grupo de Opciones */}
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl overflow-hidden mb-2 shadow-2xl">
              <div className="p-4 border-b border-gray-200/60 dark:border-slate-700/60 text-center bg-gray-50/50 dark:bg-slate-900/50">
                <p className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-1">Acciones para</p>
                <p className="text-[17px] font-extrabold text-gray-800 dark:text-slate-100 truncate">{selectedClient.nombre_cliente}</p>
              </div>
              
              <button onClick={() => { setShowActionSheet(false); onEdit(selectedClient); }} className="w-full flex items-center justify-center gap-2 p-4 text-blue-600 dark:text-sky-400 font-bold text-lg border-b border-gray-200/60 dark:border-slate-700/60 active:bg-gray-200 dark:active:bg-slate-700 transition-colors">
                <Icon icon="mdi:pencil-outline" width="22" /> Editar Cliente
              </button>
              <button onClick={() => { setShowActionSheet(false); handleOpenMap(selectedClient); }} className="w-full flex items-center justify-center gap-2 p-4 text-blue-600 dark:text-sky-400 font-bold text-lg border-b border-gray-200/60 dark:border-slate-700/60 active:bg-gray-200 dark:active:bg-slate-700 transition-colors">
                <Icon icon="mdi:google-maps" width="22" /> Navegar a Ubicación
              </button>
              <button onClick={() => { setShowActionSheet(false); handleCheckCredit(selectedClient); }} className="w-full flex items-center justify-center gap-2 p-4 text-blue-600 dark:text-sky-400 font-bold text-lg border-b border-gray-200/60 dark:border-slate-700/60 active:bg-gray-200 dark:active:bg-slate-700 transition-colors">
                <Icon icon="mdi:currency-usd" width="24" /> Estado de Cuenta
              </button>
              <button onClick={() => { setShowActionSheet(false); onReport(selectedClient); }} className="w-full flex items-center justify-center gap-2 p-4 text-blue-600 dark:text-sky-400 font-bold text-lg active:bg-gray-200 dark:active:bg-slate-700 transition-colors">
                <Icon icon="mdi:chart-box-outline" width="22" /> Ver Historial
              </button>
            </div>

            {/* Botón Cancelar Separado */}
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
              <button onClick={() => setShowActionSheet(false)} className="w-full p-4 text-red-500 dark:text-rose-400 font-bold text-lg active:bg-gray-200 dark:active:bg-slate-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
