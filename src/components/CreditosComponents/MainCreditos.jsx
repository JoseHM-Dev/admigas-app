import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Titulo } from "../ui/Titulo";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ModalNuevoPago } from "../ui/Modales/ModalNuevoPago";

export const MainCreditos = () => {
  const [creditos, setCreditos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargandoCreditos, setCargandoCreditos] = useState(false);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [error, setError] = useState(null);

  const [selectedRow, setSelectedRow] = useState(null); // ID del crédito seleccionado
  const [selectedCredit, setSelectedCredit] = useState(null); // Objeto crédito completo para el modal
  const [montoParaModal, setMontoParaModal] = useState(""); // Monto a precargar (para liquidar)

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCreditos = useCallback(async () => {
    setCargandoCreditos(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("carga_casa")
        .select(
          `id_carga, monto_pendiente, estado_pago, tipo_pago, casa_habitacion(*)`
        )
        .eq("estado_pago", false); // Solo deudas activas

      if (queryError) throw new Error(queryError.message);
      setCreditos(data || []);
    } catch (err) {
      setError(err.message);
      setCreditos([]);
    } finally {
      setCargandoCreditos(false);
    }
  }, []);

  // Modificado para traer tipo_pago
  const fetchPagos = async (id_carga) => {
    if (!id_carga) {
      setPagos([]);
      return;
    }
    setCargandoPagos(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("pagos")
        .select("id, fecha_pago, monto_pago, id_carga, tipo_pago") // Agregado tipo_pago
        .eq("id_carga", id_carga)
        .order("fecha_pago", { ascending: false });

      if (queryError) throw new Error(queryError.message);
      setPagos(data || []);
    } catch (err) {
      setError(err.message);
      setPagos([]);
    } finally {
      setCargandoPagos(false);
    }
  };

  useEffect(() => {
    fetchCreditos();
  }, [fetchCreditos]);

  const handleRowClick = (credito) => {
    setSelectedRow(credito.id_carga);
    // Nota: No seteamos selectedCredit aquí para el modal,
    // solo para visualización de tabla de pagos
    fetchPagos(credito.id_carga);
  };

  // NUEVA LÓGICA: Abre el modal en modo "Liquidar"
  const handleLiquidarClick = (credito) => {
    setSelectedCredit(credito);
    setMontoParaModal(credito.monto_pendiente); // Precarga el total
    setIsModalOpen(true);
  };

  // Lógica normal: Abre el modal vacío
  const handleNuevoPagoClick = () => {
    if (selectedRow) {
      // Buscar el objeto completo basado en el ID seleccionado en la tabla
      const creditoObj = creditos.find((c) => c.id_carga === selectedRow);
      if (creditoObj) {
        setSelectedCredit(creditoObj);
        setMontoParaModal(""); // Monto vacío para que escriban
        setIsModalOpen(true);
      }
    } else {
      alert(
        "Por favor, selecciona un crédito de la lista primero (haz clic en la fila)."
      );
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCredit(null);
    setMontoParaModal("");
  };

  const handlePagoGuardado = () => {
    fetchCreditos();
    if (selectedRow) {
      fetchPagos(selectedRow);
    }
  };

  const filteredCreditos = creditos.filter(
    (credito) =>
      (credito.casa_habitacion?.nombre_cliente?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (credito.casa_habitacion?.calle?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (
        credito.casa_habitacion?.numero?.toString().toLowerCase() || ""
      ).includes(searchTerm.toLowerCase())
  );

  return (
    <main>
      <Titulo Texto="Control de Créditos y Cobranza" />

      <section className="m-auto max-w-5xl p-4">
        <div className="flex flex-col mb-8 items-center gap-4 bg-white shadow-2xl rounded-4xl p-4 md:flex-row md:justify-between md:items-center transition-all duration-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              type="text"
              placeholder="Buscar por nombre, calle, número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-[#6432e4] hover:text-white min-w-[300px] md:min-w-[400px]"
            />
          </div>
          <div className="flex flex-col-reverse items-center gap-2 md:flex-row">
            <Link
              to="/dashboard"
              className="flex p-2 items-center border gap-2 font-bold bg-[#6432e4] text-white border-black rounded-md shadow-sm hover:bg-blue-600 transition-all hover:cursor-pointer"
            >
              <Icon icon="mdi:arrow-left" width="20" /> Regresar
            </Link>
            <button
              onClick={handleNuevoPagoClick}
              className="flex p-2 items-center border gap-2 font-bold bg-green-600 text-white border-black rounded-md shadow-sm hover:bg-green-700 transition-all hover:cursor-pointer"
            >
              <Icon icon="mdi:cash-plus" width="20" /> Nuevo Abono
            </button>
          </div>
        </div>

        <h2 className="font-extrabold flex justify-center text-3xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-3 animate-pulse">
          Cuentas por Cobrar
        </h2>

        <div className="m-4 overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-linear-to-r from-blue-500 to-indigo-600 text-white">
                <th className="py-3 px-6 text-center text-sm font-bold uppercase">
                  Cliente
                </th>
                <th className="py-3 px-6 text-center text-sm font-bold uppercase">
                  Ubicación
                </th>
                <th className="py-3 px-6 text-center text-sm font-bold uppercase">
                  Deuda
                </th>
                <th className="py-3 px-6 text-center text-sm font-bold uppercase">
                  Origen
                </th>
                <th className="py-3 px-6 text-center text-sm font-bold uppercase">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {cargandoCreditos ? (
                <tr>
                  <td colSpan="5" className="py-4 text-center">
                    Cargando...
                  </td>
                </tr>
              ) : filteredCreditos.length > 0 ? (
                filteredCreditos.map((credito) => (
                  <tr
                    key={credito.id_carga}
                    onClick={() => handleRowClick(credito)}
                    className={`border-b hover:bg-blue-50 cursor-pointer transition-colors ${
                      selectedRow === credito.id_carga
                        ? "bg-blue-100 border-l-4 border-l-blue-600"
                        : ""
                    }`}
                  >
                    <td className="py-3 px-6 text-center font-medium">
                      {credito.casa_habitacion?.nombre_cliente || "Cliente"}
                    </td>
                    <td className="py-3 px-6 text-center text-sm text-gray-600">
                      {credito.casa_habitacion?.calle} #
                      {credito.casa_habitacion?.numero},{" "}
                      {credito.casa_habitacion?.colonia}
                    </td>
                    <td className="py-3 px-6 text-center font-bold text-red-600">
                      $ {credito.monto_pendiente}
                    </td>
                    <td className="py-3 px-6 text-center text-xs uppercase text-gray-500">
                      {credito.tipo_pago}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Evita seleccionar la fila al hacer click en el botón
                          handleLiquidarClick(credito);
                        }}
                        className="flex items-center justify-center gap-1 text-white bg-indigo-500 px-3 py-1.5 rounded-md hover:bg-indigo-600 shadow-sm transition-all text-sm font-bold"
                      >
                        <Icon icon="mdi:check-all" width="18" /> Liquidar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-gray-500">
                    No hay créditos pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedRow && (
          <div className="mt-8 animate-in slide-in-from-bottom-4">
            <Titulo Texto="Historial de Pagos del Cliente" />
            <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="py-3 px-4 text-center text-sm font-bold uppercase">
                      Fecha
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-bold uppercase">
                      Monto
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-bold uppercase">
                      Método
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-bold uppercase">
                      ID Recibo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoPagos ? (
                    <tr>
                      <td colSpan="4" className="py-4 text-center">
                        Cargando pagos...
                      </td>
                    </tr>
                  ) : pagos.length > 0 ? (
                    pagos.map((pago) => (
                      <tr key={pago.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-center text-gray-700">
                          {new Date(pago.fecha_pago).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-green-600">
                          $ {pago.monto_pago}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                              pago.tipo_pago === "efectivo"
                                ? "bg-green-100 text-green-700"
                                : pago.tipo_pago === "transferencia"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {pago.tipo_pago || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-500 text-xs">
                          {pago.id}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-6 text-center text-gray-400 italic"
                      >
                        No hay pagos registrados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <ModalNuevoPago
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPagoGuardado={handlePagoGuardado}
        credito={selectedCredit}
        montoInicial={montoParaModal} // Pasamos el monto calculado
      />
    </main>
  );
};
