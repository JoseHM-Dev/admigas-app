import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { Icon } from '@iconify/react';

const ModalCarburacion = ({ isOpen, onClose, registradorId, onCarburacionSuccess }) => {
  const [litros, setLitros] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!litros) {
      setErrorMsg('El campo de litros es requerido.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const carburacionData = {
        fecha: today,
        litros: parseFloat(litros),
        registrador_id: registradorId,
      };

      const { error } = await supabase.from('carburacion').insert(carburacionData);

      if (error) throw error;

      setSuccessMsg('Carburación registrada con éxito.');
      setTimeout(() => {
        onCarburacionSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error al registrar la carburación:', error);
      setErrorMsg(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
            <Icon icon="mdi:gas-station" width="28" />
            Registrar Carburación
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-600 transition-colors">
            <Icon icon="line-md:close" width="24" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Litros</label>
            <input type="number" step="0.01" value={litros} onChange={(e) => setLitros(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
          </div>
          
          {errorMsg && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{errorMsg}</div>}
          {successMsg && <div className="p-3 bg-green-100 text-green-700 rounded-lg">{successMsg}</div>}

          <div className="mt-6 pt-4 border-t flex justify-end">
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400">
              <Icon icon={isSubmitting ? "line-md:loading-loop" : "line-md:confirm-circle"} width="24" />
              {isSubmitting ? 'Guardando...' : 'Guardar Carburación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCarburacion;
