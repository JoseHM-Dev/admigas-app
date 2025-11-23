import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import fondoFactura from "../../../assets/Factura/fondo_de_factura.png";

const ModalFacturacion = ({ departamento, factura, edificio, onClose }) => {
  const [contrato, setContrato] = useState(null);
  const [lecturas, setLecturas] = useState([]);
  const [tarifa, setTarifa] = useState(null);
  const [pagosExtras, setPagosExtras] = useState(null);
  const [adeudos, setAdeudos] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!departamento || !factura || !edificio) return;
      setIsLoading(true);

      try {
        const deptoId = departamento.id_departamento || departamento.id;

        // Fetch contrato
        const { data: edificioData, error: edificioError } = await supabase
          .from("edificio")
          .select("num_contrato")
          .eq("id_edificio", edificio.id_edificio)
          .single();
        if (edificioError) throw edificioError;
        setContrato(edificioData);

        // Fetch lecturas
        const { data: lecturasData, error: lecturasError } = await supabase
          .from("lectura")
          .select("*")
          .eq("id_departamento", deptoId)
          .order("fecha_lectura", { ascending: false })
          .limit(2);
        if (lecturasError) throw lecturasError;
        setLecturas(lecturasData);

        // Fetch tarifa
        const { data: tarifaData, error: tarifaError } = await supabase
          .from("tarifa")
          .select("*")
          .order("id", { ascending: false })
          .limit(1);
        if (tarifaError) throw tarifaError;
        setTarifa(tarifaData[0]);

        // Fetch pagos extras
        const { data: pagosExtrasData, error: pagosExtrasError } =
          await supabase
            .from("pagos_extras")
            .select("*")
            .eq("id_departamento", deptoId)
            .order("id", { ascending: false })
            .limit(1);
        if (pagosExtrasError) throw pagosExtrasError;
        setPagosExtras(pagosExtrasData[0]);

        // Fetch adeudos
        const { data: adeudosData, error: adeudosError } = await supabase
          .from("factura_departamento")
          .select("monto")
          .eq("departamento_id", deptoId)
          .eq("estado_pago", false)
          .lt("fecha_factura", factura.fecha_factura);
        if (adeudosError) throw adeudosError;
        const totalAdeudos = adeudosData.reduce(
          (acc, curr) => acc + curr.monto,
          0
        );
        setAdeudos(totalAdeudos);
      } catch (error) {
        console.error("Error fetching data for invoice:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [departamento, factura, edificio]);

  const handlePrint = () => {
    const printContents =
      document.getElementById("printable-invoice").innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // to reload the original content and styles
  };

  if (!departamento || !factura || !edificio) return null;

  const penultimaLectura = lecturas[1] || {};
  const ultimaLectura = lecturas[0] || {};

  const importeConsumo = factura.monto || 0;
  const adminCost = pagosExtras?.administracion || 0;
  const servicesCost = pagosExtras?.servicios || 0;
  const importeTotal = importeConsumo + adeudos + adminCost + servicesCost;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = date.toLocaleString("es-MX", {
      month: "long",
      timeZone: "UTC",
    });
    const year = date.getUTCFullYear();
    return `${day} - ${
      month.charAt(0).toUpperCase() + month.slice(1)
    } - ${year}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl w-[816px] h-[1056px]">
        {" "}
        {/* A4 paper size approx */}
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-xl">Cargando datos de la factura...</p>
          </div>
        ) : (
          <>
            <div
              id="printable-invoice"
              className="w-full h-full p-10"
              style={{
                backgroundImage: `url(${fondoFactura})`,
                backgroundSize: "cover",
              }}
            >
              {/* Header */}
              <div className="text-left mb-8">
                <h1 className="text-5xl font-bold text-purple-700">Factura</h1>
                <p className="text-gray-600 mt-2">
                  No. Contrato: G.M. GAS - 1122 - {contrato?.num_contrato}
                </p>
                <p className="text-red-500 font-semibold">
                  Fecha de Emisión: {formatDate(factura.fecha_factura)}
                </p>
              </div>

              {/* Client Info */}
              <div className="flex justify-between items-start mb-6">
                <div className="border border-red-400 p-2 rounded-md text-sm w-2/3">
                  <h2 className="font-bold text-lg text-purple-700 mb-1">
                    Cliente
                  </h2>
                  <p>
                    <strong>Nombre:</strong> {departamento.titular_depto}
                  </p>
                  <p>
                    <strong>Dirección:</strong>{" "}
                    {`${edificio.calle} ${edificio.numero}, ${edificio.colonia}, ${edificio.delegacion}`}
                  </p>
                </div>
                <div className="border border-red-400 p-2 rounded-md text-center">
                  <h2 className="font-bold text-lg text-purple-700 mb-1">
                    Departamento
                  </h2>
                  <p className="text-5xl font-bold text-cyan-500">
                    {departamento.no_depto}
                  </p>
                </div>
              </div>

              {/* Medidor */}
              <div className="text-center mb-4">
                <h2 className="font-bold text-lg text-purple-700">Medidor</h2>
              </div>
              <div className="flex justify-around items-center mb-6">
                <div className="text-center">
                  <p className="text-red-500 font-semibold">
                    {formatDate(penultimaLectura.fecha_lectura)}
                  </p>
                  <img
                    src={
                      penultimaLectura.url ||
                      "https://via.placeholder.com/200x100?text=No+Imagen"
                    }
                    alt="Lectura anterior"
                    className="w-48 h-auto border-2 border-gray-300 rounded-md mt-1"
                  />
                </div>
                <p className="text-gray-500 font-bold">al</p>
                <div className="text-center">
                  <p className="text-red-500 font-semibold">
                    {formatDate(ultimaLectura.fecha_lectura)}
                  </p>
                  <img
                    src={
                      ultimaLectura.url ||
                      "https://via.placeholder.com/200x100?text=No+Imagen"
                    }
                    alt="Lectura actual"
                    className="w-48 h-auto border-2 border-gray-300 rounded-md mt-1"
                  />
                </div>
              </div>

              {/* Consumo y Pago */}
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-red-400 p-4 rounded-md">
                  <h3 className="font-bold text-center text-red-500 mb-3">
                    Datos Consumo
                  </h3>
                  <div className="text-sm space-y-1">
                    <p className="flex justify-between">
                      <span>Lec. Antes:</span>{" "}
                      <span className="font-semibold">
                        {penultimaLectura.valor_lectura?.toFixed(3)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Lec. Despues:</span>{" "}
                      <span className="font-semibold">
                        {ultimaLectura.valor_lectura?.toFixed(3)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Consumo M3:</span>{" "}
                      <span className="font-semibold">
                        {factura.consumo_lectura?.toFixed(3)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Factor:</span>{" "}
                      <span className="font-semibold">{tarifa?.factor}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Precio M3:</span>{" "}
                      <span className="font-semibold">
                        ${tarifa?.precio_m3?.toFixed(3)}
                      </span>
                    </p>
                    <div className="flex justify-between items-center bg-yellow-400 font-bold p-1 mt-2 rounded">
                      <span>Importe:</span>
                      <span>${importeConsumo.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="border border-red-400 p-4 rounded-md">
                  <h3 className="font-bold text-center text-red-500 mb-3">
                    Resumen de Pago
                  </h3>
                  <div className="text-sm space-y-1">
                    <p className="flex justify-between">
                      <span>Importe Consumo:</span>{" "}
                      <span className="font-semibold">
                        ${importeConsumo.toFixed(2)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Adeudo Gas:</span>{" "}
                      <span className="font-semibold">
                        ${adeudos.toFixed(2)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Administración:</span>{" "}
                      <span className="font-semibold">
                        ${adminCost.toFixed(2)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Otros Servicios:</span>{" "}
                      <span className="font-semibold">
                        ${servicesCost.toFixed(2)}
                      </span>
                    </p>
                    <div className="flex justify-between items-center bg-cyan-400 text-white font-bold p-2 mt-6 rounded-lg text-lg">
                      <span>Importe a pagar:</span>
                      <span>${importeTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={onClose}
                className="bg-gray-500 text-white px-4 py-2 rounded-md"
              >
                Cerrar
              </button>
              <button
                onClick={handlePrint}
                className="bg-blue-500 text-white px-4 py-2 rounded-md"
              >
                Imprimir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalFacturacion;
