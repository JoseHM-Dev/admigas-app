import React from "react";
import { Icon } from "@iconify/react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Solución para que los iconos predeterminados de Leaflet carguen correctamente en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function ModalMapaClientes({ isOpen, onClose, clientes }) {
  if (!isOpen) return null;

  // Filtramos a los clientes que tengan coordenadas válidas
  const clientesConUbicacion = (clientes || []).filter(
    (c) => c.latitud && c.longitud
  );

  // Usamos la primera ubicación como centro, o CDMX como fallback si no hay ninguna
  const defaultCenter = clientesConUbicacion.length > 0
    ? [parseFloat(clientesConUbicacion[0].latitud), parseFloat(clientesConUbicacion[0].longitud)]
    : [19.432608, -99.133209];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700">
        
        <div className="bg-blue-900 dark:bg-slate-900 p-5 flex justify-between items-center shrink-0 text-white">
          <h3 className="font-extrabold text-lg flex items-center gap-2">
            <Icon icon="mdi:map-marker-multiple" className="text-sky-400" width="24" />
            Mapa de Clientes ({clientesConUbicacion.length})
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-blue-800 hover:bg-blue-700 rounded-full transition-colors text-white"
          >
            <Icon icon="mdi:close" width="20" />
          </button>
        </div>

        <div className="flex-1 w-full relative z-0">
          <MapContainer center={defaultCenter} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {clientesConUbicacion.map((cliente) => (
              <Marker key={cliente.id_casa} position={[parseFloat(cliente.latitud), parseFloat(cliente.longitud)]}>
                <Popup>
                  <div className="font-sans text-sm">
                    <strong className="block text-[15px] mb-1 text-slate-800">{cliente.nombre_cliente} {cliente.apellido_cliente}</strong>
                    <span className="block text-slate-500">{cliente.calle} #{cliente.numero}</span>
                    <span className="block text-slate-500">{cliente.colonia}</span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}