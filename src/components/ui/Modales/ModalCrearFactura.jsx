import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ModalCrearFactura = ({ departamento, onClose, onFacturaGenerada }) => {
  const [selectedTarifa, setSelectedTarifa] = useState(null);
  const [administracion, setAdministracion] = useState('');
  const [servicios, setServicios] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLatestTarifa = async () => {
      const { data, error } = await supabase
        .from('tarifa')
        .select('id_tarifa, precio_m3, nombre')
        .order('id_tarifa', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching latest tarifa:', error);
        setError('No se pudo cargar la tarifa más reciente. ' + error.message);
      } else if (data) {
        setSelectedTarifa(data);
      }
    };
    fetchLatestTarifa();
  }, []);

  const generateAndUploadPdf = async (facturaData) => {
    const doc = new jsPDF();

    // Add content to the PDF
    doc.text('Factura', 20, 20);
    doc.text(`Departamento: ${departamento.no_depto}`, 20, 30);
    doc.text(`Fecha: ${new Date(facturaData.fecha_factura).toLocaleDateString()}`, 20, 40);
    
    doc.autoTable({
      startY: 50,
      head: [['Concepto', 'Valor']],
      body: [
        ['Consumo Lectura', facturaData.consumo_lectura],
        ['Monto', `$${facturaData.monto.toFixed(2)}`],
        ['Administración', `$${parseFloat(administracion || 0).toFixed(2)}`],
        ['Otros Servicios', `$${parseFloat(servicios || 0).toFixed(2)}`],
        ['Total', `$${(facturaData.monto + parseFloat(administracion || 0) + parseFloat(servicios || 0)).toFixed(2)}`],
      ],
    });

    const pdfBlob = doc.output('blob');
    const fileName = `factura-${facturaData.id_factura}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('facturas')
      .upload(fileName, pdfBlob, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error('Error al subir el PDF: ' + uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from('facturas')
      .getPublicUrl(fileName);

    if (!publicUrlData) {
      throw new Error('No se pudo obtener la URL pública del PDF.');
    }

    return publicUrlData.publicUrl;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    if (!selectedTarifa || !departamento?.id_departamento) {
      setError("Por favor, seleccione una tarifa y asegúrese de que el departamento es válido.");
      setIsSaving(false);
      return;
    }

    try {
      // 1. Fetch last two readings
      const { data: lecturas, error: lecturasError } = await supabase
        .from('lectura')
        .select('id_lectura, valor_lectura')
        .eq('id_departamento', departamento.id_departamento)
        .order('fecha_lectura', { ascending: false })
        .order('id_lectura', { ascending: false })
        .limit(2);

      if (lecturasError) throw lecturasError;
      if (lecturas.length < 2) {
        throw new Error("No hay suficientes lecturas para calcular el consumo. Se necesitan al menos 2.");
      }

      const ultimaLectura = lecturas[0];
      const penultimaLectura = lecturas[1];

      // 2. Perform calculations
      const consumo_lectura = ultimaLectura.valor_lectura - penultimaLectura.valor_lectura;
      if (consumo_lectura < 0) {
        throw new Error("El consumo no puede ser negativo. Verifique las lecturas del medidor.");
      }
      const monto = consumo_lectura * selectedTarifa.precio_m3;

      // 3. Insert into pagos_extras (if applicable)
      if (administracion || servicios) {
        const { error: pagosExtrasError } = await supabase
          .from('pagos_extras')
          .insert({
            id_departamento: departamento.id_departamento,
            administracion: administracion ? parseFloat(administracion) : 0,
            servicios: servicios ? parseFloat(servicios) : 0,
          });
        if (pagosExtrasError) throw pagosExtrasError;
      }

      // 4. Insert into factura_departamento
      const facturaToInsert = {
        fecha_factura: new Date().toISOString(),
        consumo_lectura: consumo_lectura,
        monto: monto,
        estado_pago: false,
        saldo_por_pagar: monto,
        lectura_id_fin: ultimaLectura.id_lectura,
        departamento_id: departamento.id_departamento,
      };

      const { data: newFactura, error: facturaError } = await supabase
        .from('factura_departamento')
        .insert(facturaToInsert)
        .select()
        .single();

      if (facturaError) throw facturaError;

      // 5. Generate, upload PDF and update invoice
      const pdfUrl = await generateAndUploadPdf(newFactura);

      const { error: updateError } = await supabase
        .from('factura_departamento')
        .update({ url: pdfUrl })
        .eq('id_factura', newFactura.id_factura);

      if (updateError) throw updateError;

      // 6. Success
      alert('¡Factura generada exitosamente!');
      window.open(pdfUrl, '_blank');
      onFacturaGenerada();

    } catch (error) {
      console.error("Error al generar la factura:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Generar Factura para {departamento.no_depto}</h2>
        
        {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}

        {/* Tarifa Display */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">1. Tarifa Aplicada</label>
          <div className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-gray-100">
            {selectedTarifa ? `${selectedTarifa.nombre} ($${selectedTarifa.precio_m3}/m³)` : 'Cargando tarifa...'}
          </div>
        </div>

        {/* Pagos Extras */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">2. Pagos Extras (Opcional)</label>
          <div className="flex gap-4">
            <input
              type="number"
              placeholder="Administración"
              value={administracion}
              onChange={e => setAdministracion(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
            <input
              type="number"
              placeholder="Otros Servicios"
              value={servicios}
              onChange={e => setServicios(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedTarifa || isSaving}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-300"
          >
            {isSaving ? 'Guardando...' : 'Guardar y Generar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCrearFactura;
