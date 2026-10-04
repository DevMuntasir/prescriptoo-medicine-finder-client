'use client';

import { useReducer, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import {
  ArrowRight,
  MapPin,
  LocateFixed,
  Navigation,
  Footprints,
  Car,
  Clock,
  Phone,
  Check,
  Info,
  LoaderCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Store,
} from 'lucide-react';
import { Medicine, Pharmacy } from '@/contracts';
import { Badge, Empty, Modal } from '@/components/ui/primitives';
import { SchematicMap } from '@/components/ui/schematic-map';
import { initialLocator, locatorReducer } from './state';
import { useDemo } from '@/mocks/provider';

export function Locator({
  medicine,
  pharmacies,
  qrEntry = false,
}: {
  medicine: Medicine;
  pharmacies: Pharmacy[];
  qrEntry?: boolean;
}) {
  const demo = useDemo();
  const bn = useLocale() === 'bn';
  const locale = bn ? 'bn' : 'en';
  const tx = (en: string, b: string) => (bn ? b : en);
  const [state, dispatch] = useReducer(locatorReducer, initialLocator);
  const [scenario, setScenario] = useState('Ready');
  const [area, setArea] = useState('Dhanmondi');
  const [manual, setManual] = useState(false);
  const [pin, setPin] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [allShops, setAllShops] = useState(false);
  const [steps, setSteps] = useState(false);
  const [preview, setPreview] = useState(false);
  const directionsRef = useRef<HTMLElement>(null);
  const eligible = pharmacies
    .filter(
      (p) =>
        demo.records.pharmacies.some((r) => r.id === p.id && r.status === 'Active') &&
        demo.mappings.some(
          (m) => m.pharmacyId === p.id && m.medicineId === medicine.id && m.active,
        ),
    )
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
  const available =
    scenario === 'Nationwide empty' || (scenario === 'Radius expansion' && !expanded)
      ? []
      : eligible;
  const selected = available.find((p) => p.id === state.selected);
  const nearest = available[0];
  const published = demo.medicines.some((m) => m.id === medicine.id && m.status === 'Published');
  function chooseOrigin(origin: 'area' | 'pin') {
    dispatch({ type: 'origin', origin });
    if (nearest) dispatch({ type: 'select', id: nearest.id });
    setAllShops(false);
    setSteps(false);
  }
  function selectShop(id: string) {
    dispatch({ type: 'select', id });
    setSteps(false);
  }
  function beginRoute(confirm = false) {
    dispatch({ type: 'request', confirmedPin: confirm });
    const id = state.requestId + 1;
    setSteps(true);
    setTimeout(
      () =>
        dispatch({
          type: 'response',
          id,
          status: ['Route timeout', 'Quota error', 'No route'].includes(scenario)
            ? 'error'
            : 'ready',
        }),
      650,
    );
  }
  function requestRoute() {
    if (state.route === 'ready') {
      setSteps(true);
      directionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (state.origin === 'area') {
      setPin(true);
      return;
    }
    beginRoute();
  }
  function resetScenario(value: string) {
    setScenario(value);
    setExpanded(false);
    dispatch({ type: 'origin', origin: 'none' });
    setSteps(false);
    setManual(value === 'Location denied');
    setAllShops(false);
  }
  if (!published)
    return (
      <main className="page">
        <Empty title={tx('This medicine is unavailable.', 'এই ওষুধের তথ্য এখন পাওয়া যাচ্ছে না।')}>
          <Link className="button" href={`/${locale}`}>
            {tx('Browse medicines', 'ওষুধ দেখুন')}
          </Link>
        </Empty>
      </main>
    );
  const primaryLabel =
    state.route === 'pending'
      ? tx('Preparing directions…', 'পথ তৈরি হচ্ছে…')
      : state.route === 'ready'
        ? tx('View route steps', 'পথের ধাপ দেখুন')
        : state.route === 'error'
          ? tx('Retry directions', 'আবার পথ দেখুন')
          : tx('Get directions', 'দিকনির্দেশনা দেখুন');
  const primaryAction = (
    <button className="button wide" onClick={requestRoute} disabled={state.route === 'pending'}>
      {state.route === 'pending' ? (
        <LoaderCircle className="spin" size={19} />
      ) : (
        <Navigation size={19} />
      )}{' '}
      {primaryLabel}
      <ArrowRight size={18} />
    </button>
  );
  return (
    <main className={`locator-focus ${state.origin === 'none' ? 'needs-origin' : 'has-results'}`}>
      <section className="locator-intro">
        {!qrEntry && (
          <Link className="back-link" href={`/${locale}/medicines/${medicine.slug}`}>
            <ArrowLeft size={14} />
            {tx('Medicine details', 'ওষুধের বিস্তারিত')}
          </Link>
        )}
        <div className="locator-medicine">
          <span className="locator-medicine-icon">
            <Store size={19} />
          </span>
          <div>
            <span className="eyebrow">
              {qrEntry
                ? tx('YOUR QR MEDICINE', 'আপনার QR-এর ওষুধ')
                : tx('PHARMACY FINDER', 'ফার্মেসি খুঁজুন')}
            </span>
            <h1>
              {bn ? medicine.nameBn || medicine.name : medicine.name}{' '}
              <span>{medicine.strength}</span>
            </h1>
          </div>
          <Link
            href={`/${locale}/medicines/${medicine.slug}`}
            className="locator-info-link"
            aria-label={tx('Medicine information', 'ওষুধের তথ্য')}
          >
            <Info size={19} />
          </Link>
        </div>
        <p>
          {tx(
            'Find a nearby pharmacy. Get a clear path to its entrance.',
            'কাছের ফার্মেসি খুঁজুন। দোকানের প্রবেশপথের দিকনির্দেশনা দেখুন।',
          )}
        </p>
      </section>
      {state.origin === 'none' ? (
        <section className="quick-origin">
          <div className="quick-origin-map">
            <SchematicMap showOrigin={false} locale={locale} />
            <div className="quick-origin-map-icon">
              <MapPin size={31} />
            </div>
          </div>
          <div className="quick-origin-content">
            <span className="large-icon">
              <LocateFixed size={25} />
            </span>
            <h2>{tx('Where are you starting from?', 'আপনি কোথা থেকে যাবেন?')}</h2>
            <p>
              {tx(
                'Your starting point helps us show nearby shops. No signup needed.',
                'শুরুর স্থান জানালে কাছের দোকান দেখাতে পারব। অ্যাকাউন্ট লাগবে না।',
              )}
            </p>
            {scenario === 'Location denied' && (
              <div role="alert" className="warning">
                {tx(
                  'Location isn’t available. You can choose your area below.',
                  'অবস্থান পাওয়া যাচ্ছে না। নিচে এলাকা বেছে নিন।',
                )}
              </div>
            )}
            {scenario === 'Low accuracy' && (
              <div className="warning">
                {tx(
                  'This sample location is uncertain (±800 m). Confirm a pin first.',
                  'নমুনা অবস্থান অনিশ্চিত (±৮০০ মিটার)। আগে পিন নিশ্চিত করুন।',
                )}
              </div>
            )}
            <button
              className="button wide"
              disabled={scenario === 'Location denied'}
              onClick={() => (scenario === 'Low accuracy' ? setPin(true) : chooseOrigin('pin'))}
            >
              <LocateFixed size={19} />
              {tx('Use sample current location', 'নমুনা বর্তমান অবস্থান ব্যবহার করুন')}
              <ArrowRight size={18} />
            </button>
            <p className="origin-privacy-note">
              {tx(
                'Preview only. Your device location is not accessed.',
                'শুধু প্রিভিউ। ডিভাইসের অবস্থান নেওয়া হবে না।',
              )}
            </p>
            <button
              className="manual-location-toggle"
              aria-expanded={manual}
              onClick={() => setManual(!manual)}
            >
              <MapPin size={16} />
              {tx('Choose an area instead', 'অথবা এলাকা বেছে নিন')}
              {manual ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {manual && (
              <div className="manual-origin-fields">
                <label>
                  {tx('Sample area', 'নমুনা এলাকা')}
                  <select value={area} onChange={(e) => setArea(e.target.value)}>
                    <option>Dhanmondi</option>
                    <option>Kalabagan</option>
                    <option>Lalmatia</option>
                  </select>
                </label>
                <button className="button button-outline wide" onClick={() => chooseOrigin('area')}>
                  {tx('Show pharmacies in this area', 'এই এলাকার ফার্মেসি দেখুন')}
                  <ArrowRight size={17} />
                </button>
                <p className="small muted">
                  {tx(
                    'Distances from an area centre are approximate.',
                    'এলাকার কেন্দ্র থেকে দূরত্ব আনুমানিক।',
                  )}
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          <div className="compact-origin">
            <LocateFixed size={16} />
            <div>
              <strong>
                {state.origin === 'area' ? area : tx('Sample starting pin', 'নমুনা শুরুর পিন')}
              </strong>
              <span>
                {state.origin === 'area'
                  ? tx('Approximate area centre', 'আনুমানিক এলাকার কেন্দ্র')
                  : tx('Confirmed demo origin', 'নিশ্চিত নমুনা অবস্থান')}
              </span>
            </div>
            <button
              className="text-button"
              onClick={() => {
                dispatch({ type: 'origin', origin: 'none' });
                setSteps(false);
              }}
            >
              {tx('Change', 'বদলান')}
            </button>
          </div>
          <div className="mobile-locator-workspace">
            <section
              className="locator-map-panel"
              aria-label={tx('Nearby pharmacy map', 'কাছাকাছি ফার্মেসির মানচিত্র')}
            >
              {scenario === 'Map failure' ? (
                <Empty
                  title={tx(
                    'Map unavailable. Shop details still work.',
                    'মানচিত্র নেই। দোকানের তথ্য ব্যবহার করুন।',
                  )}
                >
                  <button className="button button-outline" onClick={() => setScenario('Ready')}>
                    {tx('Retry map', 'আবার মানচিত্র দেখুন')}
                  </button>
                </Empty>
              ) : (
                <SchematicMap
                  pharmacies={available}
                  selected={selected?.id}
                  onSelect={selectShop}
                  route={state.route === 'ready'}
                  destinationLabel={selected?.name}
                  locale={locale}
                />
              )}
              {selected && (
                <div className="map-destination-pill">
                  <span className="destination-dot" />
                  {selected.name}
                  <span>{tx('Entrance pin', 'প্রবেশপথের পিন')}</span>
                </div>
              )}
            </section>
            <div className="locator-shop-sheet">
              <div className="sheet-handle" aria-hidden="true" />
              {selected ? (
                <>
                  <div className="shop-sheet-heading">
                    <Badge tone="teal">
                      {selected.id === nearest?.id
                        ? tx('Nearest listed shop', 'তালিকার সবচেয়ে কাছের দোকান')
                        : tx('Selected shop', 'নির্বাচিত দোকান')}
                    </Badge>
                    <span>
                      {available.length} {tx('shops', 'দোকান')} ·{' '}
                      {expanded
                        ? tx('nationwide sample', 'দেশব্যাপী নমুনা')
                        : tx('25 km sample', '২৫ কিমি নমুনা')}
                    </span>
                  </div>
                  <h2>{selected.name}</h2>
                  <p className="shop-address">
                    <MapPin size={15} />
                    {selected.address}
                  </p>
                  <div className="shop-distance">
                    <Navigation size={16} />
                    <strong>
                      {state.route === 'ready'
                        ? (selected.distance * 1.3).toFixed(1)
                        : selected.distance}{' '}
                      km
                    </strong>
                    <span>
                      {state.route === 'ready'
                        ? tx('sample route distance', 'নমুনা পথের দূরত্ব')
                        : tx('straight-line distance', 'সরলরেখার দূরত্ব')}
                      {state.origin === 'area' && ` · ${tx('approximate', 'আনুমানিক')}`}
                    </span>
                    {state.route === 'ready' && (
                      <>
                        <span className="distance-divider" />
                        <Clock size={15} />
                        <strong>
                          {state.mode === 'Walking' ? '8' : '3'} {tx('min', 'মিনিট')}
                        </strong>
                        <span>{tx('sample', 'নমুনা')}</span>
                      </>
                    )}
                  </div>
                  <div className="shop-contact">
                    <Clock size={14} />
                    {selected.hours
                      ? `${tx('Listed hours', 'তালিকাভুক্ত সময়')}: ${selected.hours}`
                      : tx('Hours not provided', 'সময় দেওয়া হয়নি')}
                    <span>·</span>
                    <Phone size={14} />
                    {tx('Demo contact only', 'শুধু নমুনা যোগাযোগ')}
                  </div>
                  <div className="travel-modes">
                    {(['Walking', 'Driving'] as const).map((mode) => (
                      <button
                        key={mode}
                        aria-pressed={state.mode === mode}
                        className={state.mode === mode ? 'active' : ''}
                        onClick={() => {
                          dispatch({ type: 'mode', mode });
                          setSteps(false);
                        }}
                      >
                        {mode === 'Walking' ? <Footprints size={18} /> : <Car size={18} />}{' '}
                        {mode === 'Walking' ? tx('Walking', 'হেঁটে') : tx('Driving', 'গাড়িতে')}
                      </button>
                    ))}
                  </div>
                  <div className="desktop-route-action">{primaryAction}</div>
                  <section className="compact-directions" ref={directionsRef} aria-live="polite">
                    {state.route === 'pending' && (
                      <p className="route-progress">
                        <LoaderCircle size={16} className="spin" />
                        {tx('Preparing a sample route…', 'নমুনা পথ তৈরি হচ্ছে…')}
                      </p>
                    )}
                    {state.route === 'error' && (
                      <div role="alert" className="warning">
                        <strong>
                          {scenario === 'No route'
                            ? tx(
                                'No route found for this sample.',
                                'এই নমুনার জন্য পথ পাওয়া যায়নি।',
                              )
                            : tx(
                                'Directions are unavailable right now.',
                                'এখন দিকনির্দেশনা পাওয়া যাচ্ছে না।',
                              )}
                        </strong>
                        <p>
                          {tx(
                            'Your shop is still selected. Retry or choose a different shop.',
                            'দোকানটি নির্বাচিত আছে। আবার চেষ্টা করুন বা অন্য দোকান বেছে নিন।',
                          )}
                        </p>
                        <button
                          className="text-button"
                          onClick={() => {
                            setScenario('Ready');
                            dispatch({ type: 'mode', mode: state.mode });
                          }}
                        >
                          {tx('Reset error preview', 'ত্রুটি প্রিভিউ রিসেট')}
                        </button>
                      </div>
                    )}
                    {state.route === 'ready' && steps && (
                      <div className="route-ready">
                        <Badge tone="amber">
                          {tx(
                            'Illustrative directions · not for navigation',
                            'নমুনা দিকনির্দেশনা · চলাচলের জন্য নয়',
                          )}
                        </Badge>
                        <div className="route-first-step">
                          <span>
                            <ArrowRight size={22} />
                          </span>
                          <div>
                            <small>{tx('FIRST SAMPLE STEP', 'প্রথম নমুনা ধাপ')}</small>
                            <strong>
                              {tx(
                                'Head towards the marked shop entrance',
                                'চিহ্নিত দোকানের প্রবেশপথের দিকে যান',
                              )}
                            </strong>
                          </div>
                        </div>
                        <ol className="route-steps">
                          <li>
                            {tx(
                              'Start at your confirmed sample pin.',
                              'নিশ্চিত নমুনা পিন থেকে শুরু করুন।',
                            )}
                          </li>
                          <li>
                            {tx(
                              'Follow the illustrated route to the selected marker.',
                              'নমুনা পথ ধরে নির্বাচিত চিহ্নের দিকে যান।',
                            )}
                          </li>
                          <li>
                            {tx(
                              'Check the pharmacy name and entrance when you arrive.',
                              'পৌঁছে ফার্মেসির নাম ও প্রবেশপথ মিলিয়ে নিন।',
                            )}
                          </li>
                        </ol>
                        <p className="small muted">
                          {tx(
                            'Sample steps only. Walking paths may be incomplete; no safety, accessibility or time guarantee.',
                            'শুধু নমুনা ধাপ। হাঁটার পথ অসম্পূর্ণ হতে পারে; নিরাপত্তা, প্রবেশগম্যতা বা সময়ের নিশ্চয়তা নেই।',
                          )}
                        </p>
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <Empty
                  title={tx(
                    'No pharmacies in this sample scope.',
                    'এই নমুনা এলাকায় কোনো ফার্মেসি নেই।',
                  )}
                >
                  <p>
                    {tx(
                      'The search expands only when no listed shops are found.',
                      'তালিকায় দোকান না থাকলেই অনুসন্ধান বাড়ানো হয়।',
                    )}
                  </p>
                  {scenario !== 'Nationwide empty' && (
                    <button
                      className="button"
                      onClick={() => {
                        setExpanded(true);
                        if (eligible[0]) dispatch({ type: 'select', id: eligible[0].id });
                      }}
                    >
                      {tx('Expand sample search', 'নমুনা অনুসন্ধান বাড়ান')}
                    </button>
                  )}
                </Empty>
              )}
              {available.length > 0 && (
                <div className="other-shops">
                  <button
                    className="other-shops-toggle"
                    aria-expanded={allShops}
                    onClick={() => setAllShops(!allShops)}
                  >
                    <Store size={17} />
                    {allShops
                      ? tx('Hide pharmacy list', 'ফার্মেসির তালিকা লুকান')
                      : tx(
                          `See all ${available.length} shops`,
                          `${available.length}টি দোকান দেখুন`,
                        )}
                    {allShops ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                  </button>
                  {allShops && (
                    <div className="compact-shop-list">
                      {available.map((p, i) => (
                        <button
                          key={p.id}
                          className={`compact-shop-row ${selected?.id === p.id ? 'active' : ''}`}
                          aria-pressed={selected?.id === p.id}
                          onClick={() => selectShop(p.id)}
                        >
                          <span className="pharmacy-number">{i + 1}</span>
                          <div>
                            <strong>{p.name}</strong>
                            <small>
                              {p.area} · {p.distance} km {tx('straight-line', 'সরলরেখার দূরত্ব')}
                            </small>
                          </div>
                          {selected?.id === p.id ? <Check size={17} /> : <ArrowRight size={16} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="shop-availability-note">
                <Info size={13} />
                {tx(
                  'Listing does not confirm stock. Contact the shop before travelling.',
                  'তালিকাভুক্ত থাকা মজুতের নিশ্চয়তা নয়। যাওয়ার আগে দোকানে যোগাযোগ করুন।',
                )}
              </p>
            </div>
          </div>
          {selected && (
            <div className="mobile-direction-dock">
              <div className="dock-destination">
                <span>{tx('GOING TO', 'গন্তব্য')}</span>
                <strong>{selected.name}</strong>
              </div>
              {primaryAction}
            </div>
          )}
        </>
      )}
      <div className="locator-bottom-links">
        <Link href={`/${locale}/privacy`}>
          {tx('Privacy & location choices', 'গোপনীয়তা ও অবস্থানের পছন্দ')}
        </Link>
        <button
          className="text-button"
          aria-expanded={preview}
          onClick={() => setPreview(!preview)}
        >
          {tx('Preview scenarios', 'প্রিভিউ পরিস্থিতি')}
        </button>
      </div>
      {preview && (
        <label className="scenario-control locator-scenarios">
          {tx('Preview state', 'প্রিভিউ')}
          <select
            aria-label="Locator preview state"
            value={scenario}
            onChange={(e) => resetScenario(e.target.value)}
          >
            {[
              'Ready',
              'Location denied',
              'Low accuracy',
              'Radius expansion',
              'Nationwide empty',
              'Map failure',
              'Route timeout',
              'Quota error',
              'No route',
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      )}
      <Modal
        open={pin}
        onOpenChange={setPin}
        title={tx('Confirm your starting pin', 'শুরুর পিন নিশ্চিত করুন')}
      >
        <p>
          {tx(
            'An area centre or uncertain location is approximate. Confirm the sample pin for directions.',
            'এলাকার কেন্দ্র বা অনিশ্চিত অবস্থান আনুমানিক। পথ দেখতে নমুনা পিন নিশ্চিত করুন।',
          )}
        </p>
        <SchematicMap locale={locale} />
        <button
          className="button wide"
          onClick={() => {
            setPin(false);
            if (state.selected) beginRoute(true);
            else chooseOrigin('pin');
          }}
        >
          <Check size={18} />
          {state.selected
            ? tx('Confirm pin & get directions', 'পিন নিশ্চিত করে পথ দেখুন')
            : tx('Confirm pin & find shops', 'পিন নিশ্চিত করে দোকান দেখুন')}
        </button>
      </Modal>
    </main>
  );
}
