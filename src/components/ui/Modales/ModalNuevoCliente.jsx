import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";

const ModalNuevoCliente = ({
  isOpen,
  onClose,
  contrato,
  cliente: clienteToEdit,
}) => {
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

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const isEditMode = Boolean(clienteToEdit);
  const idContrato = isEditMode
    ? clienteToEdit?.id_contrato
    : contrato?.id_contrato;

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCliente((prev) => ({ ...prev, [name]: value }));
  };

  const handleCPChange = (e) => {
    const cpIngresado = e.target.value;
    if (!/^\d*$/.test(cpIngresado)) return;
    setCliente((prev) => ({ ...prev, cp: cpIngresado }));
  };

  const guardarDatosEnBD = async () => {
    if (isEditMode) {
      if (!clienteToEdit.id_casa) throw new Error("No ID cliente.");
    } else {
      if (!idContrato) throw new Error("No ID contrato.");
    }
    if (!cliente.nombre_cliente || !cliente.telefono || !cliente.calle) {
      throw new Error("Complete campos obligatorios.");
    }

    if (isEditMode) {
      const { data, error } = await supabase
        .from("casa_habitacion")
        .update(cliente)
        .eq("id_casa", clienteToEdit.id_casa);
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from("casa_habitacion")
        .insert([{ id_contrato: idContrato, ...cliente }]);
      if (error) throw error;
      return data;
    }
  };

  const handleGuardarCliente = async () => {
    setGuardando(true);
    setError("");
    try {
      await guardarDatosEnBD();
      onClose();
    } catch (error) {
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
      navigate("/ventas");
    } catch (error) {
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
      if (window.confirm("¿Cancelar? Se eliminará el contrato creado.")) {
        try {
          await supabase
            .from("contrato")
            .delete()
            .eq("id_contrato", idContrato);
        } catch (error) {
          console.error(error);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 transition-all duration-300">
      {/* CARD */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon
                icon={isEditMode ? "mdi:account-edit" : "mdi:account-plus"}
                className="text-white w-7 h-7"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                {isEditMode ? "Modificar Cliente" : "Nuevo Cliente"}
              </h2>
              <p className="text-xs text-blue-100 opacity-80">
                {isEditMode
                  ? `Editando cliente #${clienteToEdit.id_casa}`
                  : "Registro Casa Habitación"}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Badge Contrato */}
          <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              <Icon icon="mdi:file-document-outline" width="24" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                Contrato Activo
              </div>
              <div className="font-mono font-bold text-gray-800 text-lg">
                #{idContrato || "---"}
              </div>
            </div>
          </div>

          {/* Información Personal */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2 border-b pb-2">
              <Icon icon="mdi:account-details" /> Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup
                label="Nombre(s)"
                icon="mdi:account"
                name="nombre_cliente"
                value={cliente.nombre_cliente}
                onChange={handleChange}
                placeholder="Ej. María"
              />
              <InputGroup
                label="Apellidos"
                icon="mdi:account-group"
                name="apellido_cliente"
                value={cliente.apellido_cliente}
                onChange={handleChange}
                placeholder="Ej. González"
              />
              <div className="md:col-span-2">
                <InputGroup
                  label="Teléfono de Contacto"
                  icon="mdi:phone"
                  name="telefono"
                  type="tel"
                  value={cliente.telefono}
                  onChange={handleChange}
                  placeholder="55..."
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2 border-b pb-2">
              <Icon icon="mdi:home-map-marker" /> Dirección del Servicio
            </h3>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4">
                <InputGroup
                  label="C.P."
                  icon="mdi:mailbox"
                  name="cp"
                  value={cliente.cp}
                  onChange={handleCPChange}
                  maxLength="5"
                  placeholder="00000"
                />
              </div>
              <div className="col-span-8">
                <InputGroup
                  label="Calle"
                  icon="mdi:road-variant"
                  name="calle"
                  value={cliente.calle}
                  onChange={handleChange}
                  placeholder="Av. Principal"
                />
              </div>

              <div className="col-span-4">
                <InputGroup
                  label="Número"
                  icon="mdi:numeric"
                  name="numero"
                  value={cliente.numero}
                  onChange={handleChange}
                  placeholder="Ext/Int"
                />
              </div>
              <div className="col-span-8">
                <InputGroup
                  label="Colonia"
                  icon="mdi:home-group"
                  name="colonia"
                  value={cliente.colonia}
                  onChange={handleChange}
                  placeholder="Colonia"
                />
              </div>

              <div className="col-span-12">
                <InputGroup
                  label="Municipio / Delegación"
                  icon="mdi:map"
                  name="delegacion"
                  value={cliente.delegacion}
                  onChange={handleChange}
                  placeholder="Municipio"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2 animate-pulse">
              <Icon icon="mdi:alert-circle" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-white hover:text-gray-900 transition-all"
            disabled={guardando}
          >
            Cancelar
          </button>

          <button
            onClick={handleGuardarCliente}
            disabled={guardando}
            className="px-6 py-2.5 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-900 shadow-md transition-all flex items-center justify-center gap-2"
          >
            {guardando ? (
              <Icon icon="line-md:loading-loop" />
            ) : (
              <Icon icon="mdi:content-save" />
            )}
            {guardando ? "Guardando..." : "Guardar y Cerrar"}
          </button>

          {!isEditMode && (
            <button
              onClick={handleGuardarEIrAVentas}
              disabled={guardando}
              className="px-6 py-2.5 rounded-lg text-white font-medium bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              {guardando ? (
                <Icon icon="line-md:loading-loop" />
              ) : (
                <Icon icon="mdi:cash-register" />
              )}
              {guardando ? "Procesando..." : "Ir a Ventas →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente InputGroup (Reutilizado)
const InputGroup = ({ label, icon, className = "", ...props }) => (
  <div className="group">
    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
        <Icon icon={icon} width="20" />
      </div>
      <input
        {...props}
        className={`block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm ${className}`}
      />
    </div>
  </div>
);

export default ModalNuevoCliente;
