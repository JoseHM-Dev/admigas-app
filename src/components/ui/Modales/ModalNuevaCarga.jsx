import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Icon } from '@iconify/react';

const getLocalDateString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().split('T')[0];
};

const ModalNuevaCarga = ({ isOpen, onClose, edificio, onCargaGuardada }) => {
  const [fechaCarga, setFechaCarga] = useState(getLocalDateString());
  const [consumoLitros, setConsumoLitros] = useState('');
  const [precioLitro, setPrecioLitro] = useState(null);
  const [montoTotal, setMontoTotal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrecioLitro = async () => {
      if (!isOpen) return;
      setError('');
      try {
        const { data, error } = await supabase
          .from('tarifa')
          .select('precio_litro')
          .lte('fecha_vigente', new Date().toISOString())
          .order('fecha_vigente', { ascending: false })
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          setPrecioLitro(data[0].precio_litro);
        } else {
          setError('No se pudo encontrar un precio por litro. Por favor, configure una tarifa.');
          setPrecioLitro(0);
        }
      } catch (error) {
        console.error('Error fetching precio_litro:', error);
        setError('Error al cargar el precio por litro.');
        setPrecioLitro(0);
      }
    };

    fetchPrecioLitro();
  }, [isOpen]);

  useEffect(() => {
    const litros = parseFloat(consumoLitros);
    const precio = parseFloat(precioLitro);
    if (!isNaN(litros) && !isNaN(precio)) {
      setMontoTotal(litros * precio);
    } else {
      setMontoTotal(0);
    }
  }, [consumoLitros, precioLitro]);

  const resetForm = () => {
    setFechaCarga(getLocalDateString());
    setConsumoLitros('');
    setMontoTotal(0);
    setIsSaving(false);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSaveCarga = async (e) => {
    e.preventDefault();
    if (!edificio || !consumoLitros || montoTotal <= 0) {
      setError('Por favor, complete todos los campos y asegúrese de que el monto sea válido.');
      return;
    }
    setIsSaving(true);
    setError('');

    try {
      const cargaData = {
        id_edificio: edificio.id_edificio,
        fecha_carga: fechaCarga,
        consumo_litros: parseFloat(consumoLitros),
        monto_total: montoTotal,
      };

      const { error: insertError } = await supabase.from('carga_edificio').insert([cargaData]);

      if (insertError) throw insertError;

      alert('¡Carga guardada con éxito!');
      if(onCargaGuardada) onCargaGuardada();
      handleClose();
    } catch (error) {
      console.error('Error saving carga:', error);
      setError(`Error al guardar la carga: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl relative">
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <Icon icon="mdi:close" width="24" />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center text-[#4677F8]">Registrar Nueva Carga a Edificio</h2>
        
        <div className="mb-4 bg-blue-100 p-3 rounded-md text-center">
          <p className="font-medium text-gray-800">Edificio: <span className="font-bold">{edificio?.responsable_nombre}</span></p>
          <p className="text-sm text-gray-600">{edificio?.calle} #{edificio?.numero}, {edificio?.colonia}</p>
        </div>

        <form onSubmit={handleSaveCarga} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fechaCarga" className="block font-medium text-gray-700">Fecha de Carga</label>
              <input type="date" id="fechaCarga" value={fechaCarga} onChange={(e) => setFechaCarga(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md mt-1" />
            </div>
            
            <div>
              <label htmlFor="consumoLitros" className="block font-medium text-gray-700">Consumo (Litros)</label>
              <input type="number" step="0.01" id="consumoLitros" placeholder="Ej: 1500.50" value={consumoLitros} onChange={(e) => setConsumoLitros(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md mt-1" />
            </div>
          </div>

          <div className="bg-gray-100 p-3 rounded-md">
            <div className='flex justify-between items-center'>
              <label className="block font-medium text-gray-700">Monto Total</label>
              <span className='text-sm text-gray-500'>
                Precio por litro: ${precioLitro !== null ? parseFloat(precioLitro).toFixed(2) : 'Calculando...'}
              </span>
            </div>
            <p className="text-2xl font-bold text-right text-green-600">
              {montoTotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
            </p>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div className="flex justify-end gap-4 pt-4">
            <button type="submit" disabled={isSaving || precioLitro === null} className="flex items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">
              <Icon icon="mdi:content-save" />
              {isSaving ? 'Guardando...' : 'Guardar Carga'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNuevaCarga;