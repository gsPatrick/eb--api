const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'EB-Services/1.0 (geocoding; contact@ebservices.local)';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const MIN_INTERVAL_MS = 1100;

const cache = new Map();
let lastRequestAt = 0;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { at: Date.now(), value });
}

async function throttle() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

async function nominatimFetch(path, params) {
  const url = new URL(path, NOMINATIM_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const cacheKey = url.toString();
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  await throttle();

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed (${response.status})`);
  }

  const data = await response.json();
  cacheSet(cacheKey, data);
  return data;
}

function formatAddress(item) {
  if (!item) return '';
  return item.display_name || item.name || '';
}

function mapSearchResult(item) {
  return {
    label: formatAddress(item),
    address: formatAddress(item),
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  };
}

async function reverseGeocode(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Invalid coordinates');
  }

  const data = await nominatimFetch('/reverse', {
    lat,
    lon: lng,
    format: 'json',
    addressdetails: 1,
  });

  return {
    label: formatAddress(data),
    address: formatAddress(data),
    latitude: lat,
    longitude: lng,
  };
}

async function searchAddress(query, limit = 5) {
  const q = String(query || '').trim();
  if (q.length < 3) {
    return [];
  }

  const data = await nominatimFetch('/search', {
    q,
    format: 'json',
    addressdetails: 1,
    limit,
  });

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapSearchResult).filter((item) => Number.isFinite(item.latitude));
}

module.exports = {
  reverseGeocode,
  searchAddress,
};
