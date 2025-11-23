// ModalAgendarCliente.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { Icon } from '@iconify/react';

// Función auxiliar para obtener la fecha local de hoy
const getLocalDateString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

/**
 * Modal para agendar un nuevo cliente o reagendar uno existente.
 * * @param {boolean} isOpen - Controla si el modal está abierto.
 * @param {function} onClose - Función para cerrar el modal.
 * @param {function} onAgendaGuardada - Callback al guardar o modificar una entrada.
 * @param {object | null} agendaItem - Si se pasa, el modal está en modo Reagendar.
 */
export default function ModalAgendarCliente({ isOpen, onClose, onAgendaGuardada, agendaItem }) {
  // Estado para la búsqueda de cliente (solo para nuevo agendamiento)
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Estados para los datos de la agenda
  const [fechaProximaCarga, setFechaProximaCarga] = useState('');
  const [comentario, setComentario] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Determinar si estamos en modo Reagendar
  const isReagendar = !!agendaItem;

  // Lógica para precargar datos si estamos reagendando
  useEffect(() => {
    if (isOpen) {
      if (isReagendar) {
        // Modo Reagendar: precargar fecha, comentario e ID
        setSelectedClient({
          id_casa: agendaItem.id_casa,
          calle: agendaItem.casa_habitacion.calle,
          numero: agendaItem.casa_habitacion.numero,
          colonia: agendaItem.casa_habitacion.colonia,
          nombre_cliente: agendaItem.casa_habitacion.nombre_cliente,
        });
        setFechaProximaCarga(agendaItem.fecha_proxima_carga || getLocalDateString());
        setComentario(agendaItem.comentario || '');
        setSearchTerm(''); // Limpiar búsqueda en modo reagendar
        setSearchResults([]);
      } else {
        // Modo Nuevo Agendamiento: limpiar estados
        resetForm();
      }
    }
  }, [isOpen, isReagendar, agendaItem]);

  // Función de búsqueda de clientes
  const searchClients = useCallback(async (term) => {
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('casa_habitacion')
        .select('id_casa, calle, numero, colonia, nombre_cliente')
        .or(`calle.ilike."%${term}%",numero.ilike."%${term}%",nombre_cliente.ilike."%${term}%"`)
        .limit(10);
      if (error) throw error;
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching clients:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!isReagendar) {
      const debounceTimer = setTimeout(() => { searchClients(searchTerm); }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchTerm, searchClients, isReagendar]);

  // Manejador para seleccionar un cliente de los resultados
  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSearchTerm(`${client.nombre_cliente} - ${client.calle} #${client.numero}, ${client.colonia}`);
    setSearchResults([]);
    setFechaProximaCarga(getLocalDateString()); // Asignar la fecha de hoy por defecto
  };

  // Función para resetear el formulario
  const resetForm = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedClient(null);
    setFechaProximaCarga('');
    setComentario('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSaveAgenda = async (e) => {
    e.preventDefault();
    
    if (!selectedClient || !fechaProximaCarga) {
      alert('Por favor, selecciona un cliente y una fecha.');
      return;
    }

    setIsSaving(true);
    try {
      const agendaData = {
        id_casa: selectedClient.id_casa,
        fecha_proxima_carga: fechaProximaCarga,
        comentario: comentario || null,
      };

      // Usamos UPSERT ya que sirve tanto para "Agendar Nuevo Cliente" (INSERT)
      // como para "Reagendar" (UPDATE, usando el id_casa como conflicto)
      const { error: agendaError } = await supabase
        .from('agenda')
        // El id_casa debe ser UNIQUE en Supabase para que onConflict funcione
        .upsert([agendaData], { onConflict: 'id_casa' }); 

      if (agendaError) {
        console.error('Error al guardar/actualizar en agenda:', agendaError);
        throw agendaError;
      }

      alert(isReagendar ? '¡Agenda actualizada con éxito!' : '¡Cliente agendado con éxito!');
      onAgendaGuardada(); // Callback para refrescar la tabla en el dashboard
      handleClose();

    } catch (error) {
      console.error('Error saving agenda:', error);
      alert(`Error al guardar la agenda: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const modalTitle = isReagendar ? 'Reagendar Cliente' : 'Agendar Nuevo Cliente';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-xl relative">
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"><Icon icon="mdi:close" width="24" /></button>
        <h2 className="text-2xl font-bold mb-6 text-center text-[#4677F8]">{modalTitle}</h2>
        
        <form onSubmit={handleSaveAgenda} className="space-y-4">
          
          {/* SECCIÓN DE CLIENTE (Visible y editable solo en modo "Nuevo Agendamiento") */}
          {!isReagendar && (
            <div className="relative">
              <label htmlFor="cliente-search" className="block font-medium text-gray-700">Buscar Cliente</label>
              <input 
                type="text" 
                id="cliente-search" 
                placeholder="Nombre o calle del cliente..." 
                className="w-full p-2 border border-gray-300 rounded-md mt-1" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              {selectedClient && (
                <button 
                  type="button" 
                  onClick={() => { setSelectedClient(null); setSearchTerm(''); setFechaProximaCarga(''); }} 
                  className="absolute right-2 top-9 text-red-500 hover:text-red-700"
                >
                  <Icon icon="mdi:close-circle" width="20" />
                </button>
              )}
              {isSearching && <div className="p-2 text-gray-500">Buscando...</div>}
              {searchResults.length > 0 &&  (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                  {searchResults.map((client) => (
                    <li 
                      key={client.id_casa} 
                      className="p-3 hover:bg-blue-100 cursor-pointer" 
                      onClick={() => handleSelectClient(client)}
                    >
                      **{client.nombre_cliente}** - {client.calle} #{client.numero}, {client.colonia}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Mostrar cliente seleccionado o reagendado */}
          {selectedClient && (
            <div className={`p-4 rounded-md ${isReagendar ? 'bg-yellow-50' : 'bg-blue-50'}`}>
              <h3 className="font-bold text-lg">Cliente: {selectedClient.nombre_cliente || 'N/A'}</h3>
              <p className="text-sm text-gray-600">{selectedClient.calle} #{selectedClient.numero}, {selectedClient.colonia}</p>
            </div>
          )}
          
          {/* SECCIÓN DE FECHA Y COMENTARIO (Siempre habilitada) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fecha-proxima-carga" className="block font-medium text-gray-700">Fecha Próxima Carga</label>
              <input 
                type="date" 
                id="fecha-proxima-carga" 
                value={fechaProximaCarga} 
                onChange={(e) => setFechaProximaCarga(e.target.value)} 
                className="w-full p-2 border border-gray-300 rounded-md mt-1" 
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label htmlFor="comentario-agenda" className="block font-medium text-gray-700">Comentario</label>
              <textarea 
                id="comentario-agenda" 
                rows="2"
                placeholder="Añade un comentario para esta próxima carga..." 
                value={comentario} 
                onChange={(e) => setComentario(e.target.value)} 
                className="w-full p-2 border border-gray-300 rounded-md mt-1" 
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-4 pt-4">
            <button 
              type="submit" 
              disabled={isSaving || !selectedClient || !fechaProximaCarga} 
              className="flex items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Icon icon="mdi:content-save" />
              {isSaving ? 'Guardando...' : modalTitle}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}