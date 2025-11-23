import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

// Iconos SVG simples para no depender de librerías externas
const IconBuilding = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ModalNuevoEdificio = ({ isOpen, onClose, contrato, onEdificioGuardado, edificio: edificioAEditar }) => {
  const [edificio, setEdificio] = useState({
    responsable_nombre: '',
    responsable_telefono: '',
    calle: '',
    numero: '',
    colonia: '',
    delegacion: '',
    cp: '',
  });

  const [coloniasDisponibles, setColoniasDisponibles] = useState([]);
  const [cargandoCP, setCargandoCP] = useState(false);
  const isEditMode = Boolean(edificioAEditar);

  const idContrato = contrato?.id_contrato;

  // Resetea el form cuando se abre/cierra o cambia el modo
  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setEdificio({
          responsable_nombre: edificioAEditar.responsable_nombre || '',
          responsable_telefono: edificioAEditar.responsable_telefono || '',
          calle: edificioAEditar.calle || '',
          numero: edificioAEditar.numero || '',
          colonia: edificioAEditar.colonia || '',
          delegacion: edificioAEditar.delegacion || '',
          cp: edificioAEditar.cp || '',
        });
      } else {
        // Limpiar para nuevo edificio
        setEdificio({
          responsable_nombre: '',
          responsable_telefono: '',
          calle: '',
          numero: '',
          colonia: '',
          delegacion: '',
          cp: '',
        });
        setColoniasDisponibles([]);
      }
    }
  }, [isOpen, edificioAEditar, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEdificio((prev) => ({ ...prev, [name]: value }));
  };

  // Lógica especial para el CP
  const handleCPChange = async (e) => {
    const cpIngresado = e.target.value;
    
    // Permitir solo números y actualizar estado
    if (!/^\d*$/.test(cpIngresado)) return;

    setEdificio(prev => ({ ...prev, cp: cpIngresado }));

    // Si tiene 5 dígitos, buscar información
    if (cpIngresado.length === 5) {
      setCargandoCP(true);
      try {
        // NOTA: Estoy usando la API pública de Copomex con el token de pruebas.
        // Para producción, deberías obtener tu propio token o usar tu propia BD en Supabase.
        const response = await fetch(`https://api.copomex.com/query/info_cp/${cpIngresado}?token=20040ebb-6c71-494d-a8ce-f926fceded6a`);
        const data = await response.json();

        if (!data.error) {
          // La API devuelve un array de asentamientos (colonias)
          const listaColonias = data.map(item => item.response.asentamiento);
          const delegacion = data[0].response.municipio;

          setColoniasDisponibles(data); // Guardamos toda la info
          setEdificio(prev => ({
            ...prev,
            delegacion: delegacion,
            colonia: '' // Reiniciar colonia para que el usuario elija
          }));
        } else {
          console.warn("CP no encontrado o error en API");
          setColoniasDisponibles([]);
        }
      } catch (error) {
        console.error("Error fetching CP:", error);
      } finally {
        setCargandoCP(false);
      }
    } else {
      // Si borra el CP, limpiamos las opciones
      setColoniasDisponibles([]);
      setEdificio(prev => ({ ...prev, delegacion: '', colonia: '' }));
    }
  };

  // Manejar selección de colonia del dropdown
  const handleColoniaChange = (e) => {
    setEdificio(prev => ({ ...prev, colonia: e.target.value }));
  };

  const handleGuardarEdificio = async () => {
    if (isEditMode) {
      // Lógica de Actualización
      try {
        const { data, error } = await supabase
          .from('edificio')
          .update(edificio)
          .eq('id_edificio', edificioAEditar.id_edificio)
          .select();

        if (error) throw error;

        console.log('Edificio actualizado:', data);
        onEdificioGuardado();
        onClose();
      } catch (error) {
        console.error('Error al actualizar:', error.message);
        alert('Error al actualizar el edificio: ' + error.message);
      }
    } else {
      // Lógica de Creación
      if (!idContrato) {
        alert('Error: No hay contrato asociado.');
        return;
      }
      if (!edificio.calle || !edificio.colonia || !edificio.cp) {
        alert('Por favor completa la dirección.');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('edificio')
          .insert([{
              id_contrato: idContrato,
              ...edificio,
              estado: true,
          }])
          .select();

        if (error) throw error;

        console.log('Edificio guardado:', data);
        onEdificioGuardado();
        onClose();
      } catch (error) {
        console.error('Error al guardar:', error.message);
        alert('Error al guardar el edificio: ' + error.message);
      }
    }
  };

  const handleCancel = async () => {
    if (isEditMode) {
      onClose();
      return;
    }
    
    // Si no hay contrato, solo cerrar
    if (!idContrato) {
      onClose();
      return;
    }

    const isConfirmed = window.confirm("¿Cancelar? Se eliminará el contrato creado.");
    if (isConfirmed) {
      try {
        await supabase.from('contrato').delete().eq('id_contrato', idContrato);
        console.log('Contrato eliminado.');
      } catch (error) {
        console.error(error);
      } finally {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 flex flex-col overflow-hidden animate-fadeInUp">
        
        {/* Header */}
        <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <IconBuilding />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{isEditMode ? 'Modificar Edificio' : 'Nuevo Edificio'}</h2>
              <p className="text-sm text-gray-500">Complete la información para dar de alta el servicio.</p>
            </div>
          </div>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          
          {/* Sección Contrato (Read Only) - Oculta en modo edición */}
          {!isEditMode && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    No. Contrato
                  </label>
                  <div className="w-full bg-blue-50 text-blue-800 font-mono font-semibold py-2 px-3 rounded border border-blue-100">
                    #{idContrato || '---'}
                  </div>
                </div>
              </div>
              <hr className="border-gray-100" />
            </>
          )}

          {/* Sección Responsable */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              Datos del Responsable
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  name="responsable_nombre" 
                  value={edificio.responsable_nombre} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                <input 
                  type="tel" 
                  name="responsable_telefono" 
                  value={edificio.responsable_telefono} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ej. 55 1234 5678"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Sección Dirección */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              Dirección del Inmueble
            </h3>
            
            <div className="grid grid-cols-12 gap-4">
              {/* Calle y Número */}
              <div className="col-span-8">
                <label className="block text-xs text-gray-500 mb-1">Calle</label>
                <input 
                  type="text" 
                  name="calle" 
                  value={edificio.calle} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Nombre de la calle"
                />
              </div>
              <div className="col-span-4">
                <label className="block text-xs text-gray-500 mb-1">Número</label>
                <input 
                  type="text" 
                  name="numero" 
                  value={edificio.numero} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="#"
                />
              </div>

              {/* CP (Trigger de búsqueda) */}
              <div className="col-span-4 relative">
                <label className="block text-xs text-gray-500 mb-1">C.P.</label>
                <input 
                  type="text" 
                  name="cp" 
                  maxLength="5"
                  value={edificio.cp} 
                  onChange={handleCPChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                  placeholder="00000"
                />
                {cargandoCP && (
                   <div className="absolute right-3 top-8 animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                )}
              </div>

              {/* Colonia (Select) */}
              <div className="col-span-8">
                <label className="block text-xs text-gray-500 mb-1">Colonia</label>
                <select
                  name="colonia"
                  value={edificio.colonia}
                  onChange={handleColoniaChange}
                  disabled={coloniasDisponibles.length === 0 && !isEditMode}
                  className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white ${coloniasDisponibles.length === 0 && !isEditMode ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                >
                  <option value="">{coloniasDisponibles.length > 0 ? 'Selecciona una colonia' : (isEditMode ? edificio.colonia : 'Ingresa CP primero')}</option>
                  {coloniasDisponibles.map((item, index) => (
                    <option key={index} value={item.response.asentamiento}>
                      {item.response.asentamiento}
                    </option>
                  ))}
                  {isEditMode && !coloniasDisponibles.find(c => c.response.asentamiento === edificio.colonia) && (
                    <option value={edificio.colonia}>{edificio.colonia}</option>
                  )}
                </select>
              </div>

              {/* Delegación (Auto) */}
              <div className="col-span-12">
                <label className="block text-xs text-gray-500 mb-1">Delegación / Municipio</label>
                <input 
                  type="text" 
                  name="delegacion" 
                  value={edificio.delegacion} 
                  readOnly
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 text-gray-600 cursor-not-allowed"
                  placeholder="Se llena automáticamente"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardarEdificio}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
          >
            {isEditMode ? 'Guardar Cambios' : 'Guardar Edificio'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalNuevoEdificio;