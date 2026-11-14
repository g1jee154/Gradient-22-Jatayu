import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Create custom SVG/HTML pulsing pin
const createIcon = (color, label = '', isPulsing = false) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        ${isPulsing ? `<div style="position: absolute; width: 34px; height: 34px; background: ${color}44; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
        <div style="width: 20px; height: 20px; background: ${color}; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.4); z-index: 2;"></div>
        ${label ? `<span style="position: absolute; top: 22px; background: rgba(15, 23, 42, 0.85); color: #fff; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2); pointer-events: none;">${label}</span>` : ''}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
};

function MapViewUpdater({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (center) {
      map.setView(center, zoom || 14);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

export default function MapPanel({
  location,
  responderLocation,
  responders = null,
  incidents = null,
  showRoute = true,
  zoom = 14,
  height = '100%'
}) {
  const defaultLat = 12.9784;
  const defaultLon = 77.6408;

  const userCenter = [
    Number.isFinite(location?.latitude) ? location.latitude : defaultLat,
    Number.isFinite(location?.longitude) ? location.longitude : defaultLon,
  ];

  // Colors
  const typeColors = {
    Police: '#38bdf8',
    Medical: '#22c55e',
    'Fire & Rescue': '#f97316',
    Volunteer: '#a855f7',
  };

  // Compute bounding box if both user and responder locations exist
  const bounds = [];
  if (location?.latitude && location?.longitude) {
    bounds.push([location.latitude, location.longitude]);
  }
  if (responderLocation?.latitude && responderLocation?.longitude) {
    bounds.push([responderLocation.latitude, responderLocation.longitude]);
  }

  return (
    <div className="map-wrap" style={{ height, minHeight: '260px', width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={userCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewUpdater center={userCenter} zoom={zoom} bounds={bounds.length > 1 ? bounds : null} />

        {/* User / Incident Pin */}
        {location && (
          <Marker position={userCenter} icon={createIcon('#ef4444', 'Emergency Beacon', true)}>
            <Popup>
              <div style={{ padding: '4px', fontSize: '13px' }}>
                <b style={{ color: '#ef4444' }}>🚨 Incident Location</b>
                <p style={{ margin: '4px 0 0' }}>
                  {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                </p>
                <small style={{ color: '#64748b' }}>Live Emergency GPS Coordinates</small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Assigned Responder Marker */}
        {responderLocation && Number.isFinite(responderLocation.latitude) && (
          <Marker
            position={[responderLocation.latitude, responderLocation.longitude]}
            icon={createIcon(typeColors[responderLocation.role || responderLocation.responder_type] || '#38bdf8', responderLocation.name || 'Responder', true)}
          >
            <Popup>
              <div style={{ padding: '4px', fontSize: '13px' }}>
                <b style={{ color: '#38bdf8' }}>{responderLocation.name || 'Assigned Responder'}</b>
                <p style={{ margin: '4px 0 0' }}>
                  {responderLocation.role || responderLocation.responder_type || 'Field Unit'}
                </p>
                <small style={{ color: '#64748b' }}>En route to victim location</small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polyline */}
        {showRoute && responderLocation && Number.isFinite(responderLocation.latitude) && location && (
          <Polyline
            positions={[
              [responderLocation.latitude, responderLocation.longitude],
              userCenter,
            ]}
            pathOptions={{
              color: '#38bdf8',
              weight: 4,
              opacity: 0.8,
              dashArray: '8, 8',
            }}
          />
        )}

        {/* Multiple Responders (Admin / Overview) */}
        {Array.isArray(responders) &&
          responders.map((r) => {
            if (!Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) return null;
            const color = typeColors[r.responder_type] || '#38bdf8';
            return (
              <Marker
                key={r.id}
                position={[r.latitude, r.longitude]}
                icon={createIcon(color, r.name)}
              >
                <Popup>
                  <div style={{ padding: '4px', fontSize: '13px' }}>
                    <b>{r.name}</b>
                    <p style={{ margin: '2px 0' }}>
                      <span style={{ color }}>●</span> {r.responder_type} · {r.badge_number}
                    </p>
                    <small style={{ color: r.is_available ? '#22c55e' : '#94a3b8' }}>
                      {r.is_available ? 'Available / On Patrol' : 'Busy / Off Duty'}
                    </small>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Multiple Incidents (Admin Map) */}
        {Array.isArray(incidents) &&
          incidents.map((inc) => {
            if (!Number.isFinite(inc.latitude) || !Number.isFinite(inc.longitude)) return null;
            const isResolved = inc.status === 'Resolved' || inc.status === 'Cancelled';
            const color = isResolved ? '#64748b' : '#ef4444';
            return (
              <Marker
                key={inc.id}
                position={[inc.latitude, inc.longitude]}
                icon={createIcon(color, inc.id, !isResolved)}
              >
                <Popup>
                  <div style={{ padding: '4px', fontSize: '13px' }}>
                    <b style={{ color }}>{inc.id} · {inc.emergency_type}</b>
                    <p style={{ margin: '4px 0 2px' }}>{inc.user_name} · {inc.address}</p>
                    <small style={{ fontWeight: 600 }}>Status: {inc.status}</small>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
