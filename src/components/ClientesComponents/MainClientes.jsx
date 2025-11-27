import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import ModalContrato from "../ui/Modales/ModalContrato";
import ModalNuevoCliente from "../ui/Modales/ModalNuevoCliente";
import ModalReporteCliente from "../ui/Modales/ModalReporteCliente"; // <--- 1. IMPORTAR

export const MainClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  
  // Modales existentes
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [isNuevoClienteModalOpen, setIsNuevoClienteModalOpen] = useState(false);
  const [nuevoContrato, setNuevoContrato] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Nuevo estado para el reporte
  const [isReporteModalOpen, setIsReporteModalOpen] = useState(false); // <--- 2. ESTADO
  const [clienteParaReporte, setClienteParaReporte] = useState(null); // <--- 2. ESTADO

  const fetchClientes = async () => {
    // ... (Tu función fetchClientes existente se queda igual)
    setCargando(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("casa_habitacion")
        .select(
          "id_casa, nombre_cliente, apellido_cliente, calle, numero, colonia, telefono, id_contrato, delegacion, cp"
        );
      if (queryError) throw new Error(queryError.message);
      setClientes(data || []);
    } catch (err) {
      setError(err.message);
      setClientes([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleModify = (id) => {
    const cliente = clientes.find((c) => c.id_casa === id);
    setClienteSeleccionado(cliente);
    setIsNuevoClienteModalOpen(true);
  };

  const handleDelete = async (id) => {
     // ... (Tu función handleDelete existente se queda igual)
     const isConfirmed = window.confirm("¿Eliminar registro y cargas asociadas?");
     if (!isConfirmed) return;
     
     const { error: cargaError } = await supabase.from("carga_casa").delete().eq("id_casa", id);
     if (cargaError) { alert("Error al eliminar cargas."); return; }

     const { error: casaError } = await supabase.from("casa_habitacion").delete().eq("id_casa", id);
     if (casaError) { alert("Error al eliminar cliente."); } 
     else {
        setClientes((curr) => curr.filter((i) => i.id_casa !== id));
        alert("Eliminado correctamente.");
     }
  };

  // --- 3. NUEVA FUNCIÓN PARA ABRIR REPORTE ---
  const handleRowClick = (cliente) => {
    setClienteParaReporte(cliente);
    setIsReporteModalOpen(true);
  };

  // ... (Tus funciones de filtrado y manejo de modales existentes se quedan igual)
  const clientesFiltrados = clientes.filter((cliente) => {
    const textoBusqueda = busqueda.toLowerCase();
    return (
      cliente.nombre_cliente?.toLowerCase().includes(textoBusqueda) ||
      cliente.apellido_cliente?.toLowerCase().includes(textoBusqueda) ||
      cliente.calle?.toLowerCase().includes(textoBusqueda) ||
      cliente.colonia?.toLowerCase().includes(textoBusqueda)
    );
  });

  const handleOpenContratoModal = () => setIsContratoModalOpen(true);
  const handleCloseContratoModal = () => setIsContratoModalOpen(false);
  const handleOpenNuevoClienteModal = () => { setClienteSeleccionado(null); setIsNuevoClienteModalOpen(true); };
  const handleCloseNuevoClienteModal = () => { setIsNuevoClienteModalOpen(false); setClienteSeleccionado(null); fetchClientes(); };
  const handleContratoSaved = (contrato) => { setNuevoContrato(contrato); handleCloseContratoModal(); handleOpenNuevoClienteModal(); };

  return (
    <main>
      <Titulo Texto="Tus Clientes" />
      <section className="m-auto max-w-5xl p-4">
        {/* ... (Tu barra de búsqueda y botones se quedan igual) ... */}
        <div className="flex flex-col items-center gap-4 bg-white shadow-2xl rounded-lg p-4 md:flex-row md:justify-between md:items-center">
            {/* Input busqueda */}
            <div className="grow w-full">
                <input type="text" placeholder="Buscar cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="p-2 border hover:bg-[#6432e4] hover:text-white border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full"/>
            </div>
            {/* Botones */}
            <div className="flex flex-col-reverse items-center gap-2 md:flex-row">
                <Link to="/dashboard" className="flex bg-[#6432e4] text-white items-center gap-2 p-2 border border-gray-300 rounded-md shadow-sm hover:bg-linear-to-r from-[#5180f6] to-[#9777e9] transition-all"><Icon icon="line-md:arrow-left-circle-twotone" width="24" /> Regresar</Link>
                <button onClick={handleOpenContratoModal} className="flex p-2 border bg-[#6432e4] text-white gap-4 border-gray-300 rounded-md shadow-sm hover:bg-linear-to-r from-[#5180f6] to-[#9777e9] transition-all"><Icon icon="line-md:account-add" width="24" /> Nuevo Cliente</button>
            </div>
        </div>

        <h2 className="text-2xl font-bold mb-4 mt-4 text-center text-black/70">
          Clientes Casa Habitación
        </h2>
        
        {/* TABLA DE CLIENTES */}
        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
            <thead>
              <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">ID</th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">Cliente</th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">Direccion</th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">Teléfono</th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="5" className="py-4 px-4 text-center text-gray-600">Cargando...</td></tr>
              ) : clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id_casa}
                    onClick={() => handleRowClick(cliente)} // <--- 4. EVENTO CLICK EN FILA
                    className="hover:bg-blue-100 transition-all duration-150 cursor-pointer border-b border-gray-200" // Agregué cursor-pointer y hover más notorio
                    title="Clic para ver reporte de consumo"
                  >
                    <td className="py-3 px-6 text-left text-sm text-gray-500">{cliente.id_casa}</td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700 font-medium">
                      {cliente.nombre_cliente} {cliente.apellido_cliente}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      {cliente.calle} #{cliente.numero}, {cliente.colonia}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">{cliente.telefono}</td>
                    
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // <--- 5. EVITA QUE SE ABRA EL REPORTE AL EDITAR
                            handleModify(cliente.id_casa);
                          }}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1 hover:scale-105 transition-transform"
                        >
                          <Icon icon="line-md:edit-full-twotone" width="24" /> Modificar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // <--- 5. EVITA QUE SE ABRA EL REPORTE AL ELIMINAR
                            handleDelete(cliente.id_casa);
                          }}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1 hover:scale-105 transition-transform"
                        >
                          <Icon icon="line-md:close-circle-twotone" width="24" /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="py-4 px-4 text-center text-gray-500">No se encontraron clientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODALES ANTERIORES */}
      <ModalContrato isOpen={isContratoModalOpen} onClose={handleCloseContratoModal} onSave={handleContratoSaved} />
      <ModalNuevoCliente isOpen={isNuevoClienteModalOpen} onClose={handleCloseNuevoClienteModal} contrato={nuevoContrato} cliente={clienteSeleccionado} />
      
      {/* NUEVO MODAL DE REPORTE */}
      <ModalReporteCliente 
        isOpen={isReporteModalOpen} 
        onClose={() => setIsReporteModalOpen(false)} 
        cliente={clienteParaReporte} 
      />
    </main>
  );
};