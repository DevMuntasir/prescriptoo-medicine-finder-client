'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { MapPin, LocateFixed, ArrowRight, Phone, Footprints, Car, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  api,
  json,
  name,
  LiveMedicine,
  LivePharmacy,
  LiveArea,
  Origin,
  LiveRoute,
} from '@/lib/api';
import { ShopMap } from './map';
import { Modal } from '@/components/ui/primitives';
import { cachedLocatorSearch } from './locator-cache';
import {
  ARRIVAL_RADIUS_METERS,
  distanceMeters,
  MAX_TRACKING_ACCURACY_METERS,
  shouldRefreshRoute,
} from './live-tracking';
interface SearchResult {
  items: LivePharmacy[];
  radiusKm: number | null;
  scope: string;
  originPrecision: string;
  requiresPinConfirmation: boolean;
}
export function LiveLocator({
  medicine,
  qrId,
  qrEntry = false,
}: {
  medicine: LiveMedicine;
  qrId?: string;
  qrEntry?: boolean;
}) {
  const locale = useLocale(),
    bn = locale === 'bn';
  const tx = (en: string, bangla: string) => (bn ? bangla : en);
  const [origin, setOrigin] = useState<Origin>();
  const [approx, setApprox] = useState<Pick<Origin, 'latitude' | 'longitude'>>();
  const [areas, setAreas] = useState<LiveArea[]>([]);
  const [areaId, setAreaId] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [result, setResult] = useState<SearchResult>();
  const [selected, setSelected] = useState('');
  const [mode, setMode] = useState<'WALK' | 'DRIVE'>('WALK');
  const [route, setRoute] = useState<LiveRoute>();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState({ latitude: '', longitude: '' });
  const [all, setAll] = useState(false);
  const [lowAccuracy, setLowAccuracy] = useState<Origin>();
  const [tracking, setTracking] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<
    'idle' | 'active' | 'stopped' | 'arrived' | 'error'
  >('idle');
  const [trackingAccuracy, setTrackingAccuracy] = useState<number>();
  const [trackingMessage, setTrackingMessage] = useState('');
  const searchId = useRef(0),
    routeId = useRef(0),
    steps = useRef<HTMLDivElement>(null);
  const watchId = useRef<number | undefined>(undefined);
  const routedFrom = useRef<Origin | undefined>(undefined);
  const lastRouteRefreshAt = useRef(0);
  const backgroundRouteRequestId = useRef<number | undefined>(undefined);
  const pharmacies = result?.items || [];
  const shop = pharmacies.find((p) => p.id === selected);
  const clearLocationWatch = useCallback(() => {
    if (watchId.current === undefined || !navigator.geolocation) return;
    navigator.geolocation.clearWatch(watchId.current);
    watchId.current = undefined;
  }, []);
  const stopTracking = useCallback(
    (status: 'idle' | 'stopped' | 'arrived' | 'error' = 'stopped', message = '') => {
      clearLocationWatch();
      setTracking(false);
      setTrackingStatus(status);
      setTrackingMessage(message);
      setTrackingAccuracy(undefined);
      if (backgroundRouteRequestId.current !== undefined) routeId.current++;
      backgroundRouteRequestId.current = undefined;
      if (status === 'idle') {
        routedFrom.current = undefined;
        lastRouteRefreshAt.current = 0;
      }
    },
    [clearLocationWatch],
  );
  const invalidate = useCallback(() => {
    routeId.current++;
    setRoute(undefined);
    setBusy((value) => (value === 'route' ? '' : value));
    setError('');
  }, []);
  useEffect(() => {
    const requests = { search: searchId, route: routeId };
    return () => {
      requests.search.current++;
      requests.route.current++;
      clearLocationWatch();
    };
  }, [clearLocationWatch]);
  async function search(body: { origin?: Origin; areaId?: string }, keepSelected?: string) {
    const id = ++searchId.current;
    invalidate();
    setBusy('search');
    setResult(undefined);
    try {
      const payload = { medicineId: medicine.id, ...body };
      const next = await cachedLocatorSearch<SearchResult>(JSON.stringify(payload), () =>
        api<SearchResult>('public/locator/search', {
          method: 'POST',
          body: json(payload),
        }),
      );
      if (id !== searchId.current) return;
      setResult(next);
      setSelected(
        next.items.some((p) => p.id === keepSelected) ? keepSelected! : next.items[0]?.id || '',
      );
      return next;
    } catch (e) {
      if (id === searchId.current) setError((e as Error).message);
    } finally {
      if (id === searchId.current) setBusy('');
    }
  }
  async function applyOrigin(next: Origin) {
    stopTracking('idle');
    setOrigin(next);
    setApprox(undefined);
    setAreaId('');
    setLowAccuracy(undefined);
    await search({ origin: next });
  }
  function gps() {
    stopTracking('idle');
    invalidate();
    setLowAccuracy(undefined);
    const gpsId = ++searchId.current;
    setBusy('gps');
    setError('');
    if (!navigator.geolocation) {
      setBusy('');
      setError(
        tx(
          'Location is unavailable. Choose an area or starting pin.',
          'অবস্থান পাওয়া যাচ্ছে না। এলাকা বা শুরুর স্থান বেছে নিন।',
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (gpsId !== searchId.current) return;
        const next: Origin = {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          source: 'gps',
          confirmed: true,
        };
        if (p.coords.accuracy > 100) {
          setLowAccuracy(next);
          setBusy('');
        } else void applyOrigin(next);
      },
      () => {
        if (gpsId !== searchId.current) return;
        setBusy('');
        void manual();
        setError(
          tx(
            'Location permission denied or unavailable. Choose your area.',
            'অবস্থান পাওয়া যায়নি। আপনার এলাকা বেছে নিন।',
          ),
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  async function manual() {
    stopTracking('idle');
    searchId.current++;
    setBusy('');
    setShowManual(true);
    if (!areas.length)
      try {
        setAreas(await api<LiveArea[]>('public/areas'));
      } catch (e) {
        setError((e as Error).message);
      }
  }
  async function chooseArea(id: string) {
    stopTracking('idle');
    invalidate();
    setAreaId(id);
    setOrigin(undefined);
    setLowAccuracy(undefined);
    const a = areas.find((x) => x.id === id);
    if (a?.latitude && a.longitude) {
      setApprox({ latitude: a.latitude, longitude: a.longitude });
      setPin({ latitude: String(a.latitude), longitude: String(a.longitude) });
    }
    if (id) await search({ areaId: id });
  }
  const select = useCallback(
    (id: string) => {
      stopTracking('idle');
      invalidate();
      setSelected(id);
      void api('public/events', {
        method: 'POST',
        body: json({
          events: [
            {
              id: crypto.randomUUID(),
              type: 'pharmacy_selection',
              medicineId: medicine.id,
              pharmacyId: id,
            },
          ],
        }),
      }).catch(() => {});
    },
    [invalidate, medicine.id, stopTracking],
  );
  const requestRoute = useCallback(
    async (
      exact: Origin,
      destination: LivePharmacy,
      requestedMode: 'WALK' | 'DRIVE',
      options: { background?: boolean; recordEvent?: boolean } = {},
    ) => {
      const background = options.background ?? false;
      if (background && backgroundRouteRequestId.current !== undefined) return;
      const id = ++routeId.current;
      if (background) backgroundRouteRequestId.current = id;
      else {
        setBusy('route');
        setError('');
        setRoute(undefined);
      }
      if (options.recordEvent !== false)
        void api('public/events', {
          method: 'POST',
          body: json({
            events: [
              {
                id: crypto.randomUUID(),
                type: 'route_request',
                medicineId: medicine.id,
                pharmacyId: destination.id,
                origin: {
                  latitude: exact.latitude,
                  longitude: exact.longitude,
                  source: exact.source,
                  accuracy: exact.accuracy,
                },
              },
            ],
          }),
        }).catch(() => {});
      try {
        const next = await api<LiveRoute>('public/locator/route', {
          method: 'POST',
          body: json({
            medicineId: medicine.id,
            pharmacyId: destination.id,
            origin: exact,
            mode: requestedMode,
            locale,
            qrId,
          }),
        });
        if (id !== routeId.current) return;
        setRoute(next);
        routedFrom.current = exact;
        lastRouteRefreshAt.current = Date.now();
        if (background) setTrackingMessage('');
        return next;
      } catch (e) {
        if (id !== routeId.current) return;
        if (background)
          setTrackingMessage(
            bn
              ? 'নতুন পথ পাওয়া যায়নি—আগের পথটি দেখানো হচ্ছে।'
              : 'Could not refresh the route; keeping the previous route.',
          );
        else setError((e as Error).message);
      } finally {
        if (background && backgroundRouteRequestId.current === id)
          backgroundRouteRequestId.current = undefined;
        else if (id === routeId.current) setBusy('');
      }
    },
    [bn, locale, medicine.id, qrId],
  );
  async function directions(exact = origin, destination = shop) {
    if (!destination) return;
    if (!exact) {
      setPinOpen(true);
      return;
    }
    const next = await requestRoute(exact, destination, mode);
    if (!next || exact.source !== 'gps') return;
    routedFrom.current = exact;
    lastRouteRefreshAt.current = Date.now();
    setTrackingStatus('active');
    setTrackingMessage('');
    setTracking(true);
  }
  useEffect(() => {
    if (!tracking || !shop) return;
    if (!navigator.geolocation) {
      stopTracking(
        'error',
        bn ? 'এই ডিভাইসে লাইভ GPS পাওয়া যাচ্ছে না।' : 'Live GPS is unavailable on this device.',
      );
      return;
    }
    clearLocationWatch();
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        if (accuracy > MAX_TRACKING_ACCURACY_METERS) {
          setTrackingMessage(
            bn
              ? `GPS নির্ভুলতা এখন প্রায় ${Math.round(accuracy)} মিটার—ভালো সিগন্যালের অপেক্ষা চলছে।`
              : `GPS accuracy is about ${Math.round(accuracy)} m; waiting for a better signal.`,
          );
          return;
        }
        const next: Origin = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy,
          source: 'gps',
          confirmed: true,
        };
        setOrigin(next);
        setTrackingAccuracy(accuracy);
        setTrackingStatus('active');
        setTrackingMessage('');
        if (
          accuracy <= 40 &&
          distanceMeters(next, { latitude: shop.latitude, longitude: shop.longitude }) <=
            ARRIVAL_RADIUS_METERS
        ) {
          stopTracking(
            'arrived',
            bn
              ? 'আপনি দোকানের প্রবেশপথের কাছে পৌঁছে গেছেন।'
              : 'You have arrived near the shop entrance.',
          );
          return;
        }
        const now = Date.now();
        if (
          shouldRefreshRoute({
            current: next,
            routedFrom: routedFrom.current,
            lastRefreshAt: lastRouteRefreshAt.current,
            now,
          })
        )
          void requestRoute(next, shop, mode, { background: true, recordEvent: false });
      },
      (cause) => {
        const denied = cause.code === cause.PERMISSION_DENIED;
        stopTracking(
          denied ? 'error' : 'stopped',
          bn
            ? denied
              ? 'লাইভ GPS অনুমতি বন্ধ হয়েছে। আবার চালু করতে location permission দিন।'
              : 'লাইভ GPS আপডেট সাময়িকভাবে পাওয়া যাচ্ছে না।'
            : denied
              ? 'Live GPS permission was removed. Allow location access to resume.'
              : 'Live GPS updates are temporarily unavailable.',
        );
      },
      { enableHighAccuracy: true, maximumAge: 3_000, timeout: 20_000 },
    );
    return clearLocationWatch;
  }, [bn, clearLocationWatch, mode, requestRoute, shop, stopTracking, tracking]);
  const pick = useCallback(
    (p: Pick<Origin, 'latitude' | 'longitude'>) =>
      setPin({ latitude: String(p.latitude), longitude: String(p.longitude) }),
    [],
  );
  async function confirmPin() {
    const latitude = Number(pin.latitude),
      longitude = Number(pin.longitude);
    if (
      !pin.latitude ||
      !pin.longitude ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      setError(tx('Choose a valid starting point.', 'সঠিক শুরুর স্থান বেছে নিন।'));
      return;
    }
    const exact: Origin = { latitude, longitude, source: 'selected-pin', confirmed: true };
    setPinOpen(false);
    setOrigin(exact);
    setApprox(undefined);
    invalidate();
    const next = await search({ origin: exact }, shop?.id);
    const destination = next?.items.find((p) => p.id === shop?.id) || next?.items[0];
    if (destination) await directions(exact, destination);
  }
  const resumeTracking = () => {
    if (!origin || origin.source !== 'gps' || !shop) return;
    routedFrom.current = origin;
    lastRouteRefreshAt.current = Date.now();
    setTrackingStatus('active');
    setTrackingMessage('');
    setTracking(true);
  };
  const changedMode = (next: 'WALK' | 'DRIVE') => {
    setMode(next);
    if (tracking && origin && shop)
      void requestRoute(origin, shop, next, { background: true, recordEvent: false });
    else invalidate();
  };
  const googleNavigationUrl = shop
    ? `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}&travelmode=${mode === 'WALK' ? 'walking' : 'driving'}&dir_action=navigate`
    : '';
  return (
    <main className={`live-finder ${qrEntry ? 'from-qr' : ''}`}>
      <div className="live-finder-title">
        {!qrEntry && (
          <Link className="back-link" href={`/${locale}/medicines/${medicine.slug}`}>
            <ArrowLeft size={15} />
            {tx('Medicine details', 'ওষুধের তথ্য')}
          </Link>
        )}
        
        <h1>{name(medicine, locale)}</h1>

      </div>
      {!result && (
        <section className="live-origin-card">
          <LocateFixed size={30} />
          <h2>{tx('Start from your location', 'আপনার অবস্থান থেকে শুরু করুন')}</h2>
          <p>
            {tx(
              'Used to find shops and directions. Exact-location analytics is a separate privacy choice.',
              'দোকান ও পথ খোঁজার জন্য ব্যবহৃত হবে। অবস্থান বিশ্লেষণে সংরক্ষণ আলাদা পছন্দ।',
            )}
          </p>
          <button className="button" disabled={!!busy} onClick={gps}>
            {busy === 'gps'
              ? tx('Finding your location…', 'অবস্থান খোঁজা হচ্ছে…')
              : tx('Use my location', 'আমার অবস্থান ব্যবহার করুন')}
            <ArrowRight size={18} />
          </button>
          <button className="text-link" onClick={() => void manual()}>
            {tx('Choose an area or starting pin', 'এলাকা বা শুরুর স্থান বেছে নিন')}
          </button>
        </section>
      )}
      {lowAccuracy && (
        <div className="info-banner">
          <p>
            {tx(
              `Location accuracy is about ${Math.round(lowAccuracy.accuracy!)} m. Confirm your starting pin.`,
              `অবস্থান প্রায় ${Math.round(lowAccuracy.accuracy!)} মিটার পর্যন্ত অনিশ্চিত। শুরুর পিন নিশ্চিত করুন।`,
            )}
          </p>
          <button
            className="button"
            onClick={() => {
              setPin({
                latitude: String(lowAccuracy.latitude),
                longitude: String(lowAccuracy.longitude),
              });
              setPinOpen(true);
            }}
          >
            {tx('Check starting point', 'শুরুর স্থান দেখুন')}
          </button>
        </div>
      )}
      {showManual && (
        <section className="live-manual">
          <label>
            {tx('Your area', 'আপনার এলাকা')}
            <select value={areaId} onChange={(e) => void chooseArea(e.target.value)}>
              <option value="">{tx('Choose an area', 'এলাকা বেছে নিন')}</option>
              {areas.map((a) => (
                <option value={a.id} key={a.id}>
                  {name(a, locale)} · {a.type}
                </option>
              ))}
            </select>
          </label>
          <button className="text-link" onClick={() => setPinOpen(true)}>
            {tx('Set exact starting pin', 'সঠিক শুরুর পিন দিন')}
          </button>
          {result && (
            <button className="text-link" onClick={gps}>
              {tx('Use GPS again', 'আবার GPS ব্যবহার করুন')}
            </button>
          )}
        </section>
      )}
      {busy === 'search' && (
        <p role="status">{tx('Finding nearby shops…', 'কাছের দোকান খোঁজা হচ্ছে…')}</p>
      )}
      {error && (
        <div role="alert" className="live-error">
          <p>{error}</p>
          {shop && (
            <a
              className="text-link"
              target="_blank"
              rel="noopener noreferrer"
              href={googleNavigationUrl}
            >
              {tx('Open navigation in Google Maps', 'Google Maps-এ নেভিগেশন খুলুন')}
            </a>
          )}
          <button
            className="text-link"
            onClick={() => {
              setError('');
              if (result && shop) void directions();
              else if (origin) void search({ origin });
              else void manual();
            }}
          >
            {tx('Retry or change starting point', 'আবার চেষ্টা করুন বা শুরুর স্থান বদলান')}
          </button>
        </div>
      )}
      {result && (
        <>
          <div className="live-origin-summary">
            <MapPin size={17} />
            <span>
              {tracking
                ? tx('Live GPS tracking active', 'লাইভ GPS ট্র্যাকিং চালু আছে')
                : trackingStatus === 'arrived'
                  ? tx('Arrived near the shop entrance', 'দোকানের প্রবেশপথের কাছে পৌঁছেছেন')
                  : origin
                    ? tx('Your confirmed starting point', 'আপনার নিশ্চিত শুরুর স্থান')
                    : tx(
                        'Approximate area · confirm pin for directions',
                        'আনুমানিক এলাকা · পথের জন্য পিন নিশ্চিত করুন',
                      )}
            </span>
            <button className="text-link" onClick={() => void manual()}>
              {tx('Change', 'বদলান')}
            </button>
          </div>
          <ShopMap
            origin={origin || approx}
            points={pharmacies}
            selected={selected}
            route={route}
            followOrigin={tracking || trackingStatus === 'arrived'}
            originMoving={tracking}
            onSelect={select}
          />
          {trackingStatus !== 'idle' && (
            <div className="info-banner live-tracking-banner" role="status">
              <LocateFixed size={20} />
              <div>
                <strong>
                  {tracking
                    ? tx('Following your live location', 'আপনার লাইভ অবস্থান অনুসরণ করা হচ্ছে')
                    : trackingStatus === 'arrived'
                      ? tx('Destination reached', 'গন্তব্যে পৌঁছেছেন')
                      : tx('Live tracking stopped', 'লাইভ ট্র্যাকিং বন্ধ হয়েছে')}
                </strong>
                <p>
                  {trackingMessage ||
                    (tracking
                      ? tx(
                          `The marker and green route update as you move${trackingAccuracy ? ` · accuracy ${Math.round(trackingAccuracy)} m` : ''}.`,
                          `আপনি চলার সাথে পিন ও সবুজ পথ আপডেট হবে${trackingAccuracy ? ` · নির্ভুলতা ${Math.round(trackingAccuracy)} মিটার` : ''}।`,
                        )
                      : trackingStatus === 'arrived'
                        ? tx(
                            'Tracking stopped near the exact shop entrance.',
                            'দোকানের সঠিক প্রবেশপথের কাছে ট্র্যাকিং বন্ধ হয়েছে।',
                          )
                        : tx(
                            'The last route remains visible. Resume when you are ready.',
                            'শেষ পথটি দেখা যাচ্ছে। প্রস্তুত হলে আবার চালু করুন।',
                          ))}
                </p>
              </div>
              {tracking ? (
                <button className="text-link" onClick={() => stopTracking('stopped')}>
                  {tx('Stop', 'বন্ধ করুন')}
                </button>
              ) : (
                trackingStatus !== 'arrived' &&
                origin?.source === 'gps' && (
                  <button className="text-link" onClick={resumeTracking}>
                    {tx('Resume', 'আবার চালু করুন')}
                  </button>
                )
              )}
            </div>
          )}
          {shop ? (
            <section className="live-shop-sheet">
              <span className="eyebrow">
                {tx(
                  shop.id === pharmacies[0]?.id ? 'Nearest Shop' : 'SELECTED SHOP',
                  shop.id === pharmacies[0]?.id ? 'কাছের তালিকাভুক্ত দোকান' : 'নির্বাচিত দোকান',
                )}
              </span>
              <h2>{name(shop, locale)}</h2>
              <p>{bn && shop.address_bn ? shop.address_bn : shop.address_en}</p>
              <div className="live-shop-meta">
                <strong>
                  {((route?.distanceMeters ?? shop.distance_m) / 1000).toFixed(1)}{' '}
                  {route
                    ? tx('km route distance', 'কিমি পথের দূরত্ব')
                    : tx('km straight-line', 'কিমি সরলরেখায়')}
                </strong>
                {shop.phone && (
                  <a href={`tel:${shop.phone.replace(/[^+\d]/g, '')}`}>
                    <Phone size={15} />
                    {tx('Call shop', 'ফোন করুন')}
                  </a>
                )}
              </div>
              {shop.hours && <p className="small muted">{shop.hours}</p>}
              <div className="live-mode">
                <button aria-pressed={mode === 'WALK'} onClick={() => changedMode('WALK')}>
                  <Footprints size={18} />
                  {tx('Walking', 'হাঁটা')}
                </button>
                <button aria-pressed={mode === 'DRIVE'} onClick={() => changedMode('DRIVE')}>
                  <Car size={18} />
                  {tx('Driving', 'গাড়ি')}
                </button>
              </div>
              <p className="small muted">
                {tx(
                  'Confirm medicine availability with the shop.',
                  'দোকানে ওষুধের মজুত নিশ্চিত করুন।',
                )}
              </p>
              <a
                className="text-link"
                target="_blank"
                rel="noopener noreferrer"
                href={googleNavigationUrl}
              >
                {tx('Navigate with Google Maps', 'Google Maps দিয়ে নেভিগেট করুন')}
              </a>
            </section>
          ) : (
            <section className="live-shop-sheet">
              <h2>
                {tx('No listed shops found nationwide', 'দেশজুড়ে তালিকাভুক্ত দোকান পাওয়া যায়নি')}
              </h2>
              <Link href={`/${locale}`}>{tx('Browse medicines', 'ওষুধের তালিকা দেখুন')}</Link>
            </section>
          )}
          {pharmacies.length > 1 && (
            <section className="live-all-shops">
              <button className="text-link" onClick={() => setAll(!all)}>
                {tx(`All ${pharmacies.length} listed shops`, `সব ${pharmacies.length}টি দোকান`)} ·{' '}
                {all ? '−' : '+'}
              </button>
              {all &&
                pharmacies.map((p) => (
                  <button
                    key={p.id}
                    className={`live-shop-option ${p.id === selected ? 'selected' : ''}`}
                    onClick={() => {
                      select(p.id);
                    }}
                  >
                    <strong>{name(p, locale)}</strong>
                    <span>{p.address_en}</span>
                    <small>{(p.distance_m / 1000).toFixed(1)} km</small>
                  </button>
                ))}
            </section>
          )}
          {route && (
            <div ref={steps} className="live-route-steps">
              <h2>{tx('Your directions', 'আপনার পথ')}</h2>
              <p>
                {(route.distanceMeters / 1000).toFixed(1)}{' '}
                {tx('km route distance', 'কিমি পথের দূরত্ব')} ·{' '}
                {Math.ceil(parseFloat(route.duration) / 60)} {tx('min estimate', 'মিনিট আনুমানিক')}
              </p>
              {route.warnings.map((w) => (
                <p className="info-banner" key={w}>
                  {w}
                </p>
              ))}
              <ol>
                {route.steps.map((s, i) => (
                  <li key={i}>
                    <p>{s.instruction}</p>
                    <small>{s.distanceMeters} m</small>
                  </li>
                ))}
              </ol>
              <small>{route.attribution}</small>
            </div>
          )}
          {shop && (
            <div className="live-directions-dock">
              <div>
                <strong>{name(shop, locale)}</strong>
                <small>{tx('Exact shop entrance', 'দোকানের প্রবেশপথ')}</small>
              </div>
              <button
                className="button"
                disabled={!!busy}
                onClick={() =>
                  route ? steps.current?.scrollIntoView({ behavior: 'smooth' }) : void directions()
                }
              >
                {busy === 'route'
                  ? tx('Loading…', 'লোড হচ্ছে…')
                  : route
                    ? tx('Route steps', 'পথের ধাপ')
                    : tx('Directions', 'পথ দেখুন')}
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
      <Modal
        open={pinOpen}
        onOpenChange={setPinOpen}
        title={tx('Confirm your starting point', 'আপনার শুরুর স্থান নিশ্চিত করুন')}
      >
        <p>
          {tx(
            'Tap the map at your starting point, or enter exact coordinates. An area centre is approximate.',
            'মানচিত্রে শুরুর স্থানে চাপুন অথবা সঠিক স্থানাঙ্ক দিন। এলাকার কেন্দ্র আনুমানিক।',
          )}
        </p>
        <ShopMap
          origin={
            pin.latitude && pin.longitude
              ? { latitude: Number(pin.latitude), longitude: Number(pin.longitude) }
              : origin || approx
          }
          points={[]}
          onSelect={select}
          onPick={pick}
        />
        <div className="live-coordinate-fields">
          <label>
            Latitude
            <input
              type="number"
              step="any"
              value={pin.latitude}
              onChange={(e) => setPin({ ...pin, latitude: e.target.value })}
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="any"
              value={pin.longitude}
              onChange={(e) => setPin({ ...pin, longitude: e.target.value })}
            />
          </label>
        </div>
        <button
          className="button"
          onClick={() => {
            if (result && shop) void confirmPin();
            else {
              const p: Origin = {
                latitude: Number(pin.latitude),
                longitude: Number(pin.longitude),
                source: 'selected-pin',
                confirmed: true,
              };
              if (
                pin.latitude &&
                pin.longitude &&
                Math.abs(p.latitude) <= 90 &&
                Math.abs(p.longitude) <= 180
              ) {
                setPinOpen(false);
                void applyOrigin(p);
              } else setError(tx('Choose a valid pin.', 'সঠিক পিন দিন।'));
            }
          }}
        >
          {tx('Confirm starting point', 'শুরুর স্থান নিশ্চিত করুন')}
        </button>
      </Modal>
    </main>
  );
}
