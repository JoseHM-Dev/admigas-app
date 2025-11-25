import React, { useState, useEffect } from "react";
import { pdf } from "@react-pdf/renderer"; // Importamos la función imperativa
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../auth/useAuth";
import FacturaPDF from "../FacturaPDF";
import { Icon } from "@iconify/react";

const ModalGenerarFactura = ({ departamento, onClose, onFacturaGenerada }) => {
  const { user } = useAuth();

  // Estados de datos
  const [selectedTarifa, setSelectedTarifa] = useState(null);
  const [administracion, setAdministracion] = useState("");
  const [servicios, setServicios] = useState("");
  const [cuentasBancarias, setCuentasBancarias] = useState([]);
  const [selectedCuenta, setSelectedCuenta] = useState(null);
  const [unidadContacto, setUnidadContacto] = useState(null);
  const [deudaAnterior, setDeudaAnterior] = useState(0);
  const [lecturasData, setLecturasData] = useState({
    actual: null,
    anterior: null,
  });

  // Estados UI
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false); // Nuevo estado para el guardado
  const [error, setError] = useState(null);
  const [incluirFotoPerfil, setIncluirFotoPerfil] = useState(true);

  // Carga inicial (igual que antes)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: tarifaData } = await supabase
          .from("tarifa")
          .select("*")
          .order("id_tarifa", { ascending: false })
          .limit(1)
          .single();
        setSelectedTarifa(tarifaData);

        const { data: bancosData } = await supabase
          .from("datos_bancarios")
          .select("*")
          .order("id", { ascending: false });
        if (bancosData?.length > 0) {
          setCuentasBancarias(bancosData);
          setSelectedCuenta(bancosData[0]);
        }

        const { data: unidadData } = await supabase
          .from("unidad")
          .select("telefono_1")
          .limit(1)
          .maybeSingle();
        setUnidadContacto(unidadData);

        const { data: lecturas } = await supabase
          .from("lectura")
          .select("id_lectura, valor_lectura, fecha_lectura, url")
          .eq("id_departamento", departamento.id_departamento)
          .order("fecha_lectura", { ascending: false })
          .order("id_lectura", { ascending: false })
          .limit(2);

        if (!lecturas || lecturas.length < 2)
          throw new Error("Se requieren al menos 2 lecturas.");

        setLecturasData({ actual: lecturas[0], anterior: lecturas[1] });

        const { data: facturasPendientes } = await supabase
          .from("factura_departamento")
          .select("saldo_por_pagar")
          .eq("departamento_id", departamento.id_departamento)
          .eq("estado_pago", false);

        const totalDeuda =
          facturasPendientes?.reduce(
            (acc, curr) => acc + (curr.saldo_por_pagar || 0),
            0
          ) || 0;
        setDeudaAnterior(totalDeuda);
      } catch (err) {
        console.error("Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (departamento) fetchData();
  }, [departamento]);

  // Cálculos lógicos
  const getCalculos = () => {
    if (!lecturasData.actual || !lecturasData.anterior || !selectedTarifa)
      return null;

    const consumo =
      lecturasData.actual.valor_lectura - lecturasData.anterior.valor_lectura;
    const importeGas = consumo * selectedTarifa.precio_m3;
    const adminVal = administracion ? parseFloat(administracion) : 0;
    const serviciosVal = servicios ? parseFloat(servicios) : 0;

    // Monto Total del mes (Gas + Extras)
    const montoMes = importeGas + adminVal + serviciosVal;

    // Total a Pagar (Mes + Deudas)
    const totalPagar = montoMes + deudaAnterior;

    return {
      consumo_lectura: consumo,
      importeGas: importeGas,
      montoMes: montoMes, // Este irá a la columna 'monto'
      deuda: deudaAnterior,
      administracion: adminVal,
      servicios: serviciosVal,
      totalPagar: totalPagar, // Este irá a 'saldo_por_pagar'
    };
  };

  const calculosFinales = getCalculos();

  // --- FUNCIÓN PRINCIPAL: GENERAR PDF, SUBIR Y GUARDAR EN BD ---
  const handleGenerarYGuardar = async () => {
    if (!calculosFinales || !selectedCuenta) return;
    setProcesando(true);
    setError(null);

    try {
      // 1. Generar el Blob del PDF en memoria
      const doc = (
        <FacturaPDF
          departamento={departamento}
          edificio={departamento.edificio}
          lecturaAnterior={lecturasData.anterior}
          lecturaActual={lecturasData.actual}
          tarifa={selectedTarifa}
          banco={selectedCuenta}
          unidad={unidadContacto}
          calculos={calculosFinales}
          logoUrl={incluirFotoPerfil ? user?.user_metadata?.avatar_url : null}
        />
      );
      const blob = await pdf(doc).toBlob();

      // 2. Definir nombre del archivo y ruta
      const fileName = `factura_${
        departamento.id_departamento
      }_${Date.now()}.pdf`;
      const filePath = `generadas/${fileName}`; // Carpeta 'generadas' dentro del bucket 'facturas'

      // 3. Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("facturas") // Asegúrate que este bucket exista y sea público
        .upload(filePath, blob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 4. Obtener URL Pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("facturas").getPublicUrl(filePath);

      // 5. Insertar datos en la tabla factura_departamento
      const { error: insertError } = await supabase
        .from("factura_departamento")
        .insert({
          fecha_factura: new Date().toISOString(), // Fecha actual
          consumo_lectura: calculosFinales.consumo_lectura,
          monto: calculosFinales.montoMes, // Monto total (gas+servicios)
          saldo_por_pagar: calculosFinales.totalPagar, // Total a pagar (incluye deuda)
          url: publicUrl,
          lectura_id_fin: lecturasData.actual.id_lectura,
          departamento_id: departamento.id_departamento,
          estado_pago: false, // Por defecto no pagado
        });

      if (insertError) throw insertError;

      // 6. Éxito: Notificar y Cerrar
      alert("Factura generada y guardada correctamente.");
      if (onFacturaGenerada) onFacturaGenerada(); // Refrescar tablas padre
      onClose(); // Cerrar modal
    } catch (err) {
      console.error("Error en el proceso:", err);
      setError("Error al procesar la factura: " + err.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 font-sans p-4">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-600 to-purple-600"></div>

        <h2 className="text-2xl font-bold mb-1 text-gray-800 flex items-center gap-2">
          <Icon icon="mdi:file-document-outline" className="text-purple-600" />
          Generar Factura
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {departamento.edificio.calle} #{departamento.edificio.numero} - Depto{" "}
          {departamento.no_depto}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2 border border-red-100">
            <Icon icon="mdi:alert-circle" /> {error}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-gray-500">
            <Icon
              icon="line-md:loading-loop"
              className="mx-auto mb-2 text-3xl"
            />
            Calculando datos...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="col-span-2">
                <label className="block text-gray-700 text-xs font-bold mb-1 uppercase">
                  Cuenta Bancaria
                </label>
                <select
                  className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                  value={selectedCuenta?.id || ""}
                  onChange={(e) =>
                    setSelectedCuenta(
                      cuentasBancarias.find(
                        (c) => c.id.toString() === e.target.value
                      )
                    )
                  }
                >
                  {cuentasBancarias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom_banco} - {c.alias || c.nom_responsable}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-bold mb-1">
                  Cargos Admin ($)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={administracion}
                  onChange={(e) => setAdministracion(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-xs font-bold mb-1">
                  Otros Servicios ($)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={servicios}
                  onChange={(e) => setServicios(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                />
              </div>
            </div>

            <div className="mb-6 flex items-center gap-2">
              <input
                type="checkbox"
                id="foto"
                checked={incluirFotoPerfil}
                onChange={(e) => setIncluirFotoPerfil(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <label
                htmlFor="foto"
                className="text-sm text-gray-600 cursor-pointer select-none"
              >
                Incluir foto de perfil en el encabezado
              </label>
            </div>

            {/* Resumen */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Importe Gas + Serv:</span>
                <span className="font-medium">
                  ${calculosFinales?.montoMes.toFixed(2)}
                </span>
              </div>
              {calculosFinales?.deuda > 0 && (
                <div className="flex justify-between mb-1 text-red-500">
                  <span>Deuda Anterior:</span>
                  <span className="font-bold">
                    ${calculosFinales?.deuda.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-2 border-t border-gray-200 text-lg font-bold text-gray-800">
                <span>Total a Pagar:</span>
                <span>${calculosFinales?.totalPagar.toFixed(2)}</span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={procesando}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleGenerarYGuardar}
                disabled={procesando || !selectedCuenta || error}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-bold shadow-lg shadow-purple-500/30 transition-all
                            ${
                              procesando
                                ? "bg-gray-400 cursor-wait"
                                : "bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:-translate-y-0.5"
                            }`}
              >
                {procesando ? (
                  <>
                    <Icon icon="line-md:loading-loop" /> Guardando...
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:content-save-check" width="20" /> Generar y
                    Guardar
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalGenerarFactura;
