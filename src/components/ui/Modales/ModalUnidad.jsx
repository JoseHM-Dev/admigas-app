import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../auth/useAuth';

const ModalUnidad = ({ isOpen, onClose, unidadData, onSave }) => {
  const { personal } = useAuth();
  const [formData, setFormData] = useState({
    empresa: '',
    num_unidad: '',
    capacidad: '',
    permiso_reparto: '',
    telefono_1: '',
    telefono_2: '',
    telefono_3: '',
    telefono_4: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (unidadData) {
        setFormData({
          empresa: unidadData.empresa || '',
          num_unidad: unidadData.num_unidad || '',
          capacidad: unidadData.capacidad || '',
          permiso_reparto: unidadData.permiso_reparto || '',
          telefono_1: unidadData.telefono_1 || '',
          telefono_2: unidadData.telefono_2 || '',
          telefono_3: unidadData.telefono_3 || '',
          telefono_4: unidadData.telefono_4 || '',
        });
      } else {
        setFormData({
          empresa: '',
          num_unidad: '',
          capacidad: '',
          permiso_reparto: '',
          telefono_1: '',
          telefono_2: '',
          telefono_3: '',
          telefono_4: '',
        });
      }
      setError(''); // Limpiar errores al abrir el modal
    }
  }, [unidadData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let error = null;

    if (unidadData) {
      // Actualizar unidad existente
      const { error: updateError } = await supabase
        .from('unidad')
        .update(formData)
        .eq('id', unidadData.id);
      error = updateError;
    } else {
      // Crear nueva unidad
      const { error: insertError } = await supabase
        .from('unidad')
        .insert({ ...formData, personal_id: personal.id });
      error = insertError;
    }

    if (error) {
      console.error('Error saving data:', error);
      setError(`Error al guardar los cambios: ${error.message}`);
    } else {
      onSave();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          {unidadData ? 'Editar Unidad' : 'Agregar Nueva Unidad'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="empresa" className="block text-sm font-medium text-gray-700">Empresa</label>
            <input
              type="text"
              name="empresa"
              id="empresa"
              value={formData.empresa}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="num_unidad" className="block text-sm font-medium text-gray-700">Número de Unidad</label>
            <input
              type="text"
              name="num_unidad"
              id="num_unidad"
              value={formData.num_unidad}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="capacidad" className="block text-sm font-medium text-gray-700">Capacidad</label>
            <input
              type="text"
              name="capacidad"
              id="capacidad"
              value={formData.capacidad}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="permiso_reparto" className="block text-sm font-medium text-gray-700">Permiso de Reparto</label>
            <input
              type="text"
              name="permiso_reparto"
              id="permiso_reparto"
              value={formData.permiso_reparto}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="telefono_1" className="block text-sm font-medium text-gray-700">Teléfono 1</label>
            <input
              type="text"
              name="telefono_1"
              id="telefono_1"
              value={formData.telefono_1}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="telefono_2" className="block text-sm font-medium text-gray-700">Teléfono 2</label>
            <input
              type="text"
              name="telefono_2"
              id="telefono_2"
              value={formData.telefono_2}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="telefono_3" className="block text-sm font-medium text-gray-700">Teléfono 3</label>
            <input
              type="text"
              name="telefono_3"
              id="telefono_3"
              value={formData.telefono_3}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="telefono_4" className="block text-sm font-medium text-gray-700">Teléfono 4</label>
            <input
              type="text"
              name="telefono_4"
              id="telefono_4"
              value={formData.telefono_4}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {unidadData ? 'Guardar Cambios' : 'Crear Unidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalUnidad;
