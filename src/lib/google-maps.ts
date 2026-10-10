'use client';

let loadPromise: Promise<typeof google> | undefined;
let authenticationFailed = false;
const authenticationFailureListeners = new Set<(error: Error) => void>();

const authenticationError = () =>
  new Error('Google Maps could not authenticate. Use the shop list below.');

function installAuthenticationFailureHandler() {
  const browserWindow = window as typeof window & { gm_authFailure?: () => void };
  browserWindow.gm_authFailure = () => {
    authenticationFailed = true;
    loadPromise = undefined;
    const error = authenticationError();
    authenticationFailureListeners.forEach((listener) => listener(error));
  };
}

export function onGoogleMapsAuthenticationFailure(listener: (error: Error) => void) {
  if (typeof window === 'undefined') return () => undefined;
  installAuthenticationFailureHandler();
  authenticationFailureListeners.add(listener);
  if (authenticationFailed) listener(authenticationError());
  return () => authenticationFailureListeners.delete(listener);
}

export function googleMapsAuthenticationFailed() {
  return authenticationFailed;
}

export function loadGoogleMaps(language = 'bn') {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps needs a browser.'));
  installAuthenticationFailureHandler();
  if (authenticationFailed) return Promise.reject(authenticationError());
  const maps = window.google?.maps as { importLibrary?: unknown } | undefined;
  if (typeof maps?.importLibrary === 'function') return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return Promise.reject(new Error('Google Maps is not configured. Use the shop list below.'));

  loadPromise = new Promise((resolve, reject) => {
    const callback = `__prescriptooGoogleMaps${Date.now()}`;
    const script = document.createElement('script');
    const query = new URLSearchParams({
      key,
      loading: 'async',
      callback,
      v: 'quarterly',
      language,
      region: 'BD',
      auth_referrer_policy: 'origin',
    });
    Object.assign(window, {
      [callback]: () => {
        delete (window as unknown as Record<string, unknown>)[callback];
        resolve(window.google);
      },
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${query}`;
    script.async = true;
    script.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[callback];
      script.remove();
      loadPromise = undefined;
      reject(new Error('Google Maps could not load. Use the shop list below.'));
    };
    document.head.append(script);
  });
  return loadPromise;
}

export function googleMapId() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID';
}

export function toLatLngLiteral(
  value: google.maps.LatLng | google.maps.LatLngLiteral,
): google.maps.LatLngLiteral {
  const latitude = typeof value.lat === 'function' ? value.lat() : value.lat;
  const longitude = typeof value.lng === 'function' ? value.lng() : value.lng;
  return { lat: latitude, lng: longitude };
}

// Routes API uses Google's encoded polyline format. Decoding locally avoids another library/request.
export function decodePolyline(value: string): google.maps.LatLngLiteral[] {
  const path: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < value.length) {
    const decode = () => {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = value.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index <= value.length);
      return result & 1 ? ~(result >> 1) : result >> 1;
    };
    latitude += decode();
    longitude += decode();
    path.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
  }
  return path;
}
