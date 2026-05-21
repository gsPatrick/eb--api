const ical = require('node-ical');
const config = require('../../config');
const AppError = require('../../utils/app-error');

const FETCH_TIMEOUT_MS = config.icalSync.fetchTimeoutMs;

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function downloadIcs(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/calendar, text/plain, */*',
        'User-Agent': 'EB-Services-API/1.0',
      },
    });

    if (!response.ok) {
      throw new AppError(
        `iCal feed unavailable (HTTP ${response.status})`,
        502,
        'ICAL_FETCH_FAILED',
        { statusCode: response.status }
      );
    }

    return response.text();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new AppError(
        'iCal feed request timed out',
        504,
        'ICAL_FETCH_TIMEOUT'
      );
    }

    throw new AppError(
      'Unable to reach iCal feed',
      502,
      'ICAL_FETCH_FAILED',
      { reason: error.message }
    );
  } finally {
    clearTimeout(timeout);
  }
}

function toDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeEvent(entry) {
  const checkIn = toDate(entry.start);
  const checkOut = toDate(entry.end);

  if (!checkOut) {
    return null;
  }

  return {
    uid: entry.uid || null,
    type: entry.type,
    summary: entry.summary || null,
    description: entry.description || null,
    checkIn: checkIn ? formatDateOnly(checkIn) : null,
    checkOut: formatDateOnly(checkOut),
    location: entry.location || null,
  };
}

function parseEvents(icsData) {
  const parsed = ical.parseICS(icsData);
  const events = [];

  for (const item of Object.values(parsed)) {
    if (!item || item.type !== 'VEVENT') {
      continue;
    }

    const normalized = normalizeEvent(item);
    if (normalized) {
      events.push(normalized);
    }
  }

  return events;
}

/**
 * Downloads and parses an iCal feed URL.
 * Returns standardized VEVENT objects with checkout dates.
 * @param {string} url - Public iCal URL (e.g. Airbnb export link)
 * @returns {Promise<Array<{ uid, type, summary, description, checkIn, checkOut, location }>>}
 */
async function fetchAndParse(url) {
  const validUrl = validateUrl(url);

  if (!validUrl) {
    throw new AppError('Invalid iCal URL', 400, 'ICAL_INVALID_URL');
  }

  const icsData = await downloadIcs(validUrl);

  if (!icsData || !icsData.trim()) {
    throw new AppError('Empty iCal feed', 422, 'ICAL_PARSE_FAILED');
  }

  try {
    return parseEvents(icsData);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'Failed to parse iCal feed',
      422,
      'ICAL_PARSE_FAILED',
      { reason: error.message }
    );
  }
}

module.exports = {
  fetchAndParse,
};
