import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Icon } from '@iconify/react';

const ModalCargaAutotanque = ({ isOpen, onClose, registradorId, onCargaSuccess }) => {
  const [precio, setPrecio] = useState('');
  const [litros, setLitros] = useState('');
  const [monto, setMonto] = useState(0);
  const [porcentajeInicial, setPorcentajeInicial] = useState('');
  const [fotoInicial, setFotoInicial] = useState(null);
  const [porcentajeFinal, setPorcentajeFinal] = useState('');
  const [fotoFinal, setFotoFinal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (precio && litros) {
      setMonto(parseFloat(precio) * parseFloat(litros));
    } else {
      setMonto(0);
    }
  }, [precio, litros]);

  const handleFileChange = (e, setFoto) => {
    if (e.target.files[0]) {
      setFoto(e.target.files[0]);
    }
  };

  const uploadFoto = async (foto, registroId, tipo) => {
    if (!foto) return null;

    const today = new Date();
    const fileName = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}_${registroId}_${tipo}_${foto.name}`;
    const filePath = `fotos_diarias/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('fotos_diarias')
      .upload(filePath, foto);

    if (uploadError) {
      throw new Error(`Error al subir la foto: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('fotos_diarias').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!precio || !litros || !porcentajeInicial || !fotoInicial || !porcentajeFinal || !fotoFinal) {
      setErrorMsg('Todos los campos y fotos son requeridos.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const calculatedMonto = parseFloat(precio) * parseFloat(litros);

      const cargaData = {
        fecha: today,
        precio: parseFloat(precio),
        litros: parseFloat(litros),
        monto: calculatedMonto,
        porcentaje_inicial: parseFloat(porcentajeInicial),
        porcentaje_final: parseFloat(porcentajeFinal),
        registrador_id: registradorId,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('carga_autotanque')
        .insert(cargaData)
        .select('id')
        .single();

      if (insertError) throw insertError;

      const cargaId = insertedData.id;

      const url_inicial = await uploadFoto(fotoInicial, cargaId, 'carga_inicial');
      const url_final = await uploadFoto(fotoFinal, cargaId, 'carga_final');

      const { error: updateError } = await supabase
        .from('carga_autotanque')
        .update({ url_inicial, url_final })
        .eq('id', cargaId);

      if (updateError) throw updateError;

      setSuccessMsg('Carga de autotanque registrada con éxito.');
      setTimeout(() => {
        onCargaSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error al registrar la carga:', error);
      setErrorMsg(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 transform transition-all duration-300">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <Icon icon="hugeicons:tanker-truck" width="28" />
            Registrar Carga de Autotanque
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-600 transition-colors">
            <Icon icon="line-md:close" width="24" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio por Litro</label>
              <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Litros</label>
              <input type="number" step="0.01" value={litros} onChange={(e) => setLitros(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
            </div>
          </div>
          <div className="p-3 bg-gray-100 rounded-lg text-center">
            <h4 className="text-lg font-semibold text-green-500">Monto Total: ${monto.toFixed(2)}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <label className="block text-sm font-medium text-gray-700">Porcentaje Inicial</label>
              <input type="number" step="0.01" value={porcentajeInicial} onChange={(e) => setPorcentajeInicial(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
              <label className="block text-sm font-medium text-gray-700 mt-2">Foto Inicial</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setFotoInicial)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" required />
            </div>
            <div className="p-3 border rounded-lg">
              <label className="block text-sm font-medium text-gray-700">Porcentaje Final</label>
              <input type="number" step="0.01" value={porcentajeFinal} onChange={(e) => setPorcentajeFinal(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
              <label className="block text-sm font-medium text-gray-700 mt-2">Foto Final</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setFotoFinal)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" required />
            </div>
          </div>
          {errorMsg && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{errorMsg}</div>}
          {successMsg && <div className="p-3 bg-green-100 text-green-700 rounded-lg">{successMsg}</div>}
          <div className="mt-6 pt-4 border-t flex justify-end">
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400">
              <Icon icon={isSubmitting ? "line-md:loading-loop" : "line-md:confirm-circle"} width="24" />
              {isSubmitting ? 'Guardando...' : 'Guardar Carga'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCargaAutotanque;
