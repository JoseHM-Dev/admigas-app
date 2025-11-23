import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";

// --- Iconos SVG para UI ---
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
      d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V9.54a2.25 2.25 0 00-.659-1.591l-7-7a2.25 2.25 0 00-3.182 0l-7 7a2.25 2.25 0 00-.659 1.591V21h4.5z"
    />
  </svg>
);

const IconUser = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4 text-gray-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
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

const ModalNuevoDepartamento = ({
  isOpen,
  onClose,
  edificio,
  onDepartamentoGuardado,
  departamento: departamentoAEditar,
}) => {
  const [departamento, setDepartamento] = useState({
    no_depto: "",
    titular_depto: "",
    telefono_depto: "",
  });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const isEditMode = Boolean(departamentoAEditar);

  const idEdificio = edificio?.id_edificio;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setDepartamento({
          no_depto: departamentoAEditar.no_depto || "",
          titular_depto: departamentoAEditar.titular_depto || "",
          telefono_depto: departamentoAEditar.telefono_depto || "",
        });
      } else {
        setDepartamento({
          no_depto: "",
          titular_depto: "",
          telefono_depto: "",
        });
      }
      setError("");
    }
  }, [isOpen, departamentoAEditar, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDepartamento((prev) => ({ ...prev, [name]: value }));
    // Limpiar error si el usuario empieza a escribir
    if (error) setError("");
  };

  const handleGuardarDepartamento = async () => {
    if (isEditMode) {
      // Lógica de Actualización
      if (!departamento.no_depto || !departamento.titular_depto) {
        setError("El número de departamento y el titular son obligatorios.");
        return;
      }
      setCargando(true);
      setError("");

      try {
        const { data, error: updateError } = await supabase
          .from("departamento")
          .update(departamento)
          .eq("id_departamento", departamentoAEditar.id_departamento);

        if (updateError) throw updateError;

        console.log("Departamento actualizado:", data);
        onDepartamentoGuardado();
        onClose();
      } catch (error) {
        console.error("Error:", error.message);
        setError("Error al actualizar: " + error.message);
      } finally {
        setCargando(false);
      }
    } else {
      // Lógica de Creación
      if (!idEdificio) {
        setError("Error interno: No se ha seleccionado un edificio.");
        return;
      }
      if (!departamento.no_depto || !departamento.titular_depto) {
        setError("El número de departamento y el titular son obligatorios.");
        return;
      }

      setCargando(true);
      setError("");

      try {
        const { data, error: insertError } = await supabase
          .from("departamento")
          .insert([
            {
              id_edificio: idEdificio,
              ...departamento,
            },
          ]);

        if (insertError) throw insertError;

        console.log("Departamento guardado:", data);
        onDepartamentoGuardado();
        onClose();
      } catch (error) {
        console.error("Error:", error.message);
        setError("Error al guardar: " + error.message);
      } finally {
        setCargando(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4 flex flex-col overflow-hidden animate-fadeInUp">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <IconHome />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {isEditMode ? 'Modificar Departamento' : 'Nuevo Departamento'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEditMode ? 'Actualice los detalles del departamento.' : 'Registre una nueva unidad en el sistema.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Contexto del Edificio (Read Only) */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">
              Asignar al Edificio
            </span>
            <div className="text-blue-900 font-medium truncate">
              {edificio?.calle
                ? `${edificio.calle} ${edificio.numero || ""}`
                : edificio?.responsable_nombre || "Edificio sin nombre"}
            </div>
            {edificio?.colonia && (
              <div className="text-xs text-blue-600">{edificio.colonia}</div>
            )}
          </div>

          {/* Formulario */}
          <div className="grid grid-cols-12 gap-4">
            {/* Número de Depto */}
            <div className="col-span-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                No. Interior
              </label>
              <input
                type="text"
                name="no_depto"
                placeholder="101"
                value={departamento.no_depto}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-medium text-center"
              />
            </div>

            {/* Teléfono */}
            <div className="col-span-8">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Teléfono de Contacto
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="telefono_depto"
                  placeholder="55 0000 0000"
                  value={departamento.telefono_depto}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg pl-4 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Titular */}
            <div className="col-span-12">
              <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                Titular del Departamento
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconUser />
                </div>
                <input
                  type="text"
                  name="titular_depto"
                  placeholder="Nombre completo del propietario o inquilino"
                  value={departamento.titular_depto}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={cargando}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardarDepartamento}
            disabled={cargando}
            className={`px-6 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 
              ${
                cargando
                  ? "bg-indigo-400 cursor-wait"
                  : "bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
              }`}
          >
            {cargando ? "Guardando..." : (isEditMode ? 'Guardar Cambios' : 'Guardar Departamento')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalNuevoDepartamento;
