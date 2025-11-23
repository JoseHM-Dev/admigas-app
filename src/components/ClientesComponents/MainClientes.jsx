import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import ModalContrato from "../ui/Modales/ModalContrato";
import ModalNuevoCliente from "../ui/Modales/ModalNuevoCliente";

export const MainClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [isContratoModalOpen, setIsContratoModalOpen] = useState(false);
  const [isNuevoClienteModalOpen, setIsNuevoClienteModalOpen] = useState(false);
  const [nuevoContrato, setNuevoContrato] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const fetchClientes = async () => {
    setCargando(true);
    setError(null);
try {
      const { data, error: queryError } = await supabase
        .from("casa_habitacion")
        .select(
          "id_casa, nombre_cliente, apellido_cliente, calle, numero, colonia, telefono, id_contrato, delegacion, cp"
        );
      if (queryError) {
        throw new Error(queryError.message || "Error al obtener los clientes.");
      }

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
    // Optional: Add a confirmation dialog
    const isConfirmed = window.confirm(
      "¿Estás seguro de que quieres eliminar este registro? Se borrarán también todas sus cargas asociadas."
    );
    if (!isConfirmed) {
      return;
    }
// First, delete related records in 'carga_casa'
    const { error: cargaError } = await supabase
      .from("carga_casa")
      .delete()
      .eq("id_casa", id);

    if (cargaError) {
      console.error("Error deleting related items in carga_casa:", cargaError);
      alert("Hubo un error al eliminar las cargas asociadas al cliente.");
      return; // Stop if we can't delete the related records
    }

    // If related records are deleted, proceed to delete the main record
    const { error: casaError } = await supabase
      .from("casa_habitacion")
      .delete()
      .eq("id_casa", id);

    if (casaError) {
      console.error("Error deleting item from casa_habitacion:", casaError);
      alert("Hubo un error al eliminar el cliente.");
    } else {
      // Update the UI by removing the item from the state
      setClientes((currentList) =>
        currentList.filter((item) => item.id_casa !== id)
      );
      console.log("Item and related charges deleted successfully with id:", id);
      alert("Cliente y sus cargas asociadas eliminados correctamente.");
    }
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    const textoBusqueda = busqueda.toLowerCase();
    return (
      cliente.nombre_cliente?.toLowerCase().includes(textoBusqueda) ||
      cliente.apellido_cliente?.toLowerCase().includes(textoBusqueda) ||
      cliente.calle?.toLowerCase().includes(textoBusqueda) ||
      cliente.numero?.toLowerCase().includes(textoBusqueda) ||
      cliente.colonia?.toLowerCase().includes(textoBusqueda) ||
      cliente.telefono?.toString().includes(textoBusqueda)
    );
  });
  const handleOpenContratoModal = () => setIsContratoModalOpen(true);
  const handleCloseContratoModal = () => setIsContratoModalOpen(false);

  const handleOpenNuevoClienteModal = () => {
    setClienteSeleccionado(null);
    setIsNuevoClienteModalOpen(true);
  };

  const handleCloseNuevoClienteModal = () => {
    setIsNuevoClienteModalOpen(false);
    setClienteSeleccionado(null);
    fetchClientes(); // Actualiza la lista de clientes cuando se cierra el modal
  };

  const handleContratoSaved = (contrato) => {
    setNuevoContrato(contrato);
    handleCloseContratoModal();
    handleOpenNuevoClienteModal();
  };

  return (
    <main>
      <Titulo Texto="Tus Clientes" />
<section className="m-auto max-w-5xl p-4">
        <div className="flex flex-col items-center gap-4 bg-white shadow-2xl rounded-lg p-4 md:flex-row md:justify-between md:items-center">
          <div className="grow">
            <input
              type="text"
              placeholder="Buscar cliente por nombre, apellido, calle..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="p-2 border hover:bg-[#6432e4] hover:text-white border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full"
            />
          </div>
          <div className="flex flex-col-reverse items-center gap-2 md:flex-row">
            <Link
              to="/dashboard"
              className="flex bg-[#6432e4] text-white items-center gap-2 p-2 border border-gray-300 rounded-md shadow-sm hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300"
            >
              <Icon icon="line-md:arrow-left-circle-twotone" width="24" />
              Regresar
            </Link>
            <button
              onClick={handleOpenContratoModal}
              className="flex p-2 border bg-[#6432e4] text-white gap-4 border-gray-300 rounded-md shadow-sm hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300 hover:cursor-pointer"
            >
              <Icon icon="line-md:account-add" width="24" />
              Nuevo Cliente
            </button>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4 mt-4 text-center text-black/70">
          Clientes Casa Habitación
        </h2>
        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
            <thead>
              <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  ID Casa
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Cliente
                </th>
<th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Direccion
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-4 px-4 text-center text-gray-600"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-4 px-4 text-center text-red-500"
                  >
                    Error: {error}
                  </td>
                </tr>
              ) : clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id_casa}
                    className="hover:bg-blue-50 transition-all duration-150 "
                  >
                    <td className="py-3 px-6 text-left text-sm text-gray-500">
                      {cliente.id_casa}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      {cliente.nombre_cliente} {cliente.apellido_cliente}
                    </td>

                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      {cliente.calle} #{cliente.numero}, {cliente.colonia}
                    </td>

                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      {cliente.telefono}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleModify(cliente.id_casa)}
                          className=" text-green-600 hover:text-green-900 flex items-center gap-1 hover:cursor-pointer"
                        >
                          <Icon icon="line-md:edit-full-twotone" width="24" />
                          Modificar
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.id_casa)}
                          className=" text-red-600 hover:text-red-900 flex items-center gap-1 hover:cursor-pointer"
                        >
                          <Icon
                            icon="line-md:close-circle-twotone"
                            width="24"
                          />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="py-4 px-4 text-center text-gray-500"
                  >
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ModalContrato
        isOpen={isContratoModalOpen}
        onClose={handleCloseContratoModal}
        onSave={handleContratoSaved}
      />

      <ModalNuevoCliente
        isOpen={isNuevoClienteModalOpen}
        onClose={handleCloseNuevoClienteModal}
        contrato={nuevoContrato}
        cliente={clienteSeleccionado}
      />
    </main>
  );
};
