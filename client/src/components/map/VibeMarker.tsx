import { memo, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import { CATEGORY_META } from '@shared/vibes';
import type { PinSummary } from '@shared/types';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { selectPin } from '@/state/actions';
import { useMapInstance } from './MapView';

/** Memoized: only the touched pin re-renders when the store's pin map changes. */
export const VibeMarker = memo(function VibeMarker({ pin, selected }: { pin: PinSummary; selected: boolean }) {
  const map = useMapInstance();
  const el = useMemo(() => document.createElement('div'), []);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([pin.lng, pin.lat])
      .addTo(map);
    markerRef.current = marker;

    // Native listeners so clicks never bubble to the map canvas (which deselects).
    const onClick = (e: MouseEvent) => {
      e.stopPropagation();
      selectPin(pin.id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectPin(pin.id);
      }
    };
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('keydown', onKey);
      marker.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, el, pin.id]);

  useEffect(() => {
    markerRef.current?.setLngLat([pin.lng, pin.lat]);
  }, [pin.lng, pin.lat]);

  useEffect(() => {
    el.style.zIndex = selected ? '1000' : pin.live ? '500' : '0';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${pin.title} — ${CATEGORY_META[pin.category].label}`);
  }, [el, selected, pin.live, pin.title, pin.category]);

  const meta = CATEGORY_META[pin.category];
  return createPortal(
    <div
      className={`vibe-marker${selected ? ' selected' : ''}`}
      style={
        {
          '--vibe-color': meta.color,
          '--vibe-glow': meta.soft.replace('0.16', '0.55'),
        } as React.CSSProperties
      }
    >
      {pin.live && <div className="live-ring" />}
      <div className="pill">
        <CategoryIcon category={pin.category} size={13} />
        {pin.attendees > 0 && pin.type !== 'DROP' && <span>{pin.attendees}</span>}
      </div>
      <div className="tip" />
    </div>,
    el,
  );
});
