import { CITY_TO_LAN } from '../data/sweden-lan';

const normalize = (s: string) => {
  return s
    .trim()
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
};

const buildLookup = () => {
  const map = new Map<string, string>();
  for (const [city, lan] of Object.entries(CITY_TO_LAN)) {
    map.set(normalize(city), lan);
  }
  return map;
};

const CITY_LOOKUP = buildLookup();

export const getLanFromCity = (rawCity?: string | null): string | null => {
  if (!rawCity) return null;
  let city = String(rawCity).trim();
  // remove common suffixes like " kommun", " stad"
  city = city.replace(/\bkommun\b/i, '').replace(/\bstad\b/i, '').trim();
  const n = normalize(city);
  if (CITY_LOOKUP.has(n)) return CITY_LOOKUP.get(n) || null;

  // try substring matches
  for (const [k, v] of CITY_LOOKUP.entries()) {
    if (k.startsWith(n) || n.startsWith(k)) return v;
  }

  return null;
};

export default getLanFromCity;
