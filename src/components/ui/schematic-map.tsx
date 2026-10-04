'use client';
import { MapPin, Plus, Minus, Navigation } from 'lucide-react';
import { Pharmacy } from '@/contracts';
import { useState } from 'react';
export function SchematicMap({
  pharmacies = [],
  selected,
  onSelect,
  route = false,
  children,
  showOrigin = true,
  destinationLabel,
  locale = 'en',
}: {
  pharmacies?: Pharmacy[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  route?: boolean;
  children?: React.ReactNode;
  showOrigin?: boolean;
  destinationLabel?: string;
  locale?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const destination = pharmacies.find((p) => p.id === selected);
  return (
    <div className="schematic-map">
      <div className="map-art" style={{ transform: `scale(${zoom})` }}>
        <svg viewBox="0 0 600 500" preserveAspectRatio="none" aria-hidden="true">
          <rect width="600" height="500" fill="#e9eee5" />
          <path
            d="M0 160L600 90M0 380L600 260M120 0L270 500M390 0L330 500M520 0L570 500"
            stroke="#fff"
            strokeWidth="20"
          />
          <path
            d="M0 230L600 180M0 480L600 370M30 0L170 500M285 0L270 500"
            stroke="#fff"
            strokeWidth="8"
          />
          <path
            d="M420 0Q440 130 390 230Q350 310 390 500"
            stroke="#c9dfe0"
            strokeWidth="30"
            fill="none"
          />
          <rect x="50" y="215" width="75" height="55" rx="16" fill="#d2e1c4" />
          <rect x="435" y="295" width="80" height="90" rx="16" fill="#d2e1c4" />
          {route && (
            <path
              d={
                destination
                  ? `M312 280 L312 ${destination.y * 5} L${destination.x * 6} ${destination.y * 5}`
                  : 'M310 280L310 215L280 215'
              }
              stroke="#137c70"
              strokeWidth="5"
              fill="none"
              strokeDasharray="10 5"
            />
          )}
        </svg>
        <span className="map-label label-dhanmondi">DHANMONDI</span>
        <span className="map-label label-kalabagan">KALABAGAN</span>
        <span className="map-label label-lake">Sample lake</span>
        {showOrigin && (
          <span className="map-origin" style={{ left: '52%', top: '56%' }}>
            <Navigation size={15} />
          </span>
        )}
        {pharmacies.map((p, i) => (
          <button
            key={p.id}
            className={`map-marker ${selected === p.id ? 'selected' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => onSelect?.(p.id)}
            aria-label={`Select ${p.name}`}
            aria-pressed={selected === p.id}
          >
            <MapPin size={32} fill="currentColor" stroke="white" />
            <span>{i + 1}</span>
            {selected === p.id && destinationLabel && (
              <strong className="map-marker-caption">{destinationLabel}</strong>
            )}
          </button>
        ))}
        {children}
      </div>
      <div className="map-note">
        {locale === 'bn'
          ? 'নমুনা মানচিত্র · বাস্তব অবস্থান নয়'
          : 'Schematic map · illustrative locations'}
      </div>
      <div className="map-zoom">
        <button onClick={() => setZoom(Math.min(1.4, zoom + 0.1))} aria-label="Zoom in">
          <Plus size={17} />
        </button>
        <button onClick={() => setZoom(Math.max(1, zoom - 0.1))} aria-label="Zoom out">
          <Minus size={17} />
        </button>
      </div>
    </div>
  );
}
