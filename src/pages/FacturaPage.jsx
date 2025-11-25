import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { supabase } from "../supabaseClient";
import Factura from "../components/ui/Factura";
import { Icon } from "@iconify/react";
import {PDFDownloadLink} from "@react-pdf/renderer";
import FacturaPDF from "../components/ui/FacturaPDF";


const FacturaPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const facturaRef = useRef();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const {
    facturaData,
    departamento,
    selectedTarifa,
    selectedCuenta,
    configuracionImagen,
    onFacturaGenerada,
  } = location.state || {};

  if (!facturaData || !departamento || !selectedTarifa) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 text-2xl">
          Error: Faltan datos para generar la factura.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Volver
        </button>
      </div>
    );
  }



  const handleDownloadImage = async () => {
    const input = facturaRef.current;
    if (!input) return;

    const canvas = await html2canvas(input, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgData;
    link.download = `factura - Dep${departamento.no_depto}.png`;
    link.click();
  };
  
  const handleConfirmAndUpload = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const canvas = await html2canvas(facturaRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
      });
      const imageUrl = canvas.toDataURL("image/png");

      // 1. Insertar pagos extras si existen
      if (facturaData.administracion > 0 || facturaData.servicios > 0) {
        const { error: pagosExtrasError } = await supabase
          .from("pagos_extras")
          .insert({
            id_departamento: departamento.id_departamento,
            administracion: facturaData.administracion,
            servicios: facturaData.servicios,
          });
        if (pagosExtrasError) throw pagosExtrasError;
      }

      // 2. Insertar la factura principal
      const { data: newFactura, error: facturaError } = await supabase
        .from("factura_departamento")
        .insert({
          ...facturaData,
          administracion: undefined,
          servicios: undefined,
        })
        .select()
        .single();

      if (facturaError) throw facturaError;

      // 3. Subir la imagen
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const fileName = `factura-img-${newFactura.id_factura}.png`;

      const { error: uploadError } = await supabase.storage
        .from("facturas")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 4. Obtener URL pública y actualizar la factura
      const { data: publicUrlData } = supabase.storage
        .from("facturas")
        .getPublicUrl(fileName);

      if (!publicUrlData)
        throw new Error("No se pudo obtener la URL pública de la imagen.");

      const { error: updateError } = await supabase
        .from("factura_departamento")
        .update({ url: publicUrlData.publicUrl })
        .eq("id_factura", newFactura.id_factura);

      if (updateError) throw updateError;

      alert("¡Factura guardada y subida con éxito!");
      if (onFacturaGenerada && typeof onFacturaGenerada === "function") {
        onFacturaGenerada();
      }
      navigate("/clientes"); // O a donde sea apropiado
    } catch (error) {
      console.error("Error al guardar y subir la factura:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg flex flex-col items-center justify-center">
        <div className="p-4 border-b">
          <h1 className="text-3xl font-bold text-center">
            Previsualización de Factura
          </h1>
          <p className="text-center text-gray-600">
            Cliente: {departamento.titular_depto} - Depto:{" "}
            {departamento.no_depto}
          </p>
        </div>

        {error && (
          <p className="m-4 text-red-500 bg-red-100 p-3 rounded-md">{error}</p>
        )}

        <div className="flex items-center justify-center  ">
          {/* Contenedor para controlar el tamaño de la previsualización */}
          <div
            style={{ transform: "scale(0.6)" }}
            className="flex items-center justify-center"
          >
            <Factura
              ref={facturaRef}
              facturaData={facturaData}
              departamento={departamento}
              selectedTarifa={selectedTarifa}
              selectedCuenta={selectedCuenta}
              configuracionImagen={configuracionImagen}
            />
          </div>
        </div>

        <div className=" border-t flex py-5 flex-col-reverse gap-3 items-center justify-center md:flex-row">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-500 hover:bg-gray-700 text-white flex gap-2 hover:cursor-pointer font-bold py-2 px-4 rounded"
          >
            <Icon icon="line-md:arrow-left-circle-twotone" width="24" />
            Volver
          </button>
          <div className="flex gap-4">
          <button
              onClick={handleDownloadImage}
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 flex gap-2 px-4 rounded hover:cursor-pointer"
            >
              <Icon icon="line-md:download-twotone-loop" width="24" />
              Descargar Imagen
            </button>
            {/* 2. AQUÍ ESTÁ EL CAMBIO CLAVE: EL BOTÓN PDF "NATIVO" */}
          <PDFDownloadLink
            document={
              <FacturaPDF
                facturaData={facturaData}
                departamento={departamento}
                selectedTarifa={selectedTarifa}
                selectedCuenta={selectedCuenta}
                saldoAnterior={0} // Puedes pasar el saldo si lo tienes calculado
              />
            }
            fileName={`Factura_${departamento.no_depto}.pdf`}
            className="text-decoration-none"
          >
            {({ loading }) => (
              <button
                className={`font-bold py-2 px-4 rounded flex items-center gap-2 ${
                  loading ? "bg-green-300 cursor-wait" : "bg-green-600 hover:bg-green-700"
                } text-white`}
              >
                <Icon icon="mdi:file-pdf-box" /> 
                {loading ? "Generando..." : "Descargar PDF"}
              </button>
            )}
          </PDFDownloadLink>
            <button
              onClick={handleConfirmAndUpload}
              disabled={isSaving}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold flex hover:cursor-pointer gap-2 py-2 px-4 rounded"
            >
              <Icon icon="line-md:cloud-alt-upload-twotone-loop" width="24" />
              {isSaving ? "Guardando..." : "Confirmar y Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacturaPage;
