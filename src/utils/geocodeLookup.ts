import { ALL_LAN } from "../data/sweden-lan";

const normalize = (s?: string) => {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const fetchLanForCity = async (
  city?: string | null,
): Promise<string | null> => {
  if (!city) return null;
  const q = encodeURIComponent(String(city).trim() + " Sweden");
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&countrycodes=se&format=json&addressdetails=1&limit=3`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    for (const item of arr) {
      const addr = item.address || {};
      // Only accept results inside Sweden
      if (addr.country_code && String(addr.country_code).toLowerCase() !== "se")
        continue;
      const county = addr.county || addr.state || addr.region || null;
      if (!county) continue;
      const nCounty = normalize(county);
      // Try to match against known ALL_LAN entries
      for (const lan of ALL_LAN) {
        const nLan = normalize(lan);
        if (
          nLan === nCounty ||
          nLan.includes(nCounty) ||
          nCounty.includes(nLan)
        ) {
          return lan;
        }
      }
      // If no exact match, return the county string as-is (best-effort)
      return county;
    }
    return null;
  } catch {
    return null;
  }
};

export default fetchLanForCity;
