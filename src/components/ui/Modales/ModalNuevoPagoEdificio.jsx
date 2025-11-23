import React, { useState } from 'react';
import { supabase } from '../../../supabaseClient';

export const ModalNuevoPagoEdificio = ({ isOpen, onClose, onPagoGuardado, factura }) => {
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const handleGuardarPago = async () => {
    const montoNumerico = parseFloat(monto);
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      setError('Por favor, ingresa un monto de pago válido y positivo.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const nuevoSaldoPorPagar = factura.saldo_por_pagar - montoNumerico;
      const estadoPago = nuevoSaldoPorPagar <= 0;

      const { error: updateError } = await supabase
        .from('factura_departamento')
        .update({ saldo_por_pagar: nuevoSaldoPorPagar, estado_pago: estadoPago })
        .eq('id_factura_departamento', factura.id_factura);

      if (updateError) {
        throw new Error(updateError.message || 'Error al actualizar la factura.');
      }

      onPagoGuardado();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleLiquidar = async () => {
    setGuardando(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('factura_departamento')
        .update({ saldo_por_pagar: 0, estado_pago: true })
        .eq('id_factura', factura.id_factura);

      if (updateError) {
        throw new Error(updateError.message || 'Error al liquidar la factura.');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Registrar Nuevo Pago</h2>
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
          />
        </div>
        {error && <p className="text-red-500 text-xs italic">{error}</p>}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleGuardarPago}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={guardando}
          >
            {guardando ? 'Guardando...' : 'Guardar Pago'}
          </button>
          <button
            type="button"
            onClick={handleLiquidar}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={guardando}
          >
            {guardando ? 'Liquidando...' : 'Liquidar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
