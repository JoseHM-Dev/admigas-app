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
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCreditos = useCallback(async () => {
    setCargandoCreditos(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("carga_casa")
        .select(
          `
          id_carga,
          monto_pendiente,
          estado_pago,
          tipo_pago,
          casa_habitacion(*)
        `
        )
        .eq("estado_pago", false);

      if (queryError) {
        throw new Error(queryError.message || "Error al obtener los créditos.");
      }

      setCreditos(data || []);
    } catch (err) {
      setError(err.message);
      setCreditos([]);
    } finally {
      setCargandoCreditos(false);
    }
  }, []);

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
        .select("id, fecha_pago, monto_pago, id_carga")
        .eq("id_carga", id_carga);

      if (queryError) {
        throw new Error(queryError.message || "Error al obtener los pagos.");
      }

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
    setSelectedCredit(credito);
    fetchPagos(credito.id_carga);
  };

  const handleLiquidar = async (id_carga) => {
    try {
      const { error } = await supabase
        .from("carga_casa")
        .update({ estado_pago: true, monto_pendiente: 0 })
        .eq("id_carga", id_carga);

      if (error) {
        throw new Error(error.message || "Error al liquidar el crédito.");
      }

      fetchCreditos();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenModal = () => {
    if (selectedCredit) {
      setIsModalOpen(true);
    } else {
      alert("Por favor, selecciona un crédito para registrar un pago.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCredit(null);
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
      <Titulo Texto="Tus Creditos" />

      <section className="m-auto max-w-5xl p-4">
        <div className="flex flex-col mb-8 items-center gap-4 bg-white shadow-2xl rounded-4xl p-4 md:flex-row md:justify-between md:items-center transition-all duration-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              type="text"
              placeholder="Buscar por nombre, calle, número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-[#6432e4] hover:text-white min-w-[400px]"
            />
          </div>
          <div className="flex flex-col-reverse items-center gap-2 md:flex-row">
            <Link
              to="/dashboard"
              className="flex p-2 items-center border gap-4 m-3 font-bold bg-[#6432e4] text-white  border-black rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
            >
              <Icon icon="line-md:arrow-left-circle-twotone" width="24" />
              Regresar
            </Link>
            <button
              onClick={handleOpenModal}
              className="flex p-2 items-center border gap-4 m-3 font-bold bg-[#6432e4] text-white  border-black rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-150 hover:cursor-pointer"
            >
              <Icon icon="dashicons:money-alt" width="25" />
              Nuevo Pago
            </button>
          </div>
        </div>

        <h2 className=" font-extrabold flex justify-center text-3xl text-transparent bg-clip-text bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] my-3  transition-all duration-200 animate-pulse">
          Créditos Pendientes
        </h2>
        <div className="m-8 overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
            <thead>
              <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  ID
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Cliente
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Direccion
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Monto Pendiente
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Tipo De Pago
                </th>
                <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {cargandoCreditos ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-4 px-4 text-center text-gray-600"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-4 px-4 text-center text-red-500"
                  >
                    Error: {error}
                  </td>
                </tr>
              ) : filteredCreditos.length > 0 ? (
                filteredCreditos.map((credito) => (
                  <tr
                    key={credito.id_carga}
                    onClick={() => handleRowClick(credito)}
                    className={`hover:bg-blue-50 transition-all duration-150 hover:cursor-pointer  ${
                      selectedRow === credito.id_carga
                        ? "bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] text-white"
                        : ""
                    }`}
                  >
                    <td className="py-3 px-6 text-left text-sm text-gray-500">
                      {credito.id_carga}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-800">
                      {credito.casa_habitacion?.nombre || "N/A"}{" "}
                      {credito.casa_habitacion?.apellido || "N/A"}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-700">
                      {credito.casa_habitacion?.calle || "N/A"} #
                      {credito.casa_habitacion?.numero || "N/A"},{" "}
                      {credito.casa_habitacion?.colonia || "N/A"}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-900">
                      $ {credito.monto_pendiente}
                    </td>
                    <td className="py-3 px-6 text-center whitespace-nowrap text-sm text-gray-900">
                      {credito.tipo_pago}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLiquidar(credito.id_carga);
                        }}
                        className="flex gap-2 text-white bg-green-500  px-3 py-1 rounded hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5 transition-all duration-300 hover:cursor-pointer"
                      >
                        <Icon icon="ic:sharp-money-off" width="24" />
                        Liquidar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="py-4 px-4 text-center text-gray-500"
                  >
                    No hay créditos pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedRow && (
          <>
            <Titulo Texto={"Historial de Pagos"} />

            <div className="overflow-x-auto shadow-lg rounded-lg">
              <table className="min-w-full bg-black/10 border border-gray-500 overflow-hidden rounded-lg">
                <thead>
                  <tr className="bg-linear-to-r from-blue-400 to-emerald-400 text-white ">
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      ID Pago
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      Monto de Pago
                    </th>
                    <th className="py-3 px-6 text-center text-sm font-medium uppercase tracking-wider">
                      ID Carga
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoPagos ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-4 px-4 text-center text-gray-600"
                      >
                        Cargando...
                      </td>
                    </tr>
                  ) : pagos.length > 0 ? (
                    pagos.map((pago) => (
                      <tr
                        key={pago.id}
                        className="hover:bg-black/50 hover:text-white transition-all duration-300"
                      >
                        <td className="py-2 px-4 text-center">{pago.id}</td>
                        <td className="py-2 px-4 text-center">
                          {pago.fecha_pago}
                        </td>
                        <td className="py-2 px-4 text-center">
                          $ {pago.monto_pago}
                        </td>
                        <td className="py-2 px-4 text-center">
                          {pago.id_carga}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-4 px-4 text-center text-gray-500"
                      >
                        No hay pagos registrados para este crédito.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      <ModalNuevoPago
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPagoGuardado={handlePagoGuardado}
        credito={selectedCredit}
      />
    </main>
  );
};
