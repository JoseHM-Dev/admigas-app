import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";

// --- Iconos SVG ---
const IconUser = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-6 h-6 text-indigo-600"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const IconHome = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-6 h-6 text-indigo-600"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

const IconClose = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const ModalNuevoCliente = ({ isOpen, onClose, contrato, cliente: clienteToEdit }) => {
  const navigate = useNavigate();

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

  // Estados UI
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  
  const isEditMode = Boolean(clienteToEdit);
  const idContrato = isEditMode ? clienteToEdit?.id_contrato : contrato?.id_contrato;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setCliente(clienteToEdit);
      } else {
        setCliente({
          nombre_cliente: "",
          apellido_cliente: "",
          telefono: "",
          calle: "",
          numero: "",
          colonia: "",
          delegacion: "",
          cp: "",
        });
      }
      setError("");
      setGuardando(false);
    }
  }, [isOpen, clienteToEdit, isEditMode]);

  // Manejador genérico para todos los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCliente((prev) => ({ ...prev, [name]: value }));
  };

  // Manejador específico para CP (solo para validar que sean números)
  const handleCPChange = (e) => {
    const cpIngresado = e.target.value;
    if (!/^\d*$/.test(cpIngresado)) return; // Solo permite números
    setCliente((prev) => ({ ...prev, cp: cpIngresado }));
  };

  // --- Función Core de Guardado ---
  const guardarDatosEnBD = async () => {
    if (isEditMode) {
      if (!clienteToEdit.id_casa)
        throw new Error("No se ha proporcionado un ID de cliente para modificar.");
    } else {
      if (!idContrato)
        throw new Error("No se ha proporcionado un ID de contrato.");
    }
    if (!cliente.nombre_cliente || !cliente.telefono || !cliente.calle) {
      throw new Error("Por favor complete los campos obligatorios.");
    }

    if (isEditMode) {
      const { data, error } = await supabase
        .from("casa_habitacion")
        .update(cliente)
        .eq("id_casa", clienteToEdit.id_casa);
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from("casa_habitacion").insert([
        {
          id_contrato: idContrato,
          ...cliente,
        },
      ]);

      if (error) throw error;
      return data;
    }
  };

  const handleGuardarCliente = async () => {
    setGuardando(true);
    setError("");
    try {
      await guardarDatosEnBD();
      console.log("Cliente guardado exitosamente");
      onClose();
    } catch (error) {
      console.error("Error:", error.message);
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarEIrAVentas = async () => {
    setGuardando(true);
    setError("");
    try {
      await guardarDatosEnBD();
      console.log("Cliente guardado, redirigiendo...");
      navigate("/ventas");
    } catch (error) {
      console.error("Error:", error.message);
      setError(error.message);
      setGuardando(false); 
    }
  };

  const handleCancel = async () => {
    if (!idContrato && !isEditMode) {
      onClose();
      return;
    }

    if (!isEditMode) {
      const isConfirmed = window.confirm(
        "¿Estás seguro de que quieres cancelar? Se eliminará el contrato creado."
      );
      if (isConfirmed) {
        try {
          const { error } = await supabase
            .from("contrato")
            .delete()
            .eq("id_contrato", idContrato);
          if (error) throw error;
          console.log("Contrato eliminado con éxito.");
        } catch (error) {
          console.error("Error al eliminar:", error.message);
        } finally {
          onClose();
        }
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 flex flex-col overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <IconUser />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{isEditMode ? "Modificar Cliente" : "Nuevo Cliente"}</h2>
              <p className="text-sm text-gray-500">
                {isEditMode
                  ? `Editando datos del cliente #${clienteToEdit.id_casa}`
                  : "Registro de cliente particular (Casa Habitación)"}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <IconClose />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Badge de Contrato */}
          <div className="flex items-center gap-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="text-xs font-bold text-blue-500 uppercase">
              Contrato Activo:
            </div>
            <div className="font-mono font-semibold text-blue-800 text-lg">
              #{idContrato || "---"}
            </div>
          </div>

          {/* Sección 1: Datos Personales */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
              Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Nombre(s)
                </label>
                <input
                  type="text"
                  name="nombre_cliente"
                  value={cliente.nombre_cliente}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej. María"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Apellidos
                </label>
                <input
                  type="text"
                  name="apellido_cliente"
                  value={cliente.apellido_cliente}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej. González López"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={cliente.telefono}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="55 1234 5678"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Dirección */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
              <IconHome /> Dirección del Servicio
            </h3>

            <div className="grid grid-cols-12 gap-4">
              {/* CP Manual */}
              <div className="col-span-4">
                <label className="block text-xs text-gray-500 mb-1">C.P.</label>
                <input
                  type="text"
                  name="cp"
                  maxLength="5"
                  value={cliente.cp}
                  onChange={handleCPChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  placeholder="00000"
                />
              </div>

              <div className="col-span-8">
                <label className="block text-xs text-gray-500 mb-1">
                  Calle
                </label>
                <input
                  type="text"
                  name="calle"
                  value={cliente.calle}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Av. Principal"
                />
              </div>

              <div className="col-span-4">
                <label className="block text-xs text-gray-500 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  name="numero"
                  value={cliente.numero}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ext / Int"
                />
              </div>

              {/* Colonia Manual */}
              <div className="col-span-8">
                <label className="block text-xs text-gray-500 mb-1">
                  Colonia
                </label>
                <input
                  type="text"
                  name="colonia"
                  value={cliente.colonia}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Nombre de la colonia"
                />
              </div>

              {/* Delegación Manual */}
              <div className="col-span-12">
                <label className="block text-xs text-gray-500 mb-1">
                  Delegación / Municipio
                </label>
                <input
                  type="text"
                  name="delegacion"
                  value={cliente.delegacion}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Delegación o Municipio"
                />
              </div>
            </div>
          </div>

          {/* Error Msg */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 text-center">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all"
            disabled={guardando}
          >
            Cancelar
          </button>

          <button
            onClick={handleGuardarCliente}
            disabled={guardando}
            className="px-6 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-lg shadow-md transition-all"
          >
            {guardando ? "Guardando..." : "Guardar y Cerrar"}
          </button>

          {!isEditMode && (
            <button
              onClick={handleGuardarEIrAVentas}
              disabled={guardando}
              className="px-6 py-2 text-sm font-semibold text-white bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg shadow-md transform hover:-translate-y-0.5 transition-all"
            >
              {guardando ? "Procesando..." : "Guardar e Ir a Ventas →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalNuevoCliente;