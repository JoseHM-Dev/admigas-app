import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { Icon } from "@iconify/react";

// --- IMPORTS DE MAPA (Leaflet) ---
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Corregir icono default de Leaflet que a veces se rompe en React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const ModalNuevoCliente = ({
  isOpen,
  onClose,
  contrato,
  cliente: clienteToEdit,
}) => {
  const navigate = useNavigate();

  // Coordenadas iniciales (Centro de México o tu ciudad por defecto)
  const defaultCenter = [19.4326, -99.1332]; // CDMX por defecto

  const [cliente, setCliente] = useState({
    nombre_cliente: "",
    apellido_cliente: "",
    telefono: "",
    calle: "",
    numero: "",
    colonia: "",
    delegacion: "",
    cp: "",
    latitud: null,   // Nuevo
    longitud: null,  // Nuevo
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  
  // Estado para controlar el mapa
  const [mapPosition, setMapPosition] = useState(defaultCenter);
  const [cargandoDireccion, setCargandoDireccion] = useState(false);

  const isEditMode = Boolean(clienteToEdit);
  const idContrato = isEditMode
    ? clienteToEdit?.id_contrato
    : contrato?.id_contrato;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setCliente(clienteToEdit);
        // Si el cliente ya tiene coordenadas, centramos el mapa ahí
        if (clienteToEdit.latitud && clienteToEdit.longitud) {
            setMapPosition([clienteToEdit.latitud, clienteToEdit.longitud]);
        }
      } else {
        setCliente({
          nombre_cliente: "",
          apellido_cliente: "",
          telefono: "",
          calle: "",
          numero: "",
          colonia: "",
          delegacion: "",
          cp: "",
          latitud: null,
          longitud: null,
        });
        // Intentar obtener ubicación actual del navegador al abrir
        navigator.geolocation.getCurrentPosition(
            (pos) => setMapPosition([pos.coords.latitude, pos.coords.longitude]),
            (err) => console.log("No se pudo obtener ubicación autmática", err)
        );
      }
      setError("");
      setGuardando(false);
    }
  }, [isOpen, clienteToEdit, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCliente((prev) => ({ ...prev, [name]: value }));
  };

  const handleCPChange = (e) => {
    const cpIngresado = e.target.value;
    if (!/^\d*$/.test(cpIngresado)) return;
    setCliente((prev) => ({ ...prev, cp: cpIngresado }));
  };

  // --- LÓGICA DEL MAPA: DETECTAR CLIC Y OBTENER DIRECCIÓN ---
  const LocationMarker = () => {
    const map = useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setMapPosition([lat, lng]);
        actualizarUbicacion(lat, lng);
      },
    });

    // Mover el mapa si cambiamos la posición programáticamente
    useEffect(() => {
        map.flyTo(mapPosition, map.getZoom());
    }, [mapPosition]);

    return mapPosition ? <Marker position={mapPosition} /> : null;
  };

  const actualizarUbicacion = async (lat, lng) => {
    // 1. Guardar Coordenadas
    setCliente(prev => ({ ...prev, latitud: lat, longitud: lng }));
    
    // 2. Geocoding Inverso (Nominatim API)
    setCargandoDireccion(true);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.address) {
            const addr = data.address;
            
            // Mapeo inteligente de campos de OSM a tu Formulario
            setCliente(prev => ({
                ...prev,
                latitud: lat,
                longitud: lng,
                // Calle: puede venir como road, pedestrian, street...
                calle: addr.road || addr.pedestrian || addr.street || prev.calle,
                // Número: house_number
                numero: addr.house_number || prev.numero,
                // Colonia: neighbourhood, suburb, quarter
                colonia: addr.neighbourhood || addr.suburb || addr.quarter || prev.colonia,
                // CP: postcode
                cp: addr.postcode || prev.cp,
                // Delegación/Municipio: city, town, village, county
                delegacion: addr.city || addr.town || addr.village || addr.county || prev.delegacion
            }));
        }
    } catch (error) {
        console.error("Error obteniendo dirección:", error);
    } finally {
        setCargandoDireccion(false);
    }
  };

  // --- GUARDADO EN BD ---
  const guardarDatosEnBD = async () => {
    if (isEditMode) {
      if (!clienteToEdit.id_casa) throw new Error("No ID cliente.");
    } else {
      if (!idContrato) throw new Error("No ID contrato.");
    }
    if (!cliente.nombre_cliente || !cliente.calle) {
      throw new Error("Nombre y Calle son obligatorios.");
    }

    // Preparamos el objeto a guardar (incluye lat/lng)
    const datosAGuardar = {
        ...cliente,
        // Aseguramos que se guarden como números o null
        latitud: cliente.latitud ? parseFloat(cliente.latitud) : null,
        longitud: cliente.longitud ? parseFloat(cliente.longitud) : null,
    };

    if (isEditMode) {
      const { data, error } = await supabase
        .from("casa_habitacion")
        .update(datosAGuardar)
        .eq("id_casa", clienteToEdit.id_casa);
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from("casa_habitacion")
        .insert([{ id_contrato: idContrato, ...datosAGuardar }]);
      if (error) throw error;
      return data;
    }
  };

  const handleGuardarCliente = async () => {
    setGuardando(true);
    setError("");
    try {
      await guardarDatosEnBD();
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarEIrAVentas = async () => {
    setGuardando(true);
    setError("");
    try {
      await guardarDatosEnBD();
      navigate("/ventas");
    } catch (error) {
      setError(error.message);
      setGuardando(false);
    }
  };

  const handleCancel = async () => {
    if (!idContrato && !isEditMode) {
      onClose();
      return;
    }
    if (!isEditMode) {
      if (window.confirm("¿Cancelar? Se eliminará el contrato creado.")) {
        try {
          await supabase.from("contrato").delete().eq("id_contrato", idContrato);
        } catch (error) {
          console.error(error);
        } finally {
          onClose();
        }
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl m-4 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Icon
                icon={isEditMode ? "mdi:account-edit" : "mdi:map-marker-account"}
                className="text-white w-7 h-7"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                {isEditMode ? "Modificar Ubicación" : "Nuevo Cliente"}
              </h2>
              <p className="text-xs text-blue-100 opacity-80">
                {isEditMode ? "Actualizar datos y GPS" : "Ubica el domicilio en el mapa"}
              </p>
            </div>
          </div>
          <button onClick={handleCancel} className="text-white/80 hover:text-white transition-colors">
            <Icon icon="mdi:close" width="28" />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
          
          {/* 1. SECCIÓN MAPA INTERACTIVO */}
          <div className="border-2 border-indigo-100 rounded-xl overflow-hidden shadow-sm">
             <div className="bg-indigo-50 px-4 py-2 flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-1">
                    <Icon icon="mdi:crosshairs-gps" /> Toca en el mapa para ubicar
                </span>
                {cargandoDireccion && (
                    <span className="text-xs text-indigo-400 flex items-center gap-1 animate-pulse">
                        <Icon icon="line-md:loading-loop" /> Buscando dirección...
                    </span>
                )}
             </div>
             
             {/* Contenedor del Mapa - IMPORTANTE: Altura definida */}
             <div className="h-64 w-full relative z-0"> 
                 <MapContainer 
                    center={mapPosition} 
                    zoom={15} 
                    scrollWheelZoom={true} 
                    style={{ height: "100%", width: "100%" }}
                 >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker />
                 </MapContainer>
             </div>
             
             {/* Coordenadas (Solo lectura, feedback visual) */}
             <div className="bg-gray-50 px-3 py-1 text-[10px] text-gray-400 font-mono text-center border-t border-gray-100">
                Lat: {cliente.latitud?.toFixed(6) || '--'} | Lon: {cliente.longitud?.toFixed(6) || '--'}
             </div>
          </div>


          {/* 2. DATOS PERSONALES */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2 border-b pb-2">
              <Icon icon="mdi:account-details" /> Información Personal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputGroup
                label="Nombre(s)"
                icon="mdi:account"
                name="nombre_cliente"
                value={cliente.nombre_cliente}
                onChange={handleChange}
                placeholder="Ej. María"
              />
              <InputGroup
                label="Apellidos"
                icon="mdi:account-group"
                name="apellido_cliente"
                value={cliente.apellido_cliente}
                onChange={handleChange}
                placeholder="Ej. González"
              />
              <div className="md:col-span-2">
                <InputGroup
                  label="Teléfono de Contacto"
                  icon="mdi:phone"
                  name="telefono"
                  type="tel"
                  value={cliente.telefono}
                  onChange={handleChange}
                  placeholder="55..."
                />
              </div>
            </div>
          </div>

          {/* 3. DIRECCIÓN (AUTOCOMPLETADA) */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <Icon icon="mdi:home-map-marker" className="text-indigo-500"/> Dirección (Editable)
            </h3>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-8">
                <InputGroup
                  label="Calle"
                  icon="mdi:road-variant"
                  name="calle"
                  value={cliente.calle}
                  onChange={handleChange}
                  placeholder="Calle Principal"
                />
              </div>
              <div className="col-span-6 md:col-span-4">
                <InputGroup
                  label="Número"
                  icon="mdi:numeric"
                  name="numero"
                  value={cliente.numero}
                  onChange={handleChange}
                  placeholder="Ext/Int"
                />
              </div>

              <div className="col-span-12 md:col-span-8">
                <InputGroup
                  label="Colonia"
                  icon="mdi:home-group"
                  name="colonia"
                  value={cliente.colonia}
                  onChange={handleChange}
                  placeholder="Colonia"
                />
              </div>
              <div className="col-span-6 md:col-span-4">
                <InputGroup
                  label="C.P."
                  icon="mdi:mailbox"
                  name="cp"
                  value={cliente.cp}
                  onChange={handleCPChange}
                  maxLength="5"
                  placeholder="00000"
                />
              </div>

              <div className="col-span-12">
                <InputGroup
                  label="Municipio / Delegación"
                  icon="mdi:map"
                  name="delegacion"
                  value={cliente.delegacion}
                  onChange={handleChange}
                  placeholder="Municipio"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2 animate-pulse">
              <Icon icon="mdi:alert-circle" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-white hover:text-gray-900 transition-all"
            disabled={guardando}
          >
            Cancelar
          </button>

          <button
            onClick={handleGuardarCliente}
            disabled={guardando}
            className="px-6 py-2.5 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-900 shadow-md transition-all flex items-center justify-center gap-2"
          >
            {guardando ? <Icon icon="line-md:loading-loop" /> : <Icon icon="mdi:content-save" />}
            {guardando ? "Guardando..." : "Guardar"}
          </button>

          {!isEditMode && (
            <button
              onClick={handleGuardarEIrAVentas}
              disabled={guardando}
              className="px-6 py-2.5 rounded-lg text-white font-medium bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              {guardando ? <Icon icon="line-md:loading-loop" /> : <Icon icon="mdi:cash-register" />}
              {guardando ? "Procesando..." : "Ir a Ventas →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const InputGroup = ({ label, icon, className = "", ...props }) => (
  <div className="group w-full">
    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
        <Icon icon={icon} width="20" />
      </div>
      <input
        {...props}
        className={`block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 sm:text-sm shadow-sm ${className}`}
      />
    </div>
  </div>
);

export default ModalNuevoCliente;