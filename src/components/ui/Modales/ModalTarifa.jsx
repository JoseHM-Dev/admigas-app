import { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../auth/useAuth";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ModalTarifa = ({ isOpen, onClose, onSave }) => {
  const { personal } = useAuth();
  const [newFechaVigente, setNewFechaVigente] = useState(new Date());
  const [newPrecioLitro, setNewPrecioLitro] = useState("");
  const [newPrecioM3, setNewPrecioM3] = useState("");
  const [newFactor, setNewFactor] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !newFechaVigente ||
      !newPrecioLitro ||
      !newPrecioM3 ||
      !newFactor ||
      !newNombre
    ) {
      setError("Todos los campos son obligatorios");
      return;
    }

    const { error: insertError } = await supabase.from("tarifa").insert([
      {
        nombre: newNombre,
        factor: newFactor,
        fecha_vigente: newFechaVigente,
        precio_litro: newPrecioLitro,
        precio_m3: newPrecioM3,
        personal_id: personal.id,
      },
    ]);

    if (insertError) {
      console.error("Error updating tarifas:", insertError);
      setError(`Error al guardar la tarifa: ${insertError.message}`);
    } else {
      onSave();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Agregar Nueva Tarifa
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DatePicker
            selected={newFechaVigente}
            onChange={(date) => {
              setNewFechaVigente(date);
            }}
            className="p-2 rounded bg-gray-400 text-white text-center hover:cursor-pointer hover:-translate-y-1 transition-all duration-300 shadow-lg"
          />
          <input
            type="number"
            placeholder="Nuevo Precio por Litro"
            value={newPrecioLitro}
            onChange={(e) => {
              setNewPrecioLitro(e.target.value);
            }}
            className="p-2 rounded bg-gray-400 text-white text-center"
          />
          <input
            type="number"
            placeholder="Nuevo Precio por m³"
            value={newPrecioM3}
            onChange={(e) => {
              setNewPrecioM3(e.target.value);
            }}
            className="p-2 rounded bg-gray-400 text-white text-center"
          />
          <input
            type="nombre"
            placeholder="Nombre de referencia"
            value={newNombre}
            onChange={(e) => {
              setNewNombre(e.target.value);
            }}
            className="p-2 rounded bg-gray-400 text-white text-center"
          />
          <input
            type="factor"
            placeholder="Factor de conversion"
            value={newFactor}
            onChange={(e) => {
              setNewFactor(e.target.value);
            }}
            className="p-2 rounded bg-gray-400 text-white text-center"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Crear Tarifa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalTarifa;
