import React, { useState } from 'react';
import {supabase} from '../../../supabaseClient';
import { format } from 'date-fns';
import { useAuth } from '../../../auth/useAuth';

const ModalContrato = ({ isOpen, onClose, onSave }) => {
  const { personal } = useAuth();
  const [fechaInicio, setFechaInicio] = useState(new Date());

  const handleGuardarContrato = async () => {
    try {
      const formattedDate = format(fechaInicio, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('contrato')
        .insert([{ fecha_inicio: formattedDate, personal_id: personal.id }])
        .select();

      if (error) {
        throw error;
      }

      console.log('Contrato guardado:', data);
      onSave(data[0]); // Llama a onSave con el nuevo contrato
      onClose(); // Cierra el modal de contrato
    } catch (error) {
      console.error('Error al guardar el contrato:', error.message);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Nuevo Contrato</h2>
        <div className="mb-4">
          <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700">
            Fecha de Inicio del Contrato
          </label>
          <input
            type="date"
            id="fechaInicio"
            name="fechaInicio"
            value={format(fechaInicio, 'yyyy-MM-dd')}
            onChange={(e) => setFechaInicio(new Date(e.target.value))}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleGuardarContrato}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Guardar Contrato
        </button>
        <button
          onClick={onClose}
          className="ml-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ModalContrato;