
import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";

const ModalPersonal = ({ isOpen, onClose, personalData, onSave, appUser }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    telefono: "",
    roll: "ayudante", // Valor por defecto
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Si pasamos datos de personal (para editar), llenamos el formulario
    if (personalData) {
      setFormData({
        nombre: personalData.nombre || "",
        apellidos: personalData.apellidos || "",
        telefono: personalData.telefono || "",
        roll: personalData.roll || "ayudante",
      });
    } else {
      // Si no (para crear), reseteamos el formulario
      setFormData({
        nombre: "",
        apellidos: "",
        telefono: "",
        roll: "ayudante",
      });
    }
  }, [personalData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    let error;

    if (personalData) {
      // Actualizar registro existente
      const { error: updateError } = await supabase
        .from("personal")
        .update(formData)
        .eq("id", personalData.id);
      error = updateError;
    } else {
      // Insertar nuevo registro
      const { error: insertError } = await supabase
        .from("personal")
        .insert([{ ...formData, app_users_id: appUser.id }]);
      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      console.error("Error guardando en Supabase:", error);
      alert(`Error: ${error.message}`);
    } else {
      onSave(); // Llama a la función onSave para refrescar la tabla
      onClose(); // Cierra el modal
    }
  };
		
	if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-2xl m-4 max-w-md w-full flex flex-col items-center relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Icon icon="line-md:close-circle" width="28" />
        </button>

        <h2 className="font-extrabold text-2xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] mb-6">
          {personalData ? "Editar Personal" : "Agregar Personal"}
        </h2>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="text"
            name="nombre"
            placeholder="Nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="border p-3 rounded-lg text-center focus:ring-2 focus:ring-[#6d72f9] outline-none transition"
          />
          <input
            type="text"
            name="apellidos"
            placeholder="Apellidos"
            value={formData.apellidos}
            onChange={handleChange}
            required
            className="border p-3 rounded-lg text-center focus:ring-2 focus:ring-[#6d72f9] outline-none transition"
          />
          <input
            type="tel"
            name="telefono"
            placeholder="Teléfono"
            value={formData.telefono}
            onChange={handleChange}
            required
            className="border p-3 rounded-lg text-center focus:ring-2 focus:ring-[#6d72f9] outline-none transition"
          />
          <select
            name="roll"
            value={formData.roll}
            onChange={handleChange}
            required
            className="border p-3 rounded-lg text-center focus:ring-2 focus:ring-[#6d72f9] outline-none transition"
          >
            <option value="ayudante">Ayudante</option>
            <option value="encargado">Encargado</option>
          </select>

          <div className="flex justify-center mt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 justify-center w-full p-3 bg-[#6432e4] text-white font-bold rounded-lg shadow-lg hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:-translate-y-0.5 transition-all duration-300 disabled:bg-gray-400"
            >
              <Icon icon={isSaving ? "line-md:loading-loop" : "line-md:confirm-circle"} width="24" />
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalPersonal;
