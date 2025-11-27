import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Titulo } from '../ui/Titulo';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import ModalNuevaVenta from '../ui/Modales/ModalNuevaVenta';

export const MainVentas = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  today.setMinutes(today.getMinutes() - offset);
  
  const [fechaSeleccionada, setFechaSeleccionada] = useState(today.toISOString().split('T')[0]);
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [listaDiaria, setListaDiaria] = useState([]);
  const [selectedVenta] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // NUEVO ESTADO: Para guardar la URL del PDF
  const [reportePdfUrl, setReportePdfUrl] = useState(null);

  const fetchVentas = useCallback(async () => {
    if (!fechaSeleccionada) {
      setVentas([]);
      setReportePdfUrl(null); // Limpiar URL si no hay fecha
      return;
    }

    // 1. Obtener Lista Diaria (Tu lógica existente)
    const listaDiaria = await supabase.rpc("get_lista_diaria", { p_fecha: fechaSeleccionada });
    setListaDiaria(listaDiaria.data || []);

    setCargando(true);
    setError(null);
    setReportePdfUrl(null); // Resetear URL mientras carga

    try {
      // 2. NUEVA LÓGICA: Buscar el reporte PDF en reporte_diario
      // NOTA: Asegúrate que la columna de fecha en 'reporte_diario' se llame 'fecha'. 
      // Si se llama 'created_at' o 'fecha_reporte', cámbialo aquí.
      const { data: reporteData, error: reporteError } = await supabase
        .from('reporte_diario')
        .select('url')
        .eq('fecha', fechaSeleccionada) // <--- Verifica el nombre de tu columna de fecha en la BD
        .maybeSingle(); 

      if (!reporteError && reporteData) {
        setReportePdfUrl(reporteData.url);
      }

      // 3. Obtener las Ventas (Tu lógica existente)
      const fechaInicio = `${fechaSeleccionada}T00:00:00.000Z`;
      const fechaFin = `${fechaSeleccionada}T23:59:59.999Z`;

      const { data, error: queryError } = await supabase
        .from('carga_casa')
        .select(`
          id_carga,
          fecha_carga,
          consumo_litros,
          ret,
          monto_total,
          casa_habitacion (
            calle,
            numero,
            colonia
          )
        `)
        .gte('fecha_carga', fechaInicio)
        .lte('fecha_carga', fechaFin)
        .order('fecha_carga', { ascending: false });

      if (queryError) {
        throw new Error(queryError.message || 'Error al obtener las ventas.');
      }

      setVentas(data || []);

    } catch (err) {
      setError(err.message);
      setVentas([]);
    } finally {
      setCargando(false);
    }
  }, [fechaSeleccionada]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm(
      "¿Estás seguro de que quieres eliminar este registro?"
    );
    if (!isConfirmed) {
      return;
    }

    const { error } = await supabase
      .from("carga_casa")
      .delete()
      .eq("id_carga", id);

    if (error) {
      console.error("Error deleting item:", error);
      alert("Hubo un error al eliminar el registro.");
    } else {
      setVentas((currentList) =>
        currentList.filter((item) => item.id_carga !== id)
      );
      console.log("Item deleted successfully with id:", id);
    }
  };

  const handleOpenModal = () => setIsModalOpen(true);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  const handleVentaGuardada = async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const fechaLocal = `${year}-${month}-${day}`;

    const { data, error } = await supabase.rpc("get_lista_diaria", { p_fecha: fechaLocal });

    if (error) {
      console.error("Error fetching lista diaria:", error);
    } else {
      setListaDiaria(data);
      fetchVentas(); 
    }
  };

  return (
    <main>
      <Titulo Texto='Tus Ventas' />
      
      <section className="m-auto max-w-5xl p-4">
        {/* Controles Superiores */}
        <div className="flex flex-col items-center gap-2 bg-white shadow-2xl rounded-4xl p-4 md:flex-row md:justify-between md:items-center transition-all duration-200">
          <div className='flex flex-col gap-2 md:flex-row md:items-center'>
            <label htmlFor="fecha-venta" className="font-bold text-gray-700">Selecciona una fecha:</label>
            <input 
              type="date" 
              id="fecha-venta"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="p-2 border bg-[#ad9ade] text-white border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:cursor-pointer hover:bg-white hover:text-black/70 transition-all duration-300 "
            />
          </div>
          <div className="flex flex-col-reverse items-center gap-2 md:flex-row">
            <Link to="/dashboard" className="flex bg-[#6432e4] text-white items-center gap-2 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300 hover:cursor-pointer">
              <Icon icon="line-md:arrow-left-circle-twotone" width="24" />
              Regresar a Dashboard
            </Link>
            <button 
              onClick={handleOpenModal}
              className="flex p-2 border gap-4 m-3 font-bold bg-[#6432e4] text-white  border-black rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
            >
              <Icon icon="line-md:clipboard-plus-twotone" width="24"  />
              Nueva Venta
            </button>
          </div>
        </div>

        <h2 className="font-extrabold flex justify-center text-3xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-8  transition-all duration-200 animate-pulse">
          Resultados de Ventas
        </h2>
        
        {/* Tabla de Ventas */}
        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
            <thead>
              <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">ID Carga</th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">Fecha Carga</th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">Direccion</th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">Consumo (Lts)</th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">Ret (Lts)</th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">Monto Total</th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan="8" className="py-4 px-4 text-center text-gray-600">Cargando...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="py-4 px-4 text-center text-red-500">Error: {error}</td>
                </tr>
              ) : ventas.length > 0 ? (
                ventas.map((venta) => (
                  <tr
                    key={venta.id_carga}
                    className="hover:bg-blue-50 transition-all duration-150 "
                  >
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">{venta.id_carga}</td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">{venta.fecha_carga}</td>
                    <td className="py-3 px-6 text-left text-sm text-gray-500">{venta.casa_habitacion?.calle || 'N/A'} #{venta.casa_habitacion?.numero || 'N/A'}, {venta.casa_habitacion?.colonia || 'N/A'}</td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">{venta.consumo_litros} lts</td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">{venta.ret} lts</td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">$ {venta.monto_total}</td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleDelete(venta.id_carga)}
                          className=" text-red-600 hover:text-red-900 flex items-center gap-1 hover:cursor-pointer"
                        >
                          <Icon icon="line-md:close-circle-twotone" width="24" />Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-4 px-4 text-center text-gray-500">
                    No hay ventas registradas para esta fecha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- NUEVO BOTÓN DE DESCARGA DE REPORTE --- */}
        <div className="flex justify-end mt-6">
          {reportePdfUrl ? (
            <a 
              href={reportePdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 hover:-translate-y-1 transition-all duration-200"
            >
              <Icon icon="mdi:file-pdf-box" width="24" />
              Descargar Reporte del Día ({fechaSeleccionada})
            </a>
          ) : (
            <div className="flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-500 font-bold rounded-lg cursor-not-allowed">
              <Icon icon="mdi:file-pdf-box" width="24" />
              Reporte no disponible
            </div>
          )}
        </div>

      </section>

      <ModalNuevaVenta
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        venta={selectedVenta}
        onVentaGuardada={handleVentaGuardada}
      />

      <section className='bg-yellow-400 hidden'>
        listaDiaria {JSON.stringify(listaDiaria)}
      </section>
      
    </main>
  );
}