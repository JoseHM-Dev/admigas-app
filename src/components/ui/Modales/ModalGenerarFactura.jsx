import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../auth/useAuth";

const ModalGenerarFactura = ({ departamento, onClose }) => {
  const { user } = useAuth(); // Obtenemos el usuario logueado
  // Estados existentes
  const [selectedTarifa, setSelectedTarifa] = useState(null);
  const [administracion, setAdministracion] = useState("");
  const [servicios, setServicios] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // NUEVO: Estados para Bancos
  const [cuentasBancarias, setCuentasBancarias] = useState([]);
  const [selectedCuenta, setSelectedCuenta] = useState(null);

  // NUEVO: Estado para el checkbox de la foto
  const [incluirFotoPerfil, setIncluirFotoPerfil] = useState(true);

  const navigate = useNavigate();

  // Efecto unificado para cargar Tarifa y Bancos al inicio
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Cargar Tarifa
        const { data: tarifaData, error: tarifaError } = await supabase
          .from("tarifa")
          .select("id_tarifa, precio_m3, nombre, factor")
          .order("id_tarifa", { ascending: false })
          .limit(1)
          .single();

        if (tarifaError) throw tarifaError;
        if (tarifaData) setSelectedTarifa(tarifaData);

        // 2. NUEVO: Cargar Cuentas Bancarias
        const { data: bancosData, error: bancosError } = await supabase
          .from("datos_bancarios")
          .select("*"); // Traemos todo para luego mandarlo a la factura

        if (bancosError) throw bancosError;
        if (bancosData && bancosData.length > 0) {
          setCuentasBancarias(bancosData);
          // Por defecto seleccionamos la primera cuenta para agilizar
          setSelectedCuenta(bancosData[0]);
        }
      } catch (err) {
        console.error("Error cargando datos iniciales:", err);
        setError("Error al cargar configuraciones: " + err.message);
      }
    };

    fetchData();
  }, []);

  const handleNavigateToPreview = async () => {
    setIsSaving(true);
    setError(null);

    // NUEVO: Validar que haya cuenta bancaria seleccionada
    if (!selectedTarifa || !departamento?.id_departamento || !selectedCuenta) {
      setError(
        "Faltan datos requeridos (Tarifa o Cuenta Bancaria). Verifique la configuración."
      );
      setIsSaving(false);
      return;
    }

    try {
      const { data: lecturas, error: lecturasError } = await supabase
        .from("lectura")
        .select("id_lectura, valor_lectura, fecha_lectura")
        .eq("id_departamento", departamento.id_departamento)
        .order("fecha_lectura", { ascending: false })
        .order("id_lectura", { ascending: false })
        .limit(2);

      if (lecturasError) throw lecturasError;
      if (lecturas.length < 2) {
        throw new Error(
          "No hay suficientes lecturas para calcular el consumo. Se necesitan al menos 2."
        );
      }

      const ultimaLectura = lecturas[0];
      const penultimaLectura = lecturas[1];

      const consumo_lectura =
        ultimaLectura.valor_lectura - penultimaLectura.valor_lectura;
      if (consumo_lectura < 0) {
        throw new Error(
          "El consumo no puede ser negativo. Verifique las lecturas del medidor."
        );
      }
      const monto = consumo_lectura * selectedTarifa.precio_m3;

      const facturaData = {
        fecha_factura: new Date().toISOString(),
        consumo_lectura: consumo_lectura,
        monto: monto,
        estado_pago: false,
        saldo_por_pagar: monto,
        lectura_id_fin: ultimaLectura.id_lectura,
        departamento_id: departamento.id_departamento,
        administracion: administracion ? parseFloat(administracion) : 0,
        servicios: servicios ? parseFloat(servicios) : 0,
      };

      const cleanDepartamento = {
        id_departamento: departamento.id_departamento,
        no_depto: departamento.no_depto,
        titular_depto: departamento.titular_depto,
        edificio: departamento.edificio,
      };

      navigate("/factura", {
        state: {
          facturaData,
          departamento: cleanDepartamento,
          selectedTarifa,
          selectedCuenta,
          configuracionImagen: {
            mostrar: incluirFotoPerfil,
            url: user?.user_metadata?.avatar_url || null,
          },
        },
      });
      onClose();
    } catch (error) {
      console.error("Error al preparar la factura:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-blue-600">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Generar Factura <br />
          <span className="text-blue-600 text-lg">
            {departamento.no_depto} - {departamento.titular_depto}
          </span>
        </h2>

        {error && (
          <p className="text-red-500 bg-red-50 p-3 rounded-md mb-4 text-sm border border-red-200">
            {error}
          </p>
        )}

        {/* SECCIÓN 1: TARIFA (MEJORADA) */}
        <div className="mb-5 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <label className="block text-blue-800 text-sm font-bold mb-2 uppercase tracking-wide">
            1. Tarifa Vigente
          </label>

          <div className="flex justify-between items-center mb-2">
            <div className="text-gray-800 font-medium text-lg">
              {selectedTarifa ? selectedTarifa.nombre : "Cargando..."}
            </div>
            <div className="text-green-600 font-bold bg-green-100 px-2 py-1 rounded text-sm">
              {selectedTarifa ? `$${selectedTarifa.precio_m3}/m³` : "..."}
            </div>
          </div>

          {/* Leyenda solicitada */}
          <p className="text-xs text-gray-500 italic mt-1 flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Para modificar el precio, vaya a la sección de "Ajustes".
          </p>
        </div>

        {/* NUEVA SECCIÓN: CUENTA BANCARIA */}
        <div className="mb-5">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            2. Cuenta Bancaria (Datos de pago)
          </label>
          <div className="relative">
            <select
              className="block appearance-none w-full bg-gray-50 border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-blue-500"
              value={selectedCuenta?.id || ""}
              onChange={(e) => {
                const id = e.target.value;
                const cuenta = cuentasBancarias.find(
                  (c) => c.id.toString() === id
                );
                setSelectedCuenta(cuenta);
              }}
            >
              {cuentasBancarias.length === 0 && (
                <option>Cargando cuentas...</option>
              )}
              {cuentasBancarias.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.apodo}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="mb-5 border-t pt-4">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={incluirFotoPerfil}
              onChange={(e) => setIncluirFotoPerfil(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">
              Incluir Logo/Foto de Perfil en Factura
            </span>
          </label>
          {incluirFotoPerfil && !user?.user_metadata?.avatar_url && (
            <p className="text-xs text-orange-500 mt-1 ml-8">
              * No se detectó imagen de perfil en Ajustes.
            </p>
          )}
        </div>

        {/* SECCIÓN 3: EXTRAS */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            3. Cargos Adicionales (Opcional)
          </label>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="text-xs text-gray-500 mb-1 block">
                Administración
              </label>
              <input
                type="number"
                placeholder="$0.00"
                value={administracion}
                onChange={(e) => setAdministracion(e.target.value)}
                className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="w-1/2">
              <label className="text-xs text-gray-500 mb-1 block">
                Otros Servicios
              </label>
              <input
                type="number"
                placeholder="$0.00"
                value={servicios}
                onChange={(e) => setServicios(e.target.value)}
                className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-500 hover:text-gray-800 font-medium py-2 px-4 rounded focus:outline-none transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleNavigateToPreview}
            disabled={!selectedTarifa || isSaving || !selectedCuenta}
            className="bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-2 px-6 rounded shadow-md transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Procesando..." : "Previsualizar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalGenerarFactura;
