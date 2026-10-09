/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  SimulationState,
  RouteResult,
  Coordinates,
  EmergencyRequest,
  CandidateSite,
  Hospital,
  Ambulance
} from '../types/index.ts';

interface GISMapProps {
  state: SimulationState;
  activeRoute?: RouteResult | null;
  alternativeRoute?: RouteResult | null;
  onMapClick?: (coords: Coordinates) => void;
  onSelectSite?: (site: CandidateSite) => void;
  onSelectIncident?: (incident: EmergencyRequest) => void;
  onSelectHospital?: (hospital: Hospital) => void;
  onSelectAmbulance?: (ambulance: Ambulance) => void;
  onToggleRoadBlock?: (segmentId: string) => void;
  highlightedNodeId?: string;
  className?: string;
}

export const GISMap: React.FC<GISMapProps> = ({
  state,
  activeRoute,
  alternativeRoute,
  onMapClick,
  onSelectSite,
  onSelectIncident,
  onSelectHospital,
  onSelectAmbulance,
  onToggleRoadBlock,
  highlightedNodeId,
  className = 'h-full w-full'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups refs to easily toggle and re-render without recreating map
  const layersRef = useRef<{
    roads: L.LayerGroup;
    hazards: L.LayerGroup;
    incidents: L.LayerGroup;
    ambulances: L.LayerGroup;
    hospitals: L.LayerGroup;
    sites: L.LayerGroup;
    routes: L.LayerGroup;
    campsAndDepots: L.LayerGroup;
  }>({
    roads: L.layerGroup(),
    hazards: L.layerGroup(),
    incidents: L.layerGroup(),
    ambulances: L.layerGroup(),
    hospitals: L.layerGroup(),
    sites: L.layerGroup(),
    routes: L.layerGroup(),
    campsAndDepots: L.layerGroup()
  });

  // Layer visibility state
  const [layersVisibility, setLayersVisibility] = useState({
    roads: true,
    hazards: true,
    incidents: true,
    ambulances: true,
    hospitals: true,
    sites: true,
    routes: true,
    campsAndDepots: true
  });

  const [mapTileError, setMapTileError] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center around Pune center: 18.5204, 73.8567
    const map = L.map(mapContainerRef.current, {
      center: [18.525, 73.858],
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Standard OpenStreetMap base tiles
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | CAERN Simulation',
      maxZoom: 19
    });

    tileLayer.on('tileerror', () => {
      setMapTileError(true);
    });

    tileLayer.addTo(map);

    // Add layer groups to map
    Object.values(layersRef.current).forEach(lg => lg.addTo(map));

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Map Layers whenever state or routes change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const {
      roads: roadsLayer,
      hazards: hazardsLayer,
      incidents: incidentsLayer,
      ambulances: ambulancesLayer,
      hospitals: hospitalsLayer,
      sites: sitesLayer,
      routes: routesLayer,
      campsAndDepots: campsDepotsLayer
    } = layersRef.current;

    // 1. Clear existing layers
    roadsLayer.clearLayers();
    hazardsLayer.clearLayers();
    incidentsLayer.clearLayers();
    ambulancesLayer.clearLayers();
    hospitalsLayer.clearLayers();
    sitesLayer.clearLayers();
    routesLayer.clearLayers();
    campsDepotsLayer.clearLayers();

    const nodeMap = new Map(state.roadNodes.map(n => [n.id, n]));

    // 2. Render Road Network
    if (layersVisibility.roads) {
      state.roadSegments.forEach(seg => {
        const fromNode = nodeMap.get(seg.fromNodeId);
        const toNode = nodeMap.get(seg.toNodeId);
        if (!fromNode || !toNode) return;

        const isBlocked = seg.isBlocked;
        const color = isBlocked ? '#ef4444' : seg.hazardExposure === 'Severe' ? '#f59e0b' : '#38bdf8';
        const weight = isBlocked ? 4 : 3;
        const dashArray = isBlocked ? '6, 6' : undefined;

        const polyline = L.polyline(
          [
            [fromNode.lat, fromNode.lng],
            [toNode.lat, toNode.lng]
          ],
          {
            color,
            weight,
            opacity: isBlocked ? 0.9 : 0.65,
            dashArray
          }
        );

        polyline.bindPopup(`
          <div class="p-3 text-slate-100 max-w-xs text-xs font-sans">
            <div class="flex items-center justify-between pb-1.5 border-b border-slate-700 mb-2">
              <span class="font-bold text-sm text-cyan-300">${seg.id}: ${seg.name}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${isBlocked ? 'bg-red-900 text-red-200' : 'bg-emerald-900 text-emerald-200'}">
                ${isBlocked ? 'BLOCKED' : 'OPEN'}
              </span>
            </div>
            <p class="text-slate-300"><strong>Length:</strong> ${seg.distanceKm} km | <strong>Base Time:</strong> ${seg.normalTravelTimeMinutes} min</p>
            <p class="text-slate-300"><strong>Condition:</strong> ${seg.roadCondition}</p>
            <p class="text-slate-300"><strong>Hazard Level:</strong> ${seg.hazardExposure}</p>
            ${isBlocked ? `<p class="text-red-400 mt-1 font-semibold">Closure: ${seg.blockReason || 'Hazard Inundation'}</p>` : ''}
            <button id="btn-toggle-${seg.id}" class="mt-2.5 w-full py-1 px-2 text-center rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-400 font-medium transition cursor-pointer">
              ${isBlocked ? 'Reopen Road Segment' : 'Simulate Road Blockage'}
            </button>
          </div>
        `);

        polyline.on('popupopen', () => {
          const btn = document.getElementById(`btn-toggle-${seg.id}`);
          if (btn && onToggleRoadBlock) {
            btn.onclick = () => onToggleRoadBlock(seg.id);
          }
        });

        roadsLayer.addLayer(polyline);
      });

      // Render Road Nodes as subtle markers
      state.roadNodes.forEach(node => {
        const isHigh = node.isHighGround;
        const isHighlighted = highlightedNodeId === node.id;
        const circle = L.circleMarker([node.lat, node.lng], {
          radius: isHighlighted ? 8 : 4.5,
          color: isHighlighted ? '#f59e0b' : isHigh ? '#10b981' : '#64748b',
          weight: isHighlighted ? 3 : 1.5,
          fillColor: isHigh ? '#059669' : '#1e293b',
          fillOpacity: 0.8
        });

        circle.bindTooltip(`${node.id}: ${node.name} (${node.zone}) - ${node.elevationMeters}m elev.`, {
          direction: 'top',
          className: 'bg-slate-900 text-slate-200 text-xs px-2 py-1 rounded border border-slate-700 shadow-md'
        });

        roadsLayer.addLayer(circle);
      });
    }

    // 3. Render Hazard Zones (Floods, Cyclones, Heatwaves)
    if (layersVisibility.hazards) {
      state.scenario.activeHazardZones.forEach(hazard => {
        let fillColor = '#3b82f6';
        let strokeColor = '#2563eb';
        if (hazard.type === 'flood') {
          fillColor = '#0284c7';
          strokeColor = '#0ea5e9';
        } else if (hazard.type === 'cyclone') {
          fillColor = '#8b5cf6';
          strokeColor = '#a855f7';
        } else if (hazard.type === 'heatwave') {
          fillColor = '#ea580c';
          strokeColor = '#f97316';
        }

        const circle = L.circle([hazard.center.lat, hazard.center.lng], {
          radius: hazard.radiusMeters,
          color: strokeColor,
          weight: 2,
          fillColor,
          fillOpacity: 0.22,
          dashArray: '4, 4'
        });

        circle.bindPopup(`
          <div class="p-3 text-slate-100 max-w-xs text-xs font-sans">
            <div class="flex items-center gap-1.5 font-bold text-sm text-amber-400 mb-1">
              <span>⚠️ ${hazard.name}</span>
            </div>
            <p class="text-slate-300 mb-1">${hazard.description}</p>
            <div class="bg-slate-800 p-2 rounded text-[11px] text-slate-300">
              <p><strong>Severity Index:</strong> ${hazard.severity}%</p>
              <p><strong>Radius:</strong> ${(hazard.radiusMeters / 1000).toFixed(1)} km</p>
              <p><strong>Affected Segments:</strong> ${hazard.affectedRoadIds.join(', ') || 'None'}</p>
            </div>
          </div>
        `);

        hazardsLayer.addLayer(circle);
      });
    }

    // 4. Render Emergency Incidents
    if (layersVisibility.incidents) {
      state.emergencyRequests.forEach(inc => {
        if (inc.status === 'Resolved') return;

        const isCritical = inc.severity === 'Critical';
        const isHigh = inc.severity === 'High';
        const color = isCritical ? '#ef4444' : isHigh ? '#f97316' : '#eab308';

        const customIcon = L.divIcon({
          className: 'custom-incident-pin',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2">
              <span class="absolute inline-flex h-7 w-7 rounded-full opacity-75 ${isCritical ? 'bg-red-500 animate-ping' : ''}"></span>
              <div class="relative flex items-center justify-center w-6 h-6 rounded-full text-white font-bold text-[10px] shadow-lg border border-white" style="background-color: ${color}">
                !
              </div>
            </div>
          `,
          iconSize: [24, 24]
        });

        const marker = L.marker([inc.coordinates.lat, inc.coordinates.lng], { icon: customIcon });

        marker.bindPopup(`
          <div class="p-3 text-slate-100 max-w-xs text-xs font-sans">
            <div class="flex items-center justify-between pb-1 border-b border-slate-700 mb-2">
              <span class="font-bold text-sm text-rose-400">${inc.id} (${inc.category})</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isCritical ? 'bg-red-900 text-red-200' : 'bg-amber-900 text-amber-200'
              }">${inc.severity}</span>
            </div>
            <p class="text-slate-200 font-semibold mb-1">${inc.locationName}</p>
            <p class="text-slate-300 mb-1"><strong>Victims / Demand:</strong> ${inc.peopleCount} people</p>
            <p class="text-slate-300 mb-1"><strong>Waiting Time:</strong> ${inc.waitingTimeMinutes} mins</p>
            <p class="text-slate-300 mb-1"><strong>Req. Capability:</strong> ${inc.requiredCapability}</p>
            <p class="text-slate-400 italic mb-2">${inc.notes || 'No triage notes.'}</p>
            <button id="btn-inspect-inc-${inc.id}" class="w-full py-1 px-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-medium text-center">
              Dispatch & View Safe Route
            </button>
          </div>
        `);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-inspect-inc-${inc.id}`);
          if (btn && onSelectIncident) {
            btn.onclick = () => onSelectIncident(inc);
          }
        });

        incidentsLayer.addLayer(marker);
      });
    }

    // 5. Render Ambulances
    if (layersVisibility.ambulances) {
      state.ambulances.forEach(amb => {
        const isAvail = amb.status === 'Available';
        const color = isAvail ? '#10b981' : amb.status === 'En Route' ? '#38bdf8' : '#f59e0b';

        const customIcon = L.divIcon({
          className: 'custom-ambulance-pin',
          html: `
            <div class="flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2">
              <div class="flex items-center justify-center w-6 h-6 rounded-md text-white font-bold text-[10px] shadow-lg border border-white" style="background-color: ${color}">
                🚑
              </div>
            </div>
          `,
          iconSize: [24, 24]
        });

        const marker = L.marker([amb.currentCoordinates.lat, amb.currentCoordinates.lng], { icon: customIcon });

        marker.bindPopup(`
          <div class="p-3 text-slate-100 max-w-xs text-xs font-sans">
            <div class="flex items-center justify-between pb-1 border-b border-slate-700 mb-1.5">
              <span class="font-bold text-sm text-emerald-400">${amb.id}: ${amb.callSign}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-200">${amb.status}</span>
            </div>
            <p class="text-slate-300"><strong>Class:</strong> ${amb.capability} | <strong>Fuel:</strong> ${amb.fuelPercent}%</p>
            <p class="text-slate-300"><strong>Crew:</strong> ${amb.crewName}</p>
            <p class="text-slate-300"><strong>Base Station:</strong> Node ${amb.currentNodeId}</p>
            ${amb.assignedIncidentId ? `<p class="text-amber-400 font-bold mt-1">Assigned to: ${amb.assignedIncidentId}</p>` : ''}
            <button id="btn-select-amb-${amb.id}" class="mt-2 w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-400 font-medium">
              Inspect Ambulance
            </button>
          </div>
        `);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-select-amb-${amb.id}`);
          if (btn && onSelectAmbulance) {
            btn.onclick = () => onSelectAmbulance(amb);
          }
        });

        ambulancesLayer.addLayer(marker);
      });
    }

    // 6. Render Hospitals
    if (layersVisibility.hospitals) {
      state.hospitals.forEach(hosp => {
        const isFull = hosp.availableBeds <= 0;
        const color = isFull ? '#ef4444' : hosp.status === 'Operational' ? '#3b82f6' : '#eab308';

        const customIcon = L.divIcon({
          className: 'custom-hospital-pin',
          html: `
            <div class="flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2">
              <div class="flex items-center justify-center w-7 h-7 rounded-lg text-white font-bold text-xs shadow-xl border-2 border-white" style="background-color: ${color}">
                🏥
              </div>
            </div>
          `,
          iconSize: [28, 28]
        });

        const marker = L.marker([hosp.coordinates.lat, hosp.coordinates.lng], { icon: customIcon });

        marker.bindPopup(`
          <div class="p-3 text-slate-100 max-w-xs text-xs font-sans">
            <div class="flex items-center justify-between pb-1 border-b border-slate-700 mb-1.5">
              <span class="font-bold text-sm text-cyan-400">${hosp.name}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${isFull ? 'bg-red-900 text-red-200' : 'bg-emerald-900 text-emerald-200'}">
                ${isFull ? 'CAPACITY FULL' : hosp.status}
              </span>
            </div>
            <p class="text-slate-300"><strong>Beds:</strong> ${hosp.availableBeds} available / ${hosp.totalBeds} total</p>
            <p class="text-slate-300"><strong>Emergency Trauma Slots:</strong> ${hosp.emergencyCapacity}</p>
            <p class="text-slate-300 text-[11px] mt-1"><strong>Specialties:</strong> ${hosp.capabilities.join(', ')}</p>
            <button id="btn-select-hosp-${hosp.id}" class="mt-2 w-full py-1 px-2 rounded bg-cyan-800 hover:bg-cyan-700 text-white font-medium">
              Manage Capacity & Routes
            </button>
          </div>
        `);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-select-hosp-${hosp.id}`);
          if (btn && onSelectHospital) {
            btn.onclick = () => onSelectHospital(hosp);
          }
        });

        hospitalsLayer.addLayer(marker);
      });
    }

    // 7. Render Candidate Sites & Deployed Resources
    if (layersVisibility.sites) {
      state.candidateSites.forEach(site => {
        const isDeployed = !!site.deployedResourceId;
        const isUnsafe = site.safetyStatus === 'Unsafe';
        const color = isDeployed ? '#a855f7' : isUnsafe ? '#64748b' : '#06b6d4';

        const customIcon = L.divIcon({
          className: 'custom-site-pin',
          html: `
            <div class="flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2">
              <div class="flex items-center justify-center w-6 h-6 rounded-full text-white font-bold text-[10px] shadow-lg border border-white" style="background-color: ${color}">
                ${isDeployed ? '★' : isUnsafe ? '✕' : '●'}
              </div>
            </div>
          `,
          iconSize: [24, 24]
        });

        const marker = L.marker([site.coordinates.lat, site.coordinates.lng], { icon: customIcon });

        marker.bindPopup(`
          <div class="p-3 text-slate-100 max-w-xs text-xs font-sans">
            <div class="flex items-center justify-between pb-1 border-b border-slate-700 mb-1.5">
              <span class="font-bold text-sm ${isUnsafe ? 'text-slate-400 line-through' : 'text-cyan-300'}">${site.name}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                isUnsafe ? 'bg-red-950 text-red-400' : isDeployed ? 'bg-purple-900 text-purple-200' : 'bg-slate-800 text-cyan-300'
              }">${isDeployed ? 'DEPLOYED' : site.safetyStatus}</span>
            </div>
            <p class="text-slate-300"><strong>Zone:</strong> ${site.zone}</p>
            <p class="text-slate-300"><strong>Capacity:</strong> ${site.capacityMaxPeople} people</p>
            <p class="text-slate-300"><strong>Supported:</strong> ${site.supportedTypes.join(', ')}</p>
            ${isUnsafe ? `<p class="text-rose-400 text-[11px] mt-1 font-semibold">Exclusion: ${site.exclusionReason}</p>` : ''}
            <button id="btn-select-site-${site.id}" class="mt-2 w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-400 font-medium">
              View MCDA Score & Options
            </button>
          </div>
        `);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-select-site-${site.id}`);
          if (btn && onSelectSite) {
            btn.onclick = () => onSelectSite(site);
          }
        });

        sitesLayer.addLayer(marker);
      });
    }

    // 8. Render Relief Camps & Depots
    if (layersVisibility.campsAndDepots) {
      state.reliefCamps.forEach(camp => {
        const marker = L.circleMarker([camp.coordinates.lat, camp.coordinates.lng], {
          radius: 7,
          color: '#10b981',
          fillColor: '#059669',
          fillOpacity: 0.85,
          weight: 2
        });
        marker.bindPopup(`
          <div class="p-2 text-xs font-sans text-slate-100">
            <p class="font-bold text-emerald-400">🏕️ Relief Camp: ${camp.name}</p>
            <p>Shelter Capacity: ${camp.capacity} | Current Occupants: ${camp.currentOccupants}</p>
            <p>Food Rations: ${camp.foodRationsDays} days | Water: ${camp.waterSupplyLitres.toLocaleString()} L</p>
          </div>
        `);
        campsDepotsLayer.addLayer(marker);
      });

      state.depots.forEach(depot => {
        const marker = L.circleMarker([depot.coordinates.lat, depot.coordinates.lng], {
          radius: 6,
          color: '#8b5cf6',
          fillColor: '#6d28d9',
          fillOpacity: 0.85,
          weight: 2
        });
        marker.bindPopup(`
          <div class="p-2 text-xs font-sans text-slate-100">
            <p class="font-bold text-purple-400">📦 Supply Depot: ${depot.name}</p>
            <p>Managed By: ${depot.managedBy}</p>
            <p>Floor Area: ${depot.storageCapacitySqM} sq. meters</p>
          </div>
        `);
        campsDepotsLayer.addLayer(marker);
      });
    }

    // 9. Render Active / Alternative Route
    if (layersVisibility.routes) {
      if (activeRoute && activeRoute.isReachable && activeRoute.pathCoordinates.length > 1) {
        const latlngs = activeRoute.pathCoordinates.map(c => [c.lat, c.lng] as [number, number]);
        const primaryLine = L.polyline(latlngs, {
          color: '#10b981', // Emerald green
          weight: 6,
          opacity: 0.95
        });

        primaryLine.bindTooltip(`Recommended Route: ${activeRoute.totalDistanceKm} km (${activeRoute.estimatedTravelTimeMinutes} min)`, {
          sticky: true,
          className: 'bg-emerald-950 text-emerald-200 border border-emerald-500 font-bold px-2 py-1 rounded text-xs'
        });

        routesLayer.addLayer(primaryLine);
      }

      if (alternativeRoute && alternativeRoute.isReachable && alternativeRoute.pathCoordinates.length > 1) {
        const latlngs = alternativeRoute.pathCoordinates.map(c => [c.lat, c.lng] as [number, number]);
        const altLine = L.polyline(latlngs, {
          color: '#f59e0b', // Amber / gold dashed
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8'
        });

        altLine.bindTooltip(`Alternative Detour: ${alternativeRoute.totalDistanceKm} km (${alternativeRoute.estimatedTravelTimeMinutes} min)`, {
          sticky: true,
          className: 'bg-amber-950 text-amber-200 border border-amber-500 font-bold px-2 py-1 rounded text-xs'
        });

        routesLayer.addLayer(altLine);
      }
    }
  }, [state, activeRoute, alternativeRoute, layersVisibility, highlightedNodeId]);

  // Zoom control helpers
  const handleZoomToHazard = () => {
    const map = mapInstanceRef.current;
    if (!map || state.scenario.activeHazardZones.length === 0) return;
    const h = state.scenario.activeHazardZones[0];
    map.setView([h.center.lat, h.center.lng], 13);
  };

  const handleZoomToExtents = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([18.525, 73.858], 12);
  };

  const toggleLayer = (key: keyof typeof layersVisibility) => {
    setLayersVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={`relative ${className} bg-slate-950 overflow-hidden`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Tile Fallback Notice if OSM is blocked or offline */}
      {mapTileError && (
        <div className="absolute top-3 left-16 z-[1000] bg-amber-900/90 border border-amber-600 text-amber-100 text-xs px-3 py-1.5 rounded shadow">
          ⚠️ Map tile server connectivity limited. Road graph vectors and simulation markers continue to function normally.
        </div>
      )}

      {/* Floating GIS Map Controls Bar */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Layer Visibility Menu */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 shadow-xl max-w-xs">
          <div className="font-semibold text-cyan-400 uppercase tracking-wider text-[10px] mb-2 flex items-center justify-between">
            <span>GIS Map Layers</span>
            <span className="text-[10px] text-slate-400">OSM Base</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layersVisibility.roads}
                onChange={() => toggleLayer('roads')}
                className="rounded border-slate-600 text-cyan-500 focus:ring-0"
              />
              <span>Roads ({state.roadSegments.length})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layersVisibility.hazards}
                onChange={() => toggleLayer('hazards')}
                className="rounded border-slate-600 text-cyan-500 focus:ring-0"
              />
              <span>Hazards ({state.scenario.activeHazardZones.length})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layersVisibility.incidents}
                onChange={() => toggleLayer('incidents')}
                className="rounded border-slate-600 text-cyan-500 focus:ring-0"
              />
              <span className="text-rose-400">Incidents ({state.emergencyRequests.filter(i => i.status !== 'Resolved').length})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layersVisibility.ambulances}
                onChange={() => toggleLayer('ambulances')}
                className="rounded border-slate-600 text-cyan-500 focus:ring-0"
              />
              <span className="text-emerald-400">Ambulances ({state.ambulances.length})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layersVisibility.hospitals}
                onChange={() => toggleLayer('hospitals')}
                className="rounded border-slate-600 text-cyan-500 focus:ring-0"
              />
              <span className="text-blue-400">Hospitals ({state.hospitals.length})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layersVisibility.sites}
                onChange={() => toggleLayer('sites')}
                className="rounded border-slate-600 text-cyan-500 focus:ring-0"
              />
              <span className="text-teal-400">Candidate Sites ({state.candidateSites.length})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layersVisibility.campsAndDepots}
                onChange={() => toggleLayer('campsAndDepots')}
                className="rounded border-slate-600 text-cyan-500 focus:ring-0"
              />
              <span>Camps & Depots</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layersVisibility.routes}
                onChange={() => toggleLayer('routes')}
                className="rounded border-slate-600 text-cyan-500 focus:ring-0"
              />
              <span className="text-emerald-400">Routes</span>
            </label>
          </div>
        </div>

        {/* Zoom Extents Buttons */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-1.5 flex gap-1.5 shadow-xl">
          <button
            onClick={handleZoomToExtents}
            title="Reset Map to Full City Extents"
            className="flex-1 px-2 py-1 text-center bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
          >
            Reset City View
          </button>
          <button
            onClick={handleZoomToHazard}
            title="Zoom directly to active hazard area"
            className="flex-1 px-2 py-1 text-center bg-amber-900/80 hover:bg-amber-800 text-amber-200 text-xs rounded transition"
          >
            Focus Hazard
          </button>
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-2.5 text-xs shadow-xl hidden md:block max-w-xs pointer-events-none">
        <div className="font-semibold text-slate-300 text-[10px] uppercase tracking-wider mb-1.5">Map Legend</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-cyan-400 inline-block rounded"></span>
            <span>Open Road</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-red-500 border-dashed border-red-500 inline-block rounded"></span>
            <span>Blocked Road</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            <span>Critical Incident</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block text-[8px] text-white flex items-center justify-center">🚑</span>
            <span>Ambulance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block text-[8px] text-white flex items-center justify-center">🏥</span>
            <span>Hospital</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-emerald-500 inline-block rounded"></span>
            <span>Safe Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
            <span>Deployed Clinic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"></span>
            <span>Excluded Site</span>
          </div>
        </div>
      </div>
    </div>
  );
};
