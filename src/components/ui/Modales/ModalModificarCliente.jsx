import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";

const ModalModificarCliente = ({ isOpen, onClose, clienteId }) => {
  const [cliente, setCliente] = useState({
    nombre_cliente: "",
    apellido_cliente: "",
    telefono: "",
    calle: "",
    numero: "",
    colonia: "",
    delegacion: "",
    cp: "",
  });

  useEffect(() => {
    if (isOpen && clienteId) {
      const fetchCliente = async () => {
        const { data, error } = await supabase
          .from("casa_habitacion")
          .select("*")
          .eq("id_casa", clienteId)
          .single();

        if (error) {
          console.error("Error fetching client data:", error);
        } else {
          setCliente(data);
        }
      };
      fetchCliente();
    }
  }, [isOpen, clienteId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCliente((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardarCambios = async () => {
    try {
      const { data, error } = await supabase
        .from("casa_habitacion")
        .update(cliente)
        .eq("id_casa", clienteId);

      if (error) {
        throw error;
      }

      console.log("Cliente actualizado:", data);
      onClose();
    } catch (error) {
      console.error("Error al actualizar el cliente:", error.message);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg m-4 max-w-[700px] flex flex-col items-center]">
        <h2 className="font-extrabold flex justify-center text-3xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-8 hover:scale-105 transition-all duration-200 animate-pulse">
          Modificar Cliente
        </h2>

        <div className="mb-4 flex flex-col items-center gap-2">
          <h3 className="text-lg font-semibold">ID Cliente</h3>
          <input
            type="text"
            value={clienteId || ""}
            readOnly
            className="border p-2 rounded bg-gray-100 text-center"
          />
        </div>

        <div className="mb-4 flex flex-col gap-2">
          <h3 className="text-lg font-semibold border-b-2 border-gray-300 m-2 text-center ">
            Cliente
          </h3>
          <div className="flex flex-col w-[500px] gap-4  ">
            <input
              type="text"
              name="nombre_cliente"
              placeholder="Nombre"
              value={cliente.nombre_cliente}
              onChange={handleChange}
              className="border p-2 rounded text-center"
            />
            <input
              type="text"
              name="apellido_cliente"
              placeholder="Apellido"
              value={cliente.apellido_cliente}
              onChange={handleChange}
              className="border p-2 rounded text-center"
            />
            <input
              type="text"
              name="telefono"
              placeholder="Teléfono"
              value={cliente.telefono}
              onChange={handleChange}
              className="border p-2 rounded text-center"
            />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold border-b-2 border-gray-300 m-2 text-center">
            Dirección
          </h3>
          <div className="flex flex-col w-[500px] gap-4">
            <div className="flex gap-2">
              <input
                type="text"
                name="calle"
                placeholder="Calle"
                value={cliente.calle}
                onChange={handleChange}
                className="border p-2 rounded text-center w-[400px]"
              />
              <input
                type="text"
                name="numero"
                placeholder="Número"
                value={cliente.numero}
                onChange={handleChange}
                className="border p-2 rounded text-center w-[100px]"
              />
            </div>

            <input
              type="text"
              name="colonia"
              placeholder="Colonia"
              value={cliente.colonia}
              onChange={handleChange}
              className="border p-2 rounded text-center"
            />

            <div className="flex gap-2">
              <input
                type="text"
                name="delegacion"
                placeholder="Delegación"
                value={cliente.delegacion}
                onChange={handleChange}
                className="border p-2 rounded text-center w-[400px]"
              />
              <input
                type="text"
                name="cp"
                placeholder="CP"
                value={cliente.cp}
                onChange={handleChange}
                className="border p-2 rounded text-center w-[100px]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleGuardarCambios}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Guardar Cambios
          </button>
          <button
            onClick={onClose}
            className="ml-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalModificarCliente;
