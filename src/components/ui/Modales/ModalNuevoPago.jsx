import React, { useState } from 'react';
import { supabase } from '../../../supabaseClient';

export const ModalNuevoPago = ({ isOpen, onClose, onPagoGuardado, credito }) => {
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

      const handleSubmit = async (e) => {
      e.preventDefault();
      if (!credito || !credito.id_carga) {
        setError('No se ha seleccionado ningún crédito o el crédito no tiene un ID válido.');
        return;
      }
      const montoNumerico = parseFloat(monto);
      if (isNaN(montoNumerico) || montoNumerico <= 0) {
        setError('Por favor, ingresa un monto de pago válido y positivo.');
        return;
      }
  
      setGuardando(true);
      setError(null);
  
      try {
        const { error } = await supabase
          .from('pagos')
          .insert([
            {
              id_carga: credito.id_carga,
              monto_pago: montoNumerico,
              fecha_pago: new Date().toISOString()
            }
          ]);
  
        if (error) {
          throw new Error(error.message || 'Error al guardar el pago.');
        }
  
        const nuevoMontoPendiente = credito.monto_pendiente - montoNumerico;
        const { error: updateError } = await supabase
          .from('carga_casa')
          .update({ monto_pendiente: nuevoMontoPendiente, estado_pago: nuevoMontoPendiente <= 0 })
          .eq('id_carga', credito.id_carga);
      if (updateError) {
        throw new Error(updateError.message || 'Error al actualizar el monto pendiente.');
      }

      onPagoGuardado();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Registrar Nuevo Pago</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2" htmlFor="monto">
              Monto del Pago
            </label>
            <input
              type="number"
              id="monto"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          {error && <p className="text-red-500 text-xs italic">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Guardar Pago'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};