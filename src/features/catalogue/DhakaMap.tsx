import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Compass,
  MapPin,
  Navigation,
  Pause,
  Phone,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { MapPharmacy, MedicineItem } from './pharmacy';
import { USER_LOCATION } from './mockPharmacies';

interface DhakaMapProps {
  pharmacies: MapPharmacy[];
  selectedPharmacy: MapPharmacy;
  onSelectPharmacy: (pharmacy: MapPharmacy) => void;
  searchedMedicine: MedicineItem;
}

type Point = { x: number; y: number; angle: number };

/**
 * Hand-drawn SVG navigation routes for the 800 × 800 *illustration*.
 * These are DEMO geometry, not measured street routes or live directions.
 * Unknown pharmacies continue to use pharmacy.routePath from the API/mock data.
 */
const DEMO_ROUTES: Record<string, string> = {
  'old-dhaka-pharma':
    'M 375 395 L 402 397 Q 416 398 418 412 L 420 450 Q 421 463 432 469 L 452 481 Q 464 489 465 504 L 466 532 Q 467 544 479 549 L 516 564 Q 529 570 532 583 L 537 602 Q 540 612 551 618 L 573 629 Q 585 634 585 645',
  'dhanmondi-pharma':
    'M 375 395 L 342 395 Q 330 395 325 407 L 319 427 Q 315 440 303 443 L 289 447 Q 277 450 275 463 L 268 492 Q 265 507 257 515 L 243 530 Q 235 539 235 555 L 230 590',
  'mirpur-pharma':
    'M 375 395 L 359 373 Q 352 363 352 349 L 350 332 Q 349 320 338 314 L 316 303 Q 302 297 296 286 L 284 267 Q 278 256 264 253 L 250 250',
  'uttara-pharma':
    'M 375 395 L 392 367 Q 398 358 400 344 L 408 319 Q 412 306 421 299 L 447 279 Q 457 271 462 258 L 477 237 Q 484 226 499 224 L 530 213 Q 542 209 550 201 L 565 195',
  'gulshan-pharma':
    'M 375 395 L 408 394 Q 423 394 429 383 L 438 377 L 479 377 Q 491 377 499 383 L 525 390 Q 536 394 549 386 L 570 373 Q 582 367 595 368 L 628 371 Q 639 372 649 368 L 683 366 Q 699 365 705 370 L 720 370',
};

const TRIP_DURATION_MS = 14_000; // Explicitly simulated trip, not GPS tracking.
const INITIAL_POINT: Point = { x: USER_LOCATION.x, y: USER_LOCATION.y, angle: 0 };

export const DhakaMap: React.FC<DhakaMapProps> = ({
  pharmacies,
  selectedPharmacy,
  onSelectPharmacy,
  searchedMedicine,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [routeLength, setRouteLength] = useState(1);
  const [vehicle, setVehicle] = useState<Point>(INITIAL_POINT);
  const [showRadar, setShowRadar] = useState(false);
  const routeRef = useRef<SVGPathElement>(null);
  const lastFrameRef = useRef<number | null>(null);
  const instanceId = React.useId().replace(/:/g, '');

  const route = DEMO_ROUTES[selectedPharmacy.id] ?? selectedPharmacy.routePath;
  const arrived = progress >= 100;

  // Keep simulation deterministic and restart when user switches destination.
  useEffect(() => {
    setProgress(0);
    setIsPlaying(true);
    setVehicle(INITIAL_POINT);
    lastFrameRef.current = null;
  }, [selectedPharmacy.id]);

  useEffect(() => {
    const svgPath = routeRef.current;
    if (!svgPath) return;
    try {
      const length = Math.max(1, svgPath.getTotalLength());
      setRouteLength(length);
    } catch {
      setRouteLength(1);
    }
  }, [route]);

  useEffect(() => {
    const svgPath = routeRef.current;
    if (!svgPath) return;
    try {
      const length = Math.max(1, svgPath.getTotalLength());
      const traveled = (progress / 100) * length;
      const current = svgPath.getPointAtLength(traveled);
      const prev = svgPath.getPointAtLength(Math.max(0, traveled - 2));
      const next = svgPath.getPointAtLength(Math.min(length, traveled + 2));
      const angle = (Math.atan2(next.y - prev.y, next.x - prev.x) * 180) / Math.PI;
      setVehicle({ x: current.x, y: current.y, angle });
    } catch {
      setVehicle(INITIAL_POINT);
    }
  }, [progress, route]);

  useEffect(() => {
    if (!isPlaying || arrived) {
      lastFrameRef.current = null;
      return;
    }
    let animationId = 0;
    const tick = (time: number) => {
      if (lastFrameRef.current !== null) {
        const dt = Math.min(time - lastFrameRef.current, 100);
        setProgress((p) => Math.min(100, p + (dt / TRIP_DURATION_MS) * 100));
      }
      lastFrameRef.current = time;
      animationId = requestAnimationFrame(tick);
    };
    animationId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animationId);
      lastFrameRef.current = null;
    };
  }, [isPlaying, arrived, selectedPharmacy.id]);





  const progressPathLength = routeLength * (progress / 100);

  return (
    <section
      aria-label="Dhaka pharmacy map navigation simulation "
      className="  ml-auto   w-full max-w-[680px]  overflow-hidden rounded-l-[28px]  bg-[#f3f6f5] shadow-[0_22px_65px_rgba(15,23,42,0.15)]"
    >
      {/* Map and all road-following paths use the same 800 × 800 coordinate system. */}
      <svg
        viewBox="0 0 800 800"
        role="img"
        aria-label={`Illustrative route from Farmgate to ${selectedPharmacy.name}, ${selectedPharmacy.area}`}
        className="h-full w-full select-none"
      >
        <defs>
          <pattern id={`${instanceId}-blocks`} width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M 46 0 H 0 V 46" stroke="#e7eeea" strokeWidth="1" fill="none" />
          </pattern>
          <filter id={`${instanceId}-shadow`} x="-40%" y="-45%" width="180%" height="190%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Land and terrain; stylized, not geographic survey data. */}
        <rect width="800" height="800" fill="#f1f5f2" />
        <rect width="800" height="800" fill={`url(#${instanceId}-blocks)`} opacity="0.7" />
        <path d="M 120 0 C 145 90 85 180 115 270 C 140 330 90 410 105 490 C 120 570 75 640 120 720 C 145 770 190 800 220 800 H 0 V 0 Z" fill="#b9def7" />
        <path d="M 270 510 C 290 530 280 570 260 610 C 250 630 240 660 220 680" stroke="#b9def7" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M 640 180 C 655 240 630 300 665 370 C 685 410 650 460 620 480" stroke="#b9def7" strokeWidth="17" fill="none" strokeLinecap="round" />
        <path d="M 605 519 Q 664 487 700 548 Q 715 610 638 632 Q 581 622 605 519 Z" fill="#cde9c7" />
        <path d="M 220 137 Q 265 115 293 168 Q 297 205 245 218 Q 187 210 220 137 Z" fill="#cde9c7" />
        <path d="M 675 65 Q 738 59 744 118 Q 712 170 663 125 Z" fill="#cde9c7" />

        {/* Secondary roads — casing underneath bright road surface. */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g stroke="#d8dfdc" strokeWidth="11">
            <path d="M 130 182 H 780 M 145 279 H 780 M 130 420 H 780 M 155 561 H 780 M 160 680 H 780" />
            <path d="M 252 45 V 780 M 377 45 V 780 M 521 45 V 780 M 662 45 V 780" />
            <path d="M 160 345 L 720 310 M 170 490 L 730 470 M 315 55 L 680 440" />
          </g>
          <g stroke="#fff" strokeWidth="8">
            <path d="M 130 182 H 780 M 145 279 H 780 M 130 420 H 780 M 155 561 H 780 M 160 680 H 780" />
            <path d="M 252 45 V 780 M 377 45 V 780 M 521 45 V 780 M 662 45 V 780" />
            <path d="M 160 345 L 720 310 M 170 490 L 730 470 M 315 55 L 680 440" />
          </g>
        </g>

        {/* Arterial roads */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g stroke="#e2c06d" strokeWidth="17">
            <path d="M 540 0 L 530 220 L 450 350 L 460 500 L 540 600 L 610 750 L 630 800" />
            <path d="M 280 0 L 270 240 L 300 410 L 260 590 L 320 800" />
            <path d="M 120 370 L 300 390 L 450 380 L 660 370 L 800 360" />
          </g>
          <g stroke="#fff0b6" strokeWidth="12">
            <path d="M 540 0 L 530 220 L 450 350 L 460 500 L 540 600 L 610 750 L 630 800" />
            <path d="M 280 0 L 270 240 L 300 410 L 260 590 L 320 800" />
            <path d="M 120 370 L 300 390 L 450 380 L 660 370 L 800 360" />
          </g>
        </g>

        {/* Critical: matching roads are drawn BEFORE the navigation polyline.
            These make the illustration internally consistent, but are not real road data. */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {pharmacies.map((pharmacy) => {
            const road = DEMO_ROUTES[pharmacy.id] ?? pharmacy.routePath;
            return (
              <g key={`connector-${pharmacy.id}`}>
                <path d={road} stroke="#d0d9d6" strokeWidth="18" />
                <path d={road} stroke="#fff" strokeWidth="14" />
              </g>
            );
          })}
        </g>

        {/* Neighborhood labels */}
        <g fontFamily="Inter, ui-sans-serif, system-ui" fontWeight="650" fontSize="14" fill="#64748b" textAnchor="middle">
          <text x="565" y="148">Uttara</text>
          <text x="227" y="307">Mirpur</text>
          <text x="192" y="443">Mohammadpur</text>
          <text x="289" y="552">Dhanmondi</text>
          <text x="640" y="315">Banani</text>
          <text x="725" y="288">Gulshan</text>
          <text x="638" y="492">Dhaka City</text>
          <text x="712" y="542">Motijheel</text>
          <text x="687" y="700">Old Dhaka</text>
        </g>

        {/* Optional visual radar. */}
        {showRadar && (
          <g transform={`translate(${USER_LOCATION.x} ${USER_LOCATION.y})`} pointerEvents="none">
            {[60, 115, 175].map((r) => (
              <circle key={r} r={r} fill="none" stroke="#2563eb" strokeDasharray="5 7" strokeWidth="1.2" opacity="0.22" />
            ))}
            <circle r="12" fill="#2563eb" opacity="0.10">
              <animate attributeName="r" values="12;55;12" dur="3s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* Active road-following navigation route */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
          <path d={route} stroke="#fff" strokeWidth="16" opacity="0.95" />
          <path d={route} stroke="#93c5fd" strokeWidth="13" opacity="0.85" />
          <path ref={routeRef} d={route} stroke="#2563eb" strokeWidth="8" />
          <path
            d={route}
            stroke="#60a5fa"
            strokeWidth="8"
            strokeDasharray={`${Math.max(progressPathLength, 0.001)} ${routeLength + 2}`}
          />
        </g>

        {/* Starting point */}
        <g transform={`translate(${USER_LOCATION.x} ${USER_LOCATION.y})`} pointerEvents="none">
          <circle r="12" fill="#fff" filter={`url(#${instanceId}-shadow)`} />
          <circle r="7" fill="#2563eb" stroke="#fff" strokeWidth="2" />
          <g transform="translate(0 -27)">
            <rect x="-52" y="-17" width="104" height="23" rx="7" fill="#1d4ed8" />
            <text x="0" y="-2" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">Your Location</text>
          </g>
        </g>

        {/* Pharmacy pins; SVG supports click, Enter and Space. */}
        {pharmacies.map((pharmacy) => {
          const active = selectedPharmacy.id === pharmacy.id;
          return (
            <g
              key={pharmacy.id}
              transform={`translate(${pharmacy.x} ${pharmacy.y})`}
              role="button"
              tabIndex={0}
              aria-label={`Select ${pharmacy.name}`}
              onClick={() => onSelectPharmacy(pharmacy)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPharmacy(pharmacy);
                }
              }}
              className="cursor-pointer outline-none"
            >
              <title>{pharmacy.name}</title>
              {active && <circle r="26" fill="#16a34a" opacity="0.15" />}
              <g transform="translate(0 -19)" filter={`url(#${instanceId}-shadow)`}>
                <path d="M 0 -15 C -15 -15 -16 0 0 19 C 16 0 15 -15 0 -15 Z" fill={active ? '#16a34a' : '#15803d'} stroke="#fff" strokeWidth="2.5" />
                <circle cy="-4" r="8" fill="#fff" />
                <path d="M -4 -4 H 4 M 0 -8 V 0" stroke="#15803d" strokeWidth="2.3" strokeLinecap="round" />
              </g>
              <g transform="translate(16 -39)">
                <rect width="79" height="21" rx="6" fill={active ? '#15803d' : '#fff'} stroke={active ? '#15803d' : '#cbd5e1'} />
                <text x="9" y="14" fontSize="10.5" fontWeight="750" fill={active ? '#fff' : '#334155'}>Pharmacy</text>
              </g>
            </g>
          );
        })}

        {/* Moving GPS direction marker; route heading is calculated from SVG tangent. */}
        <g transform={`translate(${vehicle.x} ${vehicle.y})`} pointerEvents="none">
          <circle r="21" fill="#3b82f6" opacity="0.13">
            <animate attributeName="r" values="15;25;15" dur="1.7s" repeatCount="indefinite" />
          </circle>
          <g transform={`rotate(${vehicle.angle + 90})`} filter={`url(#${instanceId}-shadow)`}>
            <circle r="13" fill="#fff" stroke="#2563eb" strokeWidth="2.5" />
            <path d="M 0 -9 L 7 8 L 0 4 L -7 8 Z" fill="#2563eb" />
          </g>
        </g>
      </svg>

    </section>
  );
};

export default DhakaMap;
