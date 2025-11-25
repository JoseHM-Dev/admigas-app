import React, { useState } from "react";
import { supabase } from "../../../supabaseClient";
import { format } from "date-fns";
import { useAuth } from "../../../auth/useAuth";
import { Icon } from "@iconify/react";

const ModalContrato = ({ isOpen, onClose, onSave }) => {
  const { personal } = useAuth();
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);

  const handleGuardarContrato = async () => {
    setIsSaving(true);
    try {
      const formattedDate = format(fechaInicio, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("contrato")
        .insert([{ fecha_inicio: formattedDate, personal_id: personal.id }])
        .select();

      if (error) throw error;

      console.log("Contrato guardado:", data);
      onSave(data[0]);
      onClose();
    } catch (error) {
      console.error("Error al guardar el contrato:", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-300">
      {/* CARD */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        {/* HEADER */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon
                icon="mdi:file-document-edit-outline"
                className="text-white w-7 h-7"
              />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Nuevo Contrato
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-8 space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex gap-3">
            <Icon
              icon="mdi:information-outline"
              className="text-blue-500 shrink-0"
              width="20"
            />
            <p>
              Este contrato servirá para agrupar las ventas y servicios del
              nuevo cliente.
            </p>
          </div>

          <div className="group">
            <label
              htmlFor="fechaInicio"
              className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1"
            >
              Fecha de Inicio <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Icon icon="mdi:calendar-start" width="20" />
              </div>
              <input
                type="date"
                id="fechaInicio"
                value={format(fechaInicio, "yyyy-MM-dd")}
                onChange={(e) => setFechaInicio(new Date(e.target.value))}
                className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white hover:text-gray-900 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardarContrato}
            disabled={isSaving}
            className={`
              px-6 py-2.5 rounded-lg text-white font-medium shadow-lg shadow-indigo-500/30
              flex items-center gap-2 transition-all transform active:scale-95
              ${
                isSaving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5"
              }
            `}
          >
            {isSaving ? (
              <>
                <Icon icon="line-md:loading-loop" /> Guardando...
              </>
            ) : (
              <>
                <Icon icon="mdi:content-save-check" /> Crear Contrato
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalContrato;
