import type { StyleSpecification } from 'maplibre-gl';

/**
 * Basemap styles — all free, keyless, worldwide sources.
 *  - satellite: Esri World Imagery + CARTO label overlay (realistic hybrid)
 *  - midnight:  CARTO Dark Matter (rich night city mode)
 *  - daylight:  CARTO Voyager (colorful day mode)
 * Every style runs on the globe projection with an atmosphere halo.
 */
export type MapStyleId = 'satellite' | 'midnight' | 'daylight';

export const MAP_STYLE_META: Record<MapStyleId, { label: string; hint: string; thumb: string }> = {
  satellite: {
    label: 'Satellite',
    hint: 'Real Earth imagery',
    thumb: 'linear-gradient(135deg, #1c3a28 0%, #2d4a35 35%, #16324d 70%, #0b1f33 100%)',
  },
  midnight: {
    label: 'Midnight',
    hint: 'Deep night city',
    thumb: 'linear-gradient(135deg, #0b0e14 0%, #161b26 50%, #232a3a 100%)',
  },
  daylight: {
    label: 'Daylight',
    hint: 'Bright & colorful',
    thumb: 'linear-gradient(135deg, #d8ecf5 0%, #bfe0c9 55%, #f2e9d4 100%)',
  },
};

const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const ESRI_ATTRIBUTION = 'Imagery &copy; Esri, Maxar, Earthstar Geographics';

function cartoTiles(style: string): string[] {
  return ['a', 'b', 'c', 'd'].map((s) => `https://${s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}@2x.png`);
}

/** Night-side atmosphere: deep space fading into a blue halo around the globe. */
const NIGHT_SKY: StyleSpecification['sky'] = {
  'sky-color': '#0a1430',
  'horizon-color': '#33599e',
  'fog-color': '#03060c',
  'sky-horizon-blend': 0.6,
  'horizon-fog-blend': 0.7,
  'fog-ground-blend': 0.4,
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 0.8, 10, 0] as unknown as number,
};

const DAY_SKY: StyleSpecification['sky'] = {
  'sky-color': '#7fc8ff',
  'horizon-color': '#e9f5ff',
  'fog-color': '#dceefc',
  'sky-horizon-blend': 0.55,
  'horizon-fog-blend': 0.6,
  'fog-ground-blend': 0.35,
  'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 0.8, 10, 0] as unknown as number,
};

export function buildMapStyle(id: MapStyleId): StyleSpecification {
  if (id === 'satellite') {
    return {
      version: 8,
      projection: { type: 'globe' },
      sky: NIGHT_SKY,
      sources: {
        imagery: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          maxzoom: 19,
          attribution: ESRI_ATTRIBUTION,
        },
        labels: {
          type: 'raster',
          tiles: cartoTiles('dark_only_labels'),
          tileSize: 256,
          maxzoom: 20,
          attribution: CARTO_ATTRIBUTION,
        },
      },
      layers: [
        { id: 'space', type: 'background', paint: { 'background-color': '#091018' } },
        { id: 'imagery', type: 'raster', source: 'imagery', paint: { 'raster-fade-duration': 200 } },
        {
          id: 'labels',
          type: 'raster',
          source: 'labels',
          // Hide the label overlay when far out in space — imagery reads better bare.
          paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 2.5, 0, 4, 0.9] as unknown as number },
        },
      ],
    };
  }

  if (id === 'midnight') {
    return {
      version: 8,
      projection: { type: 'globe' },
      sky: NIGHT_SKY,
      sources: {
        basemap: {
          type: 'raster',
          tiles: cartoTiles('dark_all'),
          tileSize: 256,
          maxzoom: 20,
          attribution: CARTO_ATTRIBUTION,
        },
      },
      layers: [
        { id: 'space', type: 'background', paint: { 'background-color': '#05070b' } },
        { id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-fade-duration': 200 } },
      ],
    };
  }

  return {
    version: 8,
    projection: { type: 'globe' },
    sky: DAY_SKY,
    sources: {
      basemap: {
        type: 'raster',
        tiles: cartoTiles('rastertiles/voyager'),
        tileSize: 256,
        maxzoom: 20,
        attribution: CARTO_ATTRIBUTION,
      },
    },
    layers: [
      { id: 'space', type: 'background', paint: { 'background-color': '#aacfe8' } },
      { id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-fade-duration': 200 } },
    ],
  };
}
