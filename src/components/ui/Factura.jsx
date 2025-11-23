import React, { useState, useEffect } from "react";
import fondoFactura from "../../assets/Factura/fondo_de_factura.png";
// Asegúrate de que la ruta a supabaseClient sea correcta
import { supabase } from "../../supabaseClient";
import { Icon } from "@iconify/react";

const Factura = React.forwardRef(
  (
    {
      facturaData,
      departamento,
      selectedTarifa,
      selectedCuenta,
      configuracionImagen,
    },
    ref
  ) => {
    const [infoLecturas, setInfoLecturas] = useState({
      penultima: { fecha: null, imagen: null, lectura: null },
      ultima: { fecha: null, imagen: null, lectura: null },
    });

    const [factorConversion, setFactorConversion] = useState(null);
    const [saldoAnterior, setSaldoAnterior] = useState(0);
    const [telefonoContacto, setTelefonoContacto] = useState(null);
    const [logoUrl, setLogoUrl] = useState(null);

    useEffect(() => {
      const fetchDatos = async () => {
        if (!departamento?.id_departamento) return;

        try {
          const { data, error } = await supabase
            .from("lectura")
            .select("fecha_lectura, url, valor_lectura")
            .eq("id_departamento", departamento.id_departamento)
            .order("fecha_lectura", { ascending: false })
            .limit(2);

          if (error) throw error;

          if (data && data.length >= 2) {
            setInfoLecturas({
              ultima: {
                fecha: data[0].fecha_lectura,
                imagen: data[0].url,
                lectura: data[0].valor_lectura,
              },
              penultima: {
                fecha: data[1].fecha_lectura,
                imagen: data[1].url,
                lectura: data[1].valor_lectura,
              },
            });
          } else if (data && data.length === 1) {
            setInfoLecturas({
              ultima: {
                fecha: data[0].fecha_lectura,
                imagen: data[0].url,
                lectura: data[0].valor_lectura,
              },
              penultima: { fecha: null, imagen: null, lectura: null },
            });
          }

          const { data: dataUnidad, error: errorUnidad } = await supabase
            .from("unidad")
            .select("telefono_1")
            .order("id", { ascending: false })
            .limit(1)
            .single();

          if (dataUnidad) {
            setTelefonoContacto(dataUnidad.telefono_1);
          } else if (errorUnidad) {
            console.error("Error al obtener teléfono:", errorUnidad);
          }

          if (selectedTarifa?.id_tarifa) {
            const { data: dataTarifa, error: errorTarifa } = await supabase
              .from("tarifa")
              .select("factor")
              .eq("id_tarifa", selectedTarifa.id_tarifa)
              .single();

            if (errorTarifa) {
              console.error("Error cargando factor:", errorTarifa);
            } else if (dataTarifa) {
              setFactorConversion(dataTarifa.factor);
            }
          }

          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user && user.user_metadata && user.user_metadata.avatar_url) {
            setLogoUrl(user.user_metadata.avatar_url);
          }

          const { data: dataDeuda, error: errorDeuda } = await supabase
            .from("factura_departamento")
            .select("saldo_por_pagar")
            .eq("departamento_id", departamento.id_departamento)
            .eq("estado_pago", false);

          if (errorDeuda) {
            console.error("Error calculando deuda:", errorDeuda);
          } else if (dataDeuda) {
            const totalDeuda = dataDeuda.reduce(
              (acc, curr) => acc + (curr.saldo_por_pagar || 0),
              0
            );
            setSaldoAnterior(totalDeuda);
          }
        } catch (err) {
          console.error("Error general:", err);
        }
      };

      fetchDatos();
    }, [departamento, selectedTarifa]);

    if (!facturaData || !departamento || !selectedTarifa) {
      return <p>Faltan datos para generar la factura.</p>;
    }

    const adeudoGas = saldoAnterior;

    const totalFactura =
      (facturaData.monto || 0) +
      (facturaData.administracion || 0) +
      (facturaData.servicios || 0) +
      (adeudoGas || 0);

    return (
      <div
        ref={ref}
        style={{
          width: "800px",
          height: "1100px",
          position: "relative",
          fontFamily: "Poppins, sans-serif",
          color: "black",
          backgroundColor: "white",
          overflow: "hidden",
          // CORRECCIÓN 1: letterSpacing evita que el texto se expanda de más en el PDF
          letterSpacing: "2px", 
        }}
      >
        <img
          src={fondoFactura}
          alt="Fondo"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
            objectFit: "cover",
          }}
        />

        <div style={{ position: "relative", zIndex: 10 }}>
          
          <div
            style={{ position: "absolute", top: "80px", left: "60px" }}
            className="text-5xl text-[#644FD0] font-medium"
          >
            Factura
          </div>

          {logoUrl && configuracionImagen?.mostrar && (
            <div
              style={{
                position: "absolute",
                top: "60px",
                left: "500px",
                right: "60px",
                width: "150px",
                height: "150px",
                overflow: "hidden",
                zIndex: 10,
              }}
            >
              <img
                src={logoUrl}
                alt="Logo Empresa"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                crossOrigin="anonymous"
              />
            </div>
          )}

          {/* CORRECCIÓN 2: whiteSpace: "nowrap" en Contrato */}
          <div
            style={{ position: "absolute", top: "150px", left: "62px", whiteSpace: "nowrap" }}
            className="text-[#644fd0] flex flex-row gap-4 items-center justify-center font-medium"
          >
            <div>
              <p>No. Contrato:</p>
            </div>

            <div className="text-[#EE5F63] flex flex-row justify-center">
              G.M. GAS - 1122 -{departamento.edificio.id_contrato}
            </div>
          </div>

          {/* CORRECCIÓN 3: whiteSpace: "nowrap" en Fecha */}
          <div
            style={{ position: "absolute", top: "175px", left: "62px", whiteSpace: "nowrap" }}
            className="text-[#644fd0] flex flex-row gap-1 items-center justify-center font-medium"
          >
            Fecha de Emisión:
            <p className="text-[#EE5F63] flex flex-row justify-center ml-2">
              {new Date(facturaData.fecha_factura).toLocaleDateString()}
            </p>
          </div>

          {/* Titulos Cliente/Depto */}
          <div
            style={{ position: "absolute", top: "215px", left: "188px", whiteSpace: "nowrap" }}
            className="flex flex-row  text-[#644fd0] items-center justify-center font-medium text-xl"
          >
            <div>Cliente</div>
            <div style={{ position: "relative", top: "0px", left: "215px" }}>Departamento</div>
          </div>

          <div
            style={{ position: "absolute", top: "260px", left: "60px" }}
            className=" w-[680px] flex flex-row justify-between"
          >
            <div style={{ position: "relative", top: "0px", left: "0px" }} className="w-[330px] border-2 border-[#ee5f63] rounded-xl text-md ">
              <div 
              style={{ position: "relative", top: "-10px", left: "0px" }}
              className="flex flex-col text-center mb-2">
                <p className="text-[#0094A2] font-bold">Nombre:</p>
                {/* CORRECCIÓN 4: Evitamos que el nombre rompa el layout */}
                <p className="text-[#EE5F63] font-medium" style={{ whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {departamento.titular_depto}
                </p>
              </div>
              <div style={{ position: "relative", top: "-15px", left: "0px" }} className="flex flex-col text-center">
                <p className="text-[#0094A2] font-bold">Dirección: </p>
                {/* CORRECCIÓN 5: lineHeight controlado para la dirección */}
                <p className="text-[#644fd0]" style={{ lineHeight: "1.2", fontSize: "14px" }}>
                  {departamento.edificio.calle} #{departamento.edificio.numero},{" "}
                  {departamento.edificio.colonia} {departamento.edificio.cp},{" "}
                  {departamento.edificio.delegacion}
                </p>
              </div>
            </div>
            
            <div  className="w-[330px] border-2 border-[#ee5f63] rounded-xl text-center flex items-center justify-center font-extrabold text-5xl text-[#0094A2]">
              <p style={{ position: "relative", top: "-35px", left: "0px" }}>{departamento.no_depto}</p>
            </div>
          </div>

          <div
            style={{ position: "absolute", top: "380px", left: "358px" }}
            className="flex flex-row gap-60 text-[#644fd0] items-center justify-center font-medium text-xl"
          >
            <div>Medidor</div>
          </div>

          <div
            style={{ position: "absolute", top: "420px", left: "60px" }}
            className="w-[680px] flex flex-row justify-around text-lg font-medium"
          >
            {/* LECTURA ANTERIOR */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[#0094A2]">Lectura Anterior</span>
              {/* CORRECCIÓN 6: nowarp en fechas */}
              <span style={{ position: "relative", top: "-10px", left: "0px", whiteSpace: "nowrap"}} className="text-[#EE5F63]">
                {infoLecturas.penultima.fecha
                  ? new Date(infoLecturas.penultima.fecha).toLocaleDateString(
                      "es-MX",
                      { timeZone: "UTC" }
                    )
                  : "Cargando..."}
              </span>
              {infoLecturas.penultima.imagen && (
                <img
                  src={infoLecturas.penultima.imagen}
                  alt="Evidencia Anterior"
                  className="w-[330px] h-24 object-cover border-2 border-[#EE5F63] p-2 rounded-lg shadow-sm"
                  crossOrigin="anonymous"
                />
              )}
            </div>

            {/* LECTURA ACTUAL */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-[#0094A2]">Lectura Actual</span>
              <span style={{ position: "relative", top: "-10px", left: "0px", whiteSpace: "nowrap"}} className="text-[#EE5F63]">
                {infoLecturas.ultima.fecha
                  ? new Date(infoLecturas.ultima.fecha).toLocaleDateString(
                      "es-MX",
                      { timeZone: "UTC" }
                    )
                  : "Cargando..."}
              </span>
              {infoLecturas.ultima.imagen && (
                <img
                  src={infoLecturas.ultima.imagen}
                  alt="Evidencia Actual"
                  className="w-[330px] h-24 object-cover border-2 border-[#EE5F63] p-2 rounded-lg shadow-sm"
                  crossOrigin="anonymous"
                />
              )}
            </div>
          </div>

          {/* --- TABLAS DE DATOS --- */}
          <div
            style={{ position: "absolute", top: "600px", left: "60px" }}
            className="flex flex-row w-[680px] justify-between "
          >
            {/* COLUMNA IZQUIERDA: DATOS CONSUMO */}
            <div  className="w-[335px] flex flex-col m-2 border-2 border-[#ee5f63] rounded-xl p-3 h-60">
              <span style={{ position: "relative", top: "-25px", left: "0px" }} className="text-center font-medium text-[#ee5f63] m-2 mb-4">
                Datos Consumo
              </span>
              <div className="flex flex-col gap-1"> {/* Usamos gap-1 en lugar de depender solo del flow */}
                
                {/* CORRECCIÓN 7: Aplicamos whiteSpace: nowrap a cada fila para evitar cruces */}
                <div style={{ position: "relative", top: "-25px", left: "0px", whiteSpace: "nowrap" }} className="flex flex-row justify-between" >
                  <span className="text-[#0094A2]">Lec. Antes:</span>
                  <span className="text-[#644fd0]">
                    {infoLecturas.penultima.lectura} m3
                  </span>
                </div>

                <div  style={{ position: "relative", top: "-25px", left: "0px", whiteSpace: "nowrap" }} className="flex flex-row justify-between" >
                  <span  className="text-[#0094A2]">Lec. Despues:</span>
                  <span className="text-[#644fd0]">
                    {infoLecturas.ultima.lectura} m3
                  </span>
                </div>

                <div className="flex flex-row justify-between"  style={{ position: "relative", top: "-25px", left: "0px", whiteSpace: "nowrap" }}>
                  <span className="text-[#0094A2]">Consumo M3:</span>
                  <span className="text-[#644fd0]">
                    {facturaData.consumo_lectura.toFixed(2)} m3
                  </span>
                </div>

                <div className="flex flex-row justify-between"  style={{ position: "relative", top: "-25px", left: "0px", whiteSpace: "nowrap" }}>
                  <span className="text-[#0094A2]">Factor:</span>
                  <span className="text-[#644fd0]">
                    {factorConversion !== null
                      ? Number(factorConversion).toFixed(2)
                      : "Cargando..."}
                  </span>
                </div>

                <div className="flex flex-row justify-between"  style={{ position: "relative", top: "-25px", left: "0px", whiteSpace: "nowrap" }}>
                  <span className="text-[#0094A2]">Precio M3:</span>
                  <span className="text-[#644fd0]">
                    ${selectedTarifa.precio_m3.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: RESUMEN PAGO */}
            <div className="w-[335px] flex flex-col m-2 border-2 border-[#ee5f63] rounded-xl p-3 h-60">
              <span style={{ position: "relative", top: "-25px", left: "0px" }} className="text-center font-medium text-[#ee5f63] m-2 mb-4">
                Resumen de Pago
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex flex-row justify-between"  style={{ position: "relative", top: "-25px", left: "0px", whiteSpace: "nowrap" }}>
                  <span className="text-[#0094A2]">Importe Consumo:</span>
                  <span className="text-[#644fd0]">
                    ${facturaData.monto.toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-row justify-between"  style={{ position: "relative", top: "-25px", left: "0px", whiteSpace: "nowrap" }}>
                  <span className="text-[#0094A2]">Adeudo Gas:</span>
                  <span className="text-[#644fd0]">
                    ${saldoAnterior.toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-row justify-between"  style={{ position: "relative", top: "-25px", left: "0px", whiteSpace: "nowrap" }}>
                  <span className="text-[#0094A2]">Administración:</span>
                  <span className="text-[#644fd0]">
                    ${(facturaData.administracion || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex flex-row justify-between"  style={{ position: "relative", top: "-25px", left: "0px", whiteSpace: "nowrap" }}>
                  <span className="text-[#0094A2]">Otros Servicios:</span>
                  <span className="text-[#644fd0]">
                    ${(facturaData.servicios || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TOTALES */}
          <div
            style={{ position: "absolute", top: "800px", left: "70px" }}
            className="w-[320px] bg-[#facb56] h-[30px] items-center justify-center flex font-bold"
          >
            <div className="flex flex-row justify-between w-[300px]" style={{ position: "relative", top: "-15px", left: "0px", whiteSpace: "nowrap" }}>
              <span className="text-[#0094A2]">Importe:</span>
              <span className="text-[#ee5f63]">
                ${facturaData.monto.toFixed(2)}
              </span>
            </div>
          </div>

          <div
            style={{ position: "absolute", top: "800px", left: "410px" }}
            className="w-[300px] bg-[#facb56] h-[30px] items-center justify-center flex font-bold"
          >
            <div className="flex flex-row w-[300px] m-3" style={{ position: "relative", top: "-15px", left: "0px", whiteSpace: "nowrap" }}>
              <span className="text-[#0094A2]">Importe a pagar:</span>
            </div>
          </div>

          <div
            style={{ position: "absolute", top: "790px", left: "620px" }}
            className=" bg-[#0094A2] text-end h-[50px] items-center justify-center flex font-extrabold text-2xl rounded-2xl px-4"
          >
            <span className="text-[#ee5f63]" style={{ position: "relative", top: "-20px", left: "0px", whiteSpace: "nowrap" }}>
                ${totalFactura.toFixed(2)}
            </span>
          </div>

          {/* FOOTER */}
          <div
            style={{ position: "absolute", top: "900px", left: "0px" }}
            className="bg-[#ee5f63] opacity-80 w-full flex justify-between items-center px-10 py-4 h-[155px]"
          >
            <div className="text-[#ffff] flex flex-col justify-center">
              <p className="font-bold text-lg  pb-1" style={{ position: "relative", top: "-15px", left: "0px", whiteSpace: "nowrap" }}>
                Datos Bancarios para Transferencia
              </p>

              {selectedCuenta ? (
                <div className="text-sm leading-relaxed font-medium" style={{ position: "relative", top: "-15px", left: "0px", whiteSpace: "nowrap" }}>
                  <p style={{ whiteSpace: "nowrap" }}>
                    Banco:{" "}
                    <span className="font-bold text-[#facb56]">
                      {selectedCuenta.nom_banco}
                    </span>
                  </p>
                  <p style={{ whiteSpace: "nowrap" }}>Titular: {selectedCuenta.nom_responsable}</p>
                  <div className="flex gap-4 mt-1">
                    <p style={{ whiteSpace: "nowrap" }}>Cuenta: {selectedCuenta.cuenta}</p>
                  </div>
                  <div className="flex gap-1">
                    <p>CLABE:</p>
                    <p className="text-xl" style={{ whiteSpace: "nowrap" }}>{selectedCuenta.clave_int}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic opacity-80">
                  Sin datos bancarios seleccionados
                </p>
              )}
            </div>

            <div className="text-[#ffff] flex flex-col items-end justify-center text-right" style={{ position: "relative", top: "-15px", left: "0px", whiteSpace: "nowrap" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">Atención a Clientes</span>
              </div>
              <p className="text-sm">Dudas o aclaraciones:</p>
              <div className="flex justify-center items-center " style={{ position: "relative", top: "15px", left: "0px",  gap: "10px" }}>
                <Icon icon="logos:whatsapp-icon" width="40" />
                <p className="font-bold text-lg tracking-wider text-[#ffff]" style={{ whiteSpace: "nowrap", position: "relative", top: "-15px", left: "0px"}}>
                  {telefonoContacto || "Cargando..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default Factura;