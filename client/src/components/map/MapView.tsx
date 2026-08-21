import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { MapPin } from 'lucide-react';
import { useStore, setState, getState } from '@/state/store';
import { selectPin } from '@/state/actions';
import { buildMapStyle } from './mapStyles';
import { VibeMarker } from './VibeMarker';
import { CATEGORY_META } from '@shared/vibes';

export const DEFAULT_CENTER: [number, number] = [-122.418, 37.781]; // lng, lat
export const DEFAULT_ZOOM = 13.5;

const MapCtx = createContext<maplibregl.Map | null>(null);

/** The live MapLibre instance — available to anything rendered inside <MapView>. */
export function useMapInstance(): maplibregl.Map | null {
  return useContext(MapCtx);
}

function reportBbox(map: maplibregl.Map) {
  const b = map.getBounds();
  setState({ bbox: `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}` });
}

/** Keeps the sunset heatmap layer in sync with pins + toggle, surviving style swaps. */
function useHeatLayer(map: maplibregl.Map | null) {
  const enabled = useStore((s) => s.heatmap);
  const pins = useStore((s) => s.pins);
  const mapStyle = useStore((s) => s.mapStyle);

  useEffect(() => {
    if (!map) return;

    const data: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: enabled
        ? Object.values(pins).map((p) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
            properties: { weight: Math.min(1, 0.25 + p.attendees * 0.12) },
          }))
        : [],
    };

    const sync = () => {
      try {
        const src = map.getSource('vibe-heat') as maplibregl.GeoJSONSource | undefined;
        if (!enabled) {
          if (map.getLayer('vibe-heat')) map.removeLayer('vibe-heat');
          if (src) map.removeSource('vibe-heat');
          return;
        }
        if (src) {
          src.setData(data);
          return;
        }
        map.addSource('vibe-heat', { type: 'geojson', data });
        map.addLayer({
          id: 'vibe-heat',
          type: 'heatmap',
          source: 'vibe-heat',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 3.4],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 34, 16, 70],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(8,12,24,0)',
              0.12, 'rgba(43,84,134,0.45)',
              0.3, 'rgba(34,211,238,0.6)',
              0.5, 'rgba(255,180,92,0.75)',
              0.72, 'rgba(255,106,60,0.85)',
              1, 'rgba(255,236,214,0.95)',
            ],
            'heatmap-opacity': 0.9,
          },
        });
      } catch {
        /* style mid-swap — the styledata listener below retries */
      }
    };

    sync();
    map.on('styledata', sync);
    return () => {
      map.off('styledata', sync);
    };
  }, [map, enabled, pins, mapStyle]);
}

/**
 * Halo around the globe at planetary zooms. The globe is always centered in
 * the viewport and its pixel radius is worldSize / 2π, so a fixed circle
 * tracks it exactly; fades out before the globe-to-mercator transition.
 */
function AtmosphereGlow({ map }: { map: maplibregl.Map | null }) {
  const [glow, setGlow] = useState({ size: 0, opacity: 0 });

  useEffect(() => {
    if (!map) return;
    const update = () => {
      const z = map.getZoom();
      const lat = (map.getCenter().lat * Math.PI) / 180;
      // Planet radius in world pixels (MapLibre scales it to match mercator at the center latitude),
      // then perspective-projected: the camera sits cameraToCenterDistance in front of the surface.
      const r = (512 * 2 ** z) / (2 * Math.PI * Math.max(0.3, Math.cos(lat)));
      const h = map.getContainer().clientHeight;
      const f = h / 2 / Math.tan((36.87 * Math.PI) / 360);
      const d = f + r;
      const apparent = (f * r) / Math.sqrt(d * d - r * r);
      const opacity = z < 4.5 ? 1 : Math.max(0, 1 - (z - 4.5) / 1.5);
      setGlow({ size: apparent * 2 - 2, opacity });
    };
    update();
    map.on('move', update);
    return () => {
      map.off('move', update);
    };
  }, [map]);

  if (glow.opacity <= 0.02) return null;
  return (
    <div
      className="atmosphere-glow"
      style={{ width: glow.size, height: glow.size, opacity: glow.opacity }}
      aria-hidden
    />
  );
}

/** Animated radar sweep overlay while the vibe engine scans. */
function RadarSweep() {
  const phase = useStore((s) => s.radar.phase);
  if (phase !== 'scanning') return null;
  return (
    <div className="absolute inset-0 z-[450] pointer-events-none flex items-center justify-center" aria-hidden>
      <div className="relative w-[420px] h-[420px] max-w-[88vw] max-h-[88vw]">
        <div className="radar-sweep inset-0 absolute" />
        <div className="radar-ring inset-0" />
        <div className="radar-ring inset-0" style={{ animationDelay: '0.45s' }} />
        <div className="radar-ring inset-0" style={{ animationDelay: '0.9s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-radar shadow-[0_0_18px_#22D3EE]" />
        </div>
      </div>
      <p className="absolute bottom-[30%] text-xs font-display font-bold tracking-[0.25em] uppercase text-radar">
        Reading the vibe…
      </p>
    </div>
  );
}

/** Center crosshair while picking a location for a new pin. */
function CreateCrosshair() {
  const creating = useStore((s) => s.creating);
  if (!creating) return null;
  return (
    <div className="absolute inset-0 z-[460] pointer-events-none flex items-center justify-center" aria-hidden>
      <div className="relative -translate-y-5">
        <div className="crosshair-bob">
          <div className="w-11 h-11 rounded-full gradient-brand shadow-[0_0_30px_rgba(255,106,60,0.6)] flex items-center justify-center">
            <MapPin size={22} className="text-white relative z-10" />
          </div>
        </div>
        <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent/90 shadow-[0_0_12px_rgba(255,106,60,0.8)]" />
      </div>
    </div>
  );
}

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  const pins = useStore((s) => s.pins);
  const filterCategory = useStore((s) => s.filterCategory);
  const searchQuery = useStore((s) => s.searchQuery);
  const selectedPinId = useStore((s) => s.selectedPinId);
  const mapStyle = useStore((s) => s.mapStyle);
  const flyTarget = useStore((s) => s.flyTo);
  const lastFly = useRef(0);
  const styleRef = useRef(mapStyle);

  /* Init once: born in space, then a cinematic dive into the city. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const m = new maplibregl.Map({
      container: el,
      style: buildMapStyle(getState().mapStyle),
      center: DEFAULT_CENTER,
      zoom: 1.1,
      attributionControl: { compact: true },
      maxPitch: 70,
      fadeDuration: 180,
      canvasContextAttributes: { antialias: true },
    });
    m.touchZoomRotate.enableRotation();
    const onZoom = () => wrapRef.current?.classList.toggle('far-out', m.getZoom() < 4.5);
    onZoom();
    m.on('zoom', onZoom);
    m.on('moveend', () => reportBbox(m));
    m.on('click', () => {
      const s = getState();
      if (!s.creating && s.selectedPinId) selectPin(null);
    });
    if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
      (window as unknown as { __map?: maplibregl.Map }).__map = m;
    }
    m.on('load', () => {
      setMap(m);
      reportBbox(m);
      m.flyTo({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        duration: 3400,
        curve: 1.3,
      });
    });
    return () => {
      setMap(null);
      m.remove();
    };
  }, []);

  /* Swap basemap styles in place. */
  useEffect(() => {
    if (!map || styleRef.current === mapStyle) return;
    styleRef.current = mapStyle;
    map.setStyle(buildMapStyle(mapStyle), { diff: false });
  }, [map, mapStyle]);

  /* One-shot fly-to requests; tilt in when landing close. */
  useEffect(() => {
    if (!map || !flyTarget || flyTarget.ts === lastFly.current) return;
    lastFly.current = flyTarget.ts;
    const zoom = flyTarget.zoom ?? map.getZoom();
    map.flyTo({
      center: [flyTarget.lng, flyTarget.lat],
      zoom,
      pitch: zoom >= 15 ? 46 : 0,
      bearing: 0,
      duration: 2000,
      curve: 1.5,
    });
  }, [map, flyTarget]);

  useHeatLayer(map);

  const visible = useMemo(() => {
    const all = Object.values(pins);
    const query = searchQuery.trim().toLowerCase();
    return all.filter((p) => {
      if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
      if (query) {
        const hay = `${p.title} ${p.description} ${p.tags.join(' ')} ${CATEGORY_META[p.category].label} ${p.author.name}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [pins, filterCategory, searchQuery]);

  return (
    <div ref={wrapRef} className="absolute inset-0 map-space">
      <div ref={containerRef} className="w-full h-full" />
      <AtmosphereGlow map={map} />
      <MapCtx.Provider value={map}>
        {map &&
          visible.map((pin) => <VibeMarker key={pin.id} pin={pin} selected={pin.id === selectedPinId} />)}
      </MapCtx.Provider>
      <RadarSweep />
      <CreateCrosshair />
    </div>
  );
}
