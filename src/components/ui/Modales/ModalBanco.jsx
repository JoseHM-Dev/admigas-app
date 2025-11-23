import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";
import { useAuth } from '../../../auth/useAuth';

const ModalBanco = ({ isOpen, onClose, bancoData, onSave }) => {
  const { personal } = useAuth();
  const [formData, setFormData] = useState({
    nom_responsable: "",
    telefono: "",
    apodo: "",
    banco: "",
    cuenta: "",
    clave_int: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bancoData) {
      setFormData({
        nom_responsable: bancoData.nom_responsable || "",
        apodo: bancoData.apodo || "",
        banco: bancoData.banco || "",
        cuenta: bancoData.cuenta || "",
        clave_int: bancoData.clave_int || "",
      });
    } else {
      setFormData({
        nom_responsable: "",
        apodo: "",
        banco: "",
        cuenta: "",
        clave_int: "",
      });
    }
  }, [bancoData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    let error;
    if (bancoData) {
      const { error: updateError } = await supabase
        .from("datos_bancarios")
        .update(formData)
        .eq("id", bancoData.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("datos_bancarios")
        .insert({ ...formData, personal_id: personal.id });
      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      console.error("Error al guardar los datos bancarios:", error);
      alert("Error al guardar los datos bancarios: ${error.message}");
    } else {
      onSave();
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-2xl m-4 max-w-md w-full flex flex-col items-center relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Icon icon="line-md:close-circle" width="28" />
        </button>

        <h2 className="font-extrabold text-2xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] mb-6">
          {bancoData ? "Editar Cuenta Bancaria" : "Agregar Datos Bancarios"}
        </h2>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="text"
            name="nom_responsable"
            placeholder="A que nombre esta la tarjeta"
            value={formData.nom_responsable}
            onChange={handleChange}
            required
            className="border p-3 rounded-lg text-center focus:ring-2 focus:ring-[#6d72f9] outline-none transition"
          />
          <input
            type="text"
            name="apodo"
            placeholder="Apodo Ej. Cuenta Personal"
            value={formData.apodo}
            onChange={handleChange}
            required
            className="border p-3 rounded-lg text-center focus:ring-2 focus:ring-[#6d72f9] outline-none transition"
          />
          <input
            type="text"
            name="banco"
            placeholder="Nombre del Banco"
            value={formData.banco}
            onChange={handleChange}
            required
            className="border p-3 rounded-lg text-center focus:ring-2 focus:ring-[#6d72f9] outline-none transition"
          />

          <input
            type="text"
            name="cuenta"
            placeholder="Numero de Cuenta"
            value={formData.cuenta}
            onChange={handleChange}
            required
            className="border p-3 rounded-lg text-center focus:ring-2 focus:ring-[#6d72f9] outline-none transition"
          />

          <input
            type="text"
            name="clave_int"
            placeholder="Clave Interbancaria"
            value={formData.clave_int}
            onChange={handleChange}
            required
            className="border p-3 rounded-lg text-center focus:ring-2 focus:ring-[#6d72f9] outline-none transition"
          />
          <div className="flex justify-center mt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 justify-center w-full p-3 bg-[#6432e4] text-white font-bold rounded-lg shadow-lg hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:-translate-y-0.5 transition-all duration-300 disabled:bg-gray-400"
            >
              <Icon
                icon={
                  isSaving ? "line-md:loading-loop" : "line-md:confirm-circle"
                }
                width="24"
              />
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalBanco;
