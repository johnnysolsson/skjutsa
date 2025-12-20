// Fuel price data from bensinpriser.nu (HenrikHjelm.se)
const FUEL_PRICE_DATA = {
  uppsalalan_St1_AlvkarlebyBrannmovagen_42__etanol: "12.34",
  uppsalalan_St1_UppsalaHogsta__Vag_600__etanol: "12.34",
  uppsalalan_St1_EnkopingMastergatan_1__etanol: "12.34",
  uppsalalan_St1_AlvkarlebyBrannmovagen_42__diesel: "15.84",
  uppsalalan_OKQ8_UppsalaBernadottevagen_5__diesel: "16.34",
  uppsalalan_OKQ8_UppsalaSkebogatan_2__diesel: "16.24",
  uppsalalan_Ingo_UppsalaKungsgatan_72__diesel: "16.09",
  uppsalalan_St1_UppsalaHogsta__Vag_600__diesel: "15.84",
  uppsalalan_Ingo_UppsalaSylveniusgatan_10__diesel: "15.59",
  uppsalalan_Qstar_TierpKarlsholmsbruk_Mellanbovagen_29__diesel: "15.99",
  uppsalalan_Circle_K_KnivstaGredelbyleden_128__diesel: "16.34",
  uppsalalan_St1_EnkopingMastergatan_1__diesel: "15.84",
  uppsalalan_St1_AlvkarlebyBrannmovagen_42__95: "14.49",
  uppsalalan_OKQ8_UppsalaKungsgatan_80__95: "15.09",
  uppsalalan_OKQ8_UppsalaBernadottevagen_5__95: "15.09",
  uppsalalan_Ingo_UppsalaKungsgatan_72__95: "14.84",
  uppsalalan_OKQ8_UppsalaSkebogatan_2__95: "14.64",
  uppsalalan_St1_UppsalaHogsta__Vag_600__95: "14.49",
  uppsalalan_Ingo_UppsalaSylveniusgatan_10__95: "14.29",
  uppsalalan_Qstar_TierpKarlsholmsbruk_Mellanbovagen_29__95: "14.59",
  uppsalalan_St1_EnkopingMastergatan_1__95: "14.49",
  "data_fran_https://bensinpriser.nu": "HenrikHjelm.se",
};
import React, { useState, useEffect, useRef } from "react";
// import CITY_TO_LAN from data mapping (unused currently)
import {
  Car,
  Fuel,
  Users,
  MapPin,
  ArrowRightLeft,
  Wallet,
  RotateCcw,
  Save,
  X,
  Navigation,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { RouteMap } from "./RouteMap";
import { Tooltip } from "./Tooltip";
import LicensePlate from "./LicensePlate";
import validateSwedishRegPlate from "./plateUtils";
import { getLanFromCity } from "../utils/cityLookup";
import fetchLanForCity from "../utils/geocodeLookup";

// Basic constants and types used by the component (restored to satisfy references)
const KM_PER_MIL = 10;
const SKATTEVERKET_WEAR_COST_PER_KM = 1.5;
const DEFAULT_CONSUMPTION = 0.7;
const MAX_SAVED_CARS = 3;

type FuelType = "Bensin 95" | "Diesel" | "E85" | "HVO100";
type SavedCar = {
  regPlate: string;
  consumption: number;
  fuelType: FuelType;
  carName?: string;
};
const Calculator: React.FC = () => {
  const [distance, setDistance] = useState<string | number>("");
  const [consumption, setConsumption] = useState<number | string>(
    DEFAULT_CONSUMPTION,
  );
  const [passengers, setPassengers] = useState<number>(1);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false);
  const [fuelType, setFuelType] = useState<FuelType>("Bensin 95");
  const [startCity, setStartCity] = useState<string>("Uppsala");
  const [startLan, setStartLan] = useState<string>("");
  const [driverPays, setDriverPays] = useState<boolean>(true);
  const [isCarSelected, setIsCarSelected] = useState<boolean>(false);
  const [cheapestPrices, setCheapestPrices] = useState<Record<string, number>>(
    {},
  );
  const [userHasInteracted, setUserHasInteracted] = useState<boolean>(false);
  const [savedCars, setSavedCars] = useState<SavedCar[]>(() => {
    try {
      const s = localStorage.getItem("savedCarsManual");
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [regPlate, setRegPlate] = useState<string>("");
  const [regPlateError, setRegPlateError] = useState<string>("");
  const [carName, setCarName] = useState<string>("");
  const [includeWearCost, setIncludeWearCost] = useState<boolean>(false);
  const [wearCostPerKm, setWearCostPerKm] = useState<number>(
    SKATTEVERKET_WEAR_COST_PER_KM,
  );
  const [duration, setDuration] = useState<number>(0);
  const [consumptionOverride, setConsumptionOverride] = useState<number | null>(
    null,
  );
  const [priceOverride, setPriceOverride] = useState<number | null>(null);

  // Stepping helpers + long-press support
  const consInterval = useRef<number | null>(null);
  const priceInterval = useRef<number | null>(null);
  const suppressClick = useRef<boolean>(false);

  const startRepeat = (
    fn: () => void,
    ref: React.MutableRefObject<number | null>,
  ) => {
    // Mark that we triggered via pointer down so the following click event
    // doesn't apply the same change again.
    suppressClick.current = true;
    fn();
    let delay = 400;
    ref.current = window.setTimeout(function tick() {
      fn();
      delay = Math.max(50, delay - 50);
      ref.current = window.setTimeout(tick, delay) as unknown as number;
    }, delay) as unknown as number;
  };

  const stopRepeat = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
    // Allow the click event (which follows mouseup/touchend) to be ignored
    // once to avoid double application. Clear after a short delay.
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 120);
  };

  // Helpers for Swedish decimal formatting/parsing
  const formatDecimal = (n: number, digits = 2) => {
    return n.toFixed(digits).replace(".", ",");
  };

  const parseNumberInput = (v: string): number | "" => {
    const s = String(v).trim();
    if (s === "") return "";
    const normalized = s.replace(",", ".").replace(/[^0-9.+-]/g, "");
    const n = Number(normalized);
    return Number.isNaN(n) ? "" : n;
  };

  const handleSaveCar = () => {
    if (!validateSwedishRegPlate(regPlate)) {
      setRegPlateError("Ogiltigt format. Exempel: ABC123 eller ABC12D");
      return;
    }

    const newCar: SavedCar = {
      regPlate: regPlate.replace(/\s/g, "").toUpperCase(),
      consumption: Number(consumption),
      fuelType: fuelType, // always save current fuelType
      carName: carName || undefined,
    };

    const updated = [
      newCar,
      ...savedCars.filter((c) => c.regPlate !== newCar.regPlate),
    ].slice(0, MAX_SAVED_CARS);
    setSavedCars(updated);
    localStorage.setItem("savedCarsManual", JSON.stringify(updated));
    setRegPlate("");
    setCarName("");
    setRegPlateError("");
  };

  const handleLoadCar = (car: SavedCar) => {
    setConsumption(car.consumption);
    setFuelType(car.fuelType);
    setCarName(car.carName || "");
  };

  const handleDeleteCar = (regPlate: string) => {
    const updated = savedCars.filter((car) => car.regPlate !== regPlate);
    setSavedCars(updated);
    localStorage.setItem("savedCarsManual", JSON.stringify(updated));
  };

  // Note: responsive layout handled via Tailwind classes; removed unused isNarrow.

  const handleReset = () => {
    setDistance("");
    setConsumption(DEFAULT_CONSUMPTION);
    setPassengers(1);
    setIsRoundTrip(false);
    setFuelType("Bensin 95");
    setStartCity("Uppsala");
    setStartLan("");
    setDriverPays(true);
    setIsCarSelected(false);
    setPriceOverride(null);
    setConsumptionOverride(null);
    setIncludeWearCost(false);
    setWearCostPerKm(SKATTEVERKET_WEAR_COST_PER_KM);
    setRegPlate("");
    setCarName("");
    setRegPlateError("");
    setCheapestPrices({});
    setDuration(0);
  };

  /**
   * Calculate fuel price based on region
   * Tries to match city name, handles partial matches (e.g., "Stockholms kommun" -> "Stockholm")
   */
  /**
   * Calculate regional fuel price
   * Attempts to match city name exactly or partially (e.g., "Stockholms kommun" -> "Stockholm")
   * Falls back to default if no match found
   */
  // Get fuel price from FUEL_PRICE_DATA using län and fuel type
  const calculatePrice = React.useCallback(
    (fuelArg?: FuelType): number => {
      const ft = fuelArg ?? fuelType;
      // Normalize län to match keys (e.g., "Uppsala län" or "uppsalacounty" -> "uppsala-lan")
      let lanKey = (startLan || "").toLowerCase().replace(/[^a-zåäö]/gi, "");
      lanKey = lanKey.replace(/(lan|county|l\u00e4n)$/i, ""); // Remove any trailing 'lan', 'län', or 'county'
      lanKey = lanKey.replace(/-+$/, ""); // Remove trailing dashes
      lanKey = lanKey + "-lan";
      // Map fuelType to key suffix
      let fuelKey = "";
      switch (ft) {
        case "Bensin 95":
          fuelKey = "95";
          break;
        case "Diesel":
          fuelKey = "diesel";
          break;
        case "E85":
          fuelKey = "etanol";
          break;
        case "HVO100":
          fuelKey = "hvo100";
          break;
        default:
          fuelKey = "95";
      }
      // Find all prices for this län and fuel type
      const matches = Object.entries(FUEL_PRICE_DATA).filter(
        ([k]) => k.startsWith(lanKey + "_") && k.endsWith(`__${fuelKey}`),
      );
      if (matches.length > 0) {
        // Return the lowest price found for this län
        return Math.min(...matches.map(([, v]) => parseFloat(v)));
      }

      // If no regional match, fall back to the global cheapest for this fuel type
      const globalMatches = Object.entries(FUEL_PRICE_DATA).filter(([k]) =>
        k.endsWith(`__${fuelKey}`),
      );
      if (globalMatches.length > 0) {
        return Math.min(...globalMatches.map(([, v]) => parseFloat(v)));
      }

      // Final fallback: return a default price
      return 17.29;
    },
    [fuelType, startLan]
  );

  // getPriceFor removed (dropdown no longer displays prices)

  // Compute displayed price: prefer manual override, then fetched cheapestPrices,
  // then regional/local fallback via calculatePrice(). UseMemo prevents
  // unnecessary recalculation and ensures updates when dependencies change.
  const price = React.useMemo(() => {
    if (priceOverride != null) return priceOverride;
    if (cheapestPrices && typeof cheapestPrices[fuelType] === "number")
      return cheapestPrices[fuelType];
    return calculatePrice(fuelType);
  }, [priceOverride, cheapestPrices, fuelType, calculatePrice]);

  // Debug logging removed — no console output in production or development per request.

  // When start city/lan changes, try to fetch cached/remote prices for that län
  useEffect(() => {
    // Build a robust base URL for the fuel API. Prefer explicitly configured
    // `VITE_FUEL_API_URL`. If it's empty, use the dev proxy path `/api/fuel` so
    // Vite will forward requests to the cache server. If the env var is an
    // origin-only string (e.g. "http://localhost:5173") append the API path.
    let FUEL_API_BASE = (import.meta.env.VITE_FUEL_API_URL as string) || "";
    if (!FUEL_API_BASE) {
      FUEL_API_BASE = "/api/fuel";
    } else if (/^https?:\/\/[^/]+$/.test(FUEL_API_BASE)) {
      // origin only — add the api path
      FUEL_API_BASE = `${FUEL_API_BASE.replace(/\/$/, "")}/api/fuel`;
    }
    // Only run after the user has interacted (entered start and moved on)
    if (!userHasInteracted) return;

    // Only query if we have a resolved län or the start city maps to a known Swedish län
    const cityResolvedLan = startCity ? getLanFromCity(startCity) : null;
    const lanToQuery =
      (startLan && String(startLan).trim()) ||
      (cityResolvedLan ? String(startCity).trim() : "");
    if (!lanToQuery) return;

    // Normalize å/ä/ö -> a/a/o, replace 'county' with 'lan', and spaces -> '-' per API requirement
    const apiLan = String(lanToQuery)
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/\bcounty\b$/, "lan")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    const controller = new AbortController();
    const url = FUEL_API_BASE.includes("?")
      ? `${FUEL_API_BASE}&lan=${encodeURIComponent(apiLan)}`
      : `${FUEL_API_BASE}?lan=${encodeURIComponent(apiLan)}`;
    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to fetch fuel data");
        return r.json();
      })
      .then((data: Record<string, string>) => {
        try {
          const entries = Object.entries(data || {});
          const mapping: Record<string, number> = {};
          const keyMap: Record<FuelType, string> = {
            "Bensin 95": "95",
            Diesel: "diesel",
            E85: "etanol",
            HVO100: "hvo100",
          };
          for (const [label, key] of Object.entries(keyMap)) {
            const vals = entries
              .filter(([k]) => k.endsWith(`__${key}`))
              .map(([, v]) => parseFloat(String(v)))
              .filter((n) => !Number.isNaN(n));
            if (vals.length) mapping[label] = Math.min(...vals);
          }
          if (Object.keys(mapping).length > 0) setCheapestPrices(mapping);
        } catch (err) {
          console.log("Error parsing fuel data", err);
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.log("Failed to fetch fuel data for lan", apiLan, err);
      });

    return () => controller.abort();
  }, [startLan, startCity, userHasInteracted]);

  // Format totals with two decimals (comma separator)
  const totalFormatted = (n: number) => formatDecimal(n, 2);
  const perPersonFormatted = (n: number) => formatDecimal(n, 2);

  // Cost calculations
  const dist = Number(distance) || 0;
  const cons = Number(consumption) || 0;
  const pass = passengers || 1;
  const passengerCount = Math.max(0, pass - 1);

  const calculatedDistance = isRoundTrip ? dist * 2 : dist;

  // Swedish consumption is in L/mil (10km), so divide distance by 10
  const fuelNeeded = (calculatedDistance / KM_PER_MIL) * cons;
  const fuelCost = fuelNeeded * price;
  const wearCost = includeWearCost ? calculatedDistance * wearCostPerKm : 0;
  const total = fuelCost + wearCost;

  const payingPassengers = driverPays ? pass : Math.max(0, pass - 1);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  };

  return (
    <div className="calculator-root w-full max-w-xl mx-auto p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl text-white">
      <div className="flex items-center justify-center mb-8">
        <Car className="w-8 h-8 text-cyan-400 mr-3" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Resekalkylator
        </h2>
      </div>

      <div className="space-y-6">
        {/* Map & Route Selection */}
        <div className="calc-map-section space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center">
              <label className="flex items-center text-lg font-medium text-gray-300 mt-4">
                <MapPin className="w-4 h-4 mr-2 text-purple-400" />
                Karta och rutt
              </label>
              <Tooltip content="Klicka på kartan eller sök för att sätta startpunkt och destination. Rutten beräknas automatiskt." />
            </div>
          </div>
          <p className="text-xs text-gray-400 px-1 pb-1">
            Sök start och mål på kartan.
          </p>
          <RouteMap
            onDistanceCalculated={(d: number) => setDistance(d)}
            onStartLocationFound={(
              result:
                | { city?: string; lan?: string; lat?: number; lon?: number }
                | string,
            ) => {
              // Accept both city and län from RouteMap
              // Only set userHasInteracted if not already true (debounce)
              setUserHasInteracted((prev) => (prev ? prev : true));
              if (typeof result === "object" && result !== null) {
                if (result.city) {
                  setStartCity(result.city);
                }

                  // If the map provided coordinates, verify they're inside Sweden before using geocoding
                  const obj = result as { lat?: number; lon?: number };
                  const lat = obj.lat as number | undefined;
                  const lon = obj.lon as number | undefined;
                const insideSweden =
                  typeof lat === "number" &&
                  typeof lon === "number" &&
                  lat >= 54.5 &&
                  lat <= 69.1 &&
                  lon >= 9 &&
                  lon <= 25.5;

                if (
                  !insideSweden &&
                  (typeof lat === "number" || typeof lon === "number")
                ) {
                  // Coordinates indicate outside Sweden — don't attempt to auto-resolve län
                  setStartLan("");
                  return;
                }

                // prefer explicit län from RouteMap, otherwise attempt to resolve from city
                if (result.lan) {
                  setStartLan(result.lan);
                } else if (result.city) {
                  const resolved = getLanFromCity(result.city);
                  if (resolved) setStartLan(resolved);
                  else if (insideSweden) {
                    // fallback to dynamic geocoding when local map doesn't know the city
                    fetchLanForCity(result.city)
                      .then((dyn) => {
                        if (dyn) setStartLan(dyn);
                      })
                      .catch(() => {});
                  }
                }
              } else {
                setStartCity(result);
                const resolved = getLanFromCity(result);
                if (resolved) setStartLan(resolved);
                else {
                  fetchLanForCity(result)
                    .then((dyn) => {
                      setStartLan(dyn || "Uppsala län");
                    })
                    .catch(() => setStartLan("Uppsala län"));
                }
              }
              // No immediate logging here; handled by useEffect above
            }}
            onDurationCalculated={(mins: number) => setDuration(mins)}
          />
        </div>

        {/* Distance & Duration Row */}
        <div className="calc-distance-duration grid grid-cols-2 gap-4">
          <div className="calc-distance space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <label className="flex items-center text-lg font-medium text-gray-300 mt-4">
                  <MapPin className="w-4 h-4 mr-2 text-purple-400" />
                  Avstånd (km)
                </label>
                <Tooltip content="Avståndet fylls i automatiskt när du väljer rutt på kartan, men du kan också skriva in det manuellt." />
              </div>
            </div>
            <p className="text-xs text-gray-400">Resans längd i km.</p>
            <input
              type="text"
              value={
                distance === ""
                  ? ""
                  : Number(distance) % 1 === 0
                    ? String(distance)
                    : formatDecimal(Number(distance), 2)
              }
              onChange={(e) => {
                setDistance(parseNumberInput(e.target.value));
                setUserHasInteracted(true);
              }}
              placeholder="T.ex. 450"
              className="w-full mb-8 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            />
          </div>
          <div className="calc-duration space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <label className="flex items-center text-lg font-medium text-gray-300 mt-4">
                  <Navigation className="w-4 h-4 mr-2 text-indigo-400" />
                  Restid
                </label>
                <Tooltip content="Beräknad restid hämtas automatiskt från rutten. Dubblas vid tur & retur." />
              </div>
            </div>
            <p className="text-xs text-gray-400">Ungefärlig körtid.</p>
            <div className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-gray-400">
              {duration > 0
                ? formatDuration(isRoundTrip ? duration * 2 : duration)
                : "Välj rutt"}
            </div>
          </div>
        </div>

        {/* Saved Cars Section (moved above Fuel Type) */}
        {savedCars.length > 0 && (
          <div className="saved-cars-section space-y-2">
            <label className="flex items-center text-lg font-medium text-gray-300 mt-4 mb-2">
              <Car className="w-4 h-4 mr-2 text-cyan-400" />
              Sparade bilar
              <Tooltip content="Välj en sparad bil för att fylla i förbrukning och bränsletyp automatiskt. Du kan spara upp till 3 bilar." />
            </label>
            <p className="text-xs text-gray-400">Du kan ha upp till tre sparade bilar.</p>            
            <div className="flex flex-wrap gap-2">
              {savedCars.map((car) => (
                <div
                  key={car.regPlate}
                  className="saved-car-item group relative flex items-center gap-2 transition-colors"
                >
                  <button
                    onClick={() => handleLoadCar(car)}
                    className="saved-car-button flex flex-col bg-transparent rounded-md hover:shadow-lg transition-shadow overflow-visible"
                      style={{
                      boxSizing: "border-box",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    {/* Plate container sized to match LicensePlate width */}
                    <div
                      className="flex items-center relative justify-center"
                      style={{ width: 130, padding: 0 }}
                    >
                      <LicensePlate
                        value={car.regPlate}
                        width={130}
                        fontColor="#000000"
                      />
                    </div>
                    <div
                      className="saved-car-label"
                      style={{
                        width: 100,
                        height: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#000",
                        marginTop: 2,
                        marginLeft: -5,
                        borderRadius: 2,
                      }}
                    >
                      <span
                        style={{
                          color: "#fff",
                          fontSize: "7px",
                          lineHeight: "1",
                          fontWeight: 600,
                        }}
                      >
                        {car.carName || "skjuts.amig.nu"}
                      </span>
                    </div>
                  </button>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCar(car.regPlate);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 bg-red-600 hover:bg-red-500 rounded"
                  >
                    <X className="w-3 h-3 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fuel Type Selection */}
        {!isCarSelected && (
          <div className="calc-fueltype space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <label className="flex items-center text-lg font-medium text-gray-300 mt-4">
                  <Fuel className="w-4 h-4 mr-2 text-yellow-400" />
                  Bränsletyp ({startCity})
                </label>
                <Tooltip content="Priset uppdateras automatiskt baserat på vald bränsletyp och region." />
              </div>
            </div>
            <p className="text-xs text-gray-400">Välj bränsle.</p>
            <div className="fueltype-select relative mb-8">
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as FuelType)}
                className="block w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 pr-12 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
              >
                <option value="Bensin 95">Bensin 95</option>
                <option value="Diesel">Diesel</option>
                <option value="E85">E85</option>
                <option value="HVO100">HVO100</option>
              </select>
              <div
                className="pointer-events-none text-gray-400"
                style={{
                  position: "absolute",
                  right: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  className="w-4 h-4 fill-current block"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Consumption & Price Row */}
        <div className="calc-consumption-price grid grid-cols-2 gap-4">
          <div className="calc-consumption space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <label className="flex items-center text-lg font-medium text-gray-300 mt-4">
                  <Fuel className="w-4 h-4 mr-2 text-yellow-400" />
                  Förbrukning
                </label>
                <Tooltip content="Hur mycket bränsle bilen drar per mil vid blandad körning." />
              </div>
            </div>
            <p className="text-xs text-gray-400">Liter per mil.</p>
            <div className="relative">
              <div className="relative bg-black/20 border border-white/10 rounded-lg h-12 mb-8">
                <input
                  type="text"
                  step="0.01"
                  value={
                    consumption === ""
                      ? ""
                      : formatDecimal(Number(consumption), 2)
                  }
                  onChange={(e) =>
                    setConsumption(parseNumberInput(e.target.value))
                  }
                  disabled={isCarSelected}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const cur =
                        typeof consumption === "number" ? consumption : 0;
                      setConsumption(Math.round((cur + 0.01) * 100) / 100);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const cur =
                        typeof consumption === "number" ? consumption : 0;
                      setConsumption(
                        Math.max(0, Math.round((cur - 0.01) * 100) / 100),
                      );
                    }
                  }}
                  className="w-full h-full bg-transparent border-0 rounded-lg px-4 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {consumptionOverride != null && (
                  <button
                    type="button"
                    onClick={() => setConsumptionOverride(null)}
                    className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    title="Återställ auto-förbrukning"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div
                  className="absolute top-1/2 transform -translate-y-1/2 flex flex-col gap-1"
                  style={{ right: "6px" }}
                >
                  <button
                    type="button"
                    onMouseDown={() =>
                      startRepeat(() => {
                        const cur =
                          typeof consumption === "number" ? consumption : 0;
                        const next = Math.round((cur + 0.01) * 100) / 100;
                        setConsumption(next);
                      }, consInterval)
                    }
                    onMouseUp={() => stopRepeat(consInterval)}
                    onMouseLeave={() => stopRepeat(consInterval)}
                    onTouchStart={() =>
                      startRepeat(() => {
                        const cur =
                          typeof consumption === "number" ? consumption : 0;
                        const next = Math.round((cur + 0.01) * 100) / 100;
                        setConsumption(next);
                      }, consInterval)
                    }
                    onTouchEnd={() => stopRepeat(consInterval)}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      const cur =
                        typeof consumption === "number" ? consumption : 0;
                      const next = Math.round((cur + 0.01) * 100) / 100;
                      setConsumption(next);
                    }}
                    className="bg-transparent hover:bg-white/5 rounded text-white flex items-center justify-center"
                    style={{ width: "27px", height: "19px" }}
                    aria-label="Öka förbrukning med 0,01"
                    title="+0,01"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={() =>
                      startRepeat(() => {
                        const cur =
                          typeof consumption === "number" ? consumption : 0;
                        const next = Math.max(
                          0,
                          Math.round((cur - 0.01) * 100) / 100,
                        );
                        setConsumption(next);
                      }, consInterval)
                    }
                    onMouseUp={() => stopRepeat(consInterval)}
                    onMouseLeave={() => stopRepeat(consInterval)}
                    onTouchStart={() =>
                      startRepeat(() => {
                        const cur =
                          typeof consumption === "number" ? consumption : 0;
                        const next = Math.max(
                          0,
                          Math.round((cur - 0.01) * 100) / 100,
                        );
                        setConsumption(next);
                      }, consInterval)
                    }
                    onTouchEnd={() => stopRepeat(consInterval)}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      const cur =
                        typeof consumption === "number" ? consumption : 0;
                      const next = Math.max(
                        0,
                        Math.round((cur - 0.01) * 100) / 100,
                      );
                      setConsumption(next);
                    }}
                    className="bg-transparent hover:bg-white/5 rounded text-white flex items-center justify-center"
                    style={{ width: "27px", height: "19px" }}
                    aria-label="Minska förbrukning med 0,01"
                    title="-0,01"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="calc-price space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <label className="flex items-center text-lg font-medium text-gray-300 mt-4">
                  <Wallet className="w-4 h-4 mr-2 text-green-400" />
                  Bränslepris
                </label>
                <Tooltip content="Genomsnittligt pumppris. Hämtas automatiskt men kan ändras manuellt." />
              </div>
            </div>
            <p className="text-xs text-gray-400">Pris per liter (kr).</p>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1 bg-black/20 border border-white/10 rounded-lg h-12 mb-8">
                <input
                  type="text"
                  step="0.01"
                  value={price != null ? formatDecimal(price, 2) : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const parsed = parseNumberInput(v);
                    if (parsed === "") setPriceOverride(null);
                    else setPriceOverride(parsed as number);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const cur = price != null ? price : 0;
                      const next = Math.round((cur + 0.01) * 100) / 100;
                      setPriceOverride(next);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const cur = price != null ? price : 0;
                      const next = Math.max(
                        0,
                        Math.round((cur - 0.01) * 100) / 100,
                      );
                      setPriceOverride(next);
                    }
                  }}
                  className="w-full h-full bg-transparent border-0 rounded-lg px-4 pr-14 text-white focus:outline-none focus:ring-0 transition-all"
                />

                {priceOverride != null && (
                  <button
                    type="button"
                    onClick={() => setPriceOverride(null)}
                    className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    title="Återställ auto-pris"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div
                  className="absolute top-1/2 transform -translate-y-1/2 flex flex-col gap-1"
                  style={{ right: "6px" }}
                >
                  <button
                    type="button"
                    onMouseDown={() =>
                      startRepeat(() => {
                        const cur = price != null ? price : 0;
                        const next = Math.round((cur + 0.01) * 100) / 100;
                        setPriceOverride(next);
                      }, priceInterval)
                    }
                    onMouseUp={() => stopRepeat(priceInterval)}
                    onMouseLeave={() => stopRepeat(priceInterval)}
                    onTouchStart={() =>
                      startRepeat(() => {
                        const cur = price != null ? price : 0;
                        const next = Math.round((cur + 0.01) * 100) / 100;
                        setPriceOverride(next);
                      }, priceInterval)
                    }
                    onTouchEnd={() => stopRepeat(priceInterval)}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      const cur = price != null ? price : 0;
                      const next = Math.round((cur + 0.01) * 100) / 100;
                      setPriceOverride(next);
                    }}
                    className="bg-transparent hover:bg-white/5 rounded text-white flex items-center justify-center"
                    style={{ width: "27px", height: "19px" }}
                    aria-label="Öka pris med 0,01"
                    title="+0,01"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={() =>
                      startRepeat(() => {
                        const cur = price != null ? price : 0;
                        const next = Math.max(
                          0,
                          Math.round((cur - 0.01) * 100) / 100,
                        );
                        setPriceOverride(next);
                      }, priceInterval)
                    }
                    onMouseUp={() => stopRepeat(priceInterval)}
                    onMouseLeave={() => stopRepeat(priceInterval)}
                    onTouchStart={() =>
                      startRepeat(() => {
                        const cur = price != null ? price : 0;
                        const next = Math.max(
                          0,
                          Math.round((cur - 0.01) * 100) / 100,
                        );
                        setPriceOverride(next);
                      }, priceInterval)
                    }
                    onTouchEnd={() => stopRepeat(priceInterval)}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      const cur = price != null ? price : 0;
                      const next = Math.max(
                        0,
                        Math.round((cur - 0.01) * 100) / 100,
                      );
                      setPriceOverride(next);
                    }}
                    className="bg-transparent hover:bg-white/5 rounded text-white flex items-center justify-center"
                    style={{ width: "27px", height: "19px" }}
                    aria-label="Minska pris med 0,01"
                    title="-0,01"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Car Form */}
        {consumption && !isCarSelected && (
          <div className="save-car-form space-y-2 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs font-medium text-gray-300">Spara bildata</p>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <input
                type="text"
                value={carName}
                onChange={(e) => setCarName(e.target.value)}
                placeholder="Bilnamn (valfritt)"
                maxLength={20}
                className="w-full mb-0 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-base sm:w-1/2"
              />
              <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
                <div className="save-plate-wrapper" style={{ width: 130, flex: "none" }}>
                  <LicensePlate
                    value={regPlate}
                    setValue={setRegPlate}
                    error={regPlateError}
                    setError={setRegPlateError}
                    editable
                    width={130}
                  />
                </div>
                <div className="flex-1" />
                <button
                  onClick={handleSaveCar}
                  disabled={
                    savedCars.length >= 3 ||
                    regPlate.length !== 6 ||
                    !validateSwedishRegPlate(regPlate) ||
                    !!regPlateError
                  }
                  className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-all flex items-center gap-2 text-base w-36 flex-shrink-0"
                  title={
                    savedCars.length >= 3
                      ? "Max 3 sparade bilar"
                      : regPlate.length !== 6
                        ? "Fyll i hela registreringsnumret"
                        : regPlateError
                          ? regPlateError
                          : !validateSwedishRegPlate(regPlate)
                            ? "Ogiltigt format"
                            : ""
                  }
                >
                  <Save className="w-4 h-4" />
                  Spara
                </button>
              </div>
            </div>

            {regPlateError && (
              <p className="text-xs text-red-400">{regPlateError}</p>
            )}
            {savedCars.length >= 3 &&
              !savedCars.find(
                (c) => c.regPlate === regPlate.replace(/\s/g, "").toUpperCase(),
              ) && (
                <p className="text-xs text-yellow-400">
                  Max 3 sparade bilar. Ta bort en för att spara ny.
                </p>
              )}
          </div>
        )}

        {/* Passengers Slider */}
        <div className="calc-passengers space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <label className="flex items-center text-lg font-medium text-gray-300 mr-2 mt-4">
                <Users className="w-4 h-4 mr-2 text-blue-400" />
                Passagerare
              </label>
              <Tooltip content="Dela totalkostnaden på antalet resenärer för att se pris per person." />
            </div>
            <span className="text-cyan-400 font-bold">
              {passengerCount > 0
                ? `${passengerCount} st`
                : "Ingen passagerare"}
            </span>
          </div>
          <p className="text-xs text-gray-400">Antal som delar.</p>
          <input
            type="range"
            min={1}
            max={8}
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
            className="w-full mb-8 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />

          <div className="flex items-center mt-3">
            <input
              type="checkbox"
              id="driverPays"
              checked={driverPays}
              onChange={(e) => setDriverPays(e.target.checked)}
              disabled={passengers <= 1}
              className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex items-center ml-2">
              <label
                htmlFor="driverPays"
                className={`text-lg font-medium ${passengers <= 1 ? "text-gray-500" : "text-gray-300"}`}
              >
                Föraren betalar sin del
              </label>
              <Tooltip content="Om avmarkerad delas kostnaden endast på passagerarna (föraren åker gratis)." />
            </div>
          </div>
        </div>

        {/* Round Trip and Wear Cost Toggles Side by Side */}
        <div className="calc-toggles flex flex-col gap-4 w-full items-stretch sm:flex-row sm:items-start">
          {/* Round Trip Toggle */}
          <div className="w-full sm:flex-1 flex flex-col justify-between p-3 bg-black/20 rounded-lg border border-white/5 min-w-0">
            <div className="flex items-center justify-between w-full min-h-[32px]">
              <div className="flex items-center">
                <label className="flex items-center text-lg font-medium text-gray-300 cursor-pointer mt-4">
                  <ArrowRightLeft className="w-4 h-4 mr-2 text-pink-400" />
                  Tur och retur
                </label>
                <Tooltip content="Räknar med hemresan (dubbla avståndet)." />
              </div>
              <button
                onClick={() => setIsRoundTrip(!isRoundTrip)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isRoundTrip ? "bg-cyan-600" : "bg-gray-700"
                }`}
                style={{ marginLeft: "12px" }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isRoundTrip ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p
              className="text-xs text-gray-400 mt-0.5 text-left"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Ska ni åka tillbaka?
            </p>
          </div>
          {/* Wear Cost Toggle & Adjustable Field */}
          <div className="w-full sm:flex-1 p-3 bg-black/20 rounded-lg border border-white/5 min-w-0 flex flex-col items-center">
            <div className="flex items-center justify-between w-full min-h-[32px]">
              <div className="flex items-center">
                <label className="flex items-center text-lg font-medium text-gray-300 cursor-pointer mt-4">
                  <Wallet className="w-4 h-4 mr-2 text-orange-400" />
                  Slitage
                </label>
                <Tooltip content="Beräknas till 1.50 kr/km baserat på Skatteverkets schablon för milersättning (ca 24-25 kr/mil totalt, varav ~15 kr/mil är slitage). Inkluderar däckslitage, service, reparationer, försäkring och värdeminskning." />
              </div>
              <button
                onClick={() => setIncludeWearCost(!includeWearCost)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  includeWearCost ? "bg-cyan-600" : "bg-gray-700"
                }`}
                style={{ marginLeft: "12px" }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    includeWearCost ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 text-left">
              Däck, service, värdeminskning ({wearCostPerKm.toFixed(2)} kr/km)
            </p>
            {includeWearCost && (
              <div className="mt-4 flex flex-col items-center w-full">
                <div className="w-full flex flex-col items-stretch">
                  <span className="text-xs text-gray-400 mb-1 text-center w-full">
                    kr/km
                  </span>
                  <div className="relative bg-black/20 border border-white/10 rounded-lg h-12 flex items-center w-full">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={wearCostPerKm.toFixed(2)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(",", "."));
                        if (!isNaN(v) && v >= 0)
                          setWearCostPerKm(Math.round(v * 100) / 100);
                      }}
                      className="w-full h-full bg-transparent border-0 rounded-lg px-4 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    />
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 flex flex-col gap-1"
                      style={{ right: "6px" }}
                    >
                      <button
                        type="button"
                        onMouseDown={() =>
                          startRepeat(
                            () =>
                              setWearCostPerKm(
                                (w) => Math.round((w + 0.01) * 100) / 100,
                              ),
                            priceInterval,
                          )
                        }
                        onMouseUp={() => stopRepeat(priceInterval)}
                        onMouseLeave={() => stopRepeat(priceInterval)}
                        onTouchStart={() =>
                          startRepeat(
                            () =>
                              setWearCostPerKm(
                                (w) => Math.round((w + 0.01) * 100) / 100,
                              ),
                            priceInterval,
                          )
                        }
                        onTouchEnd={() => stopRepeat(priceInterval)}
                        onClick={() => {
                          if (suppressClick.current) {
                            suppressClick.current = false;
                            return;
                          }
                          setWearCostPerKm(
                            (w) => Math.round((w + 0.01) * 100) / 100,
                          );
                        }}
                        className="bg-transparent hover:bg-white/5 rounded text-white flex items-center justify-center"
                        style={{ width: "27px", height: "19px" }}
                        aria-label="Öka slitage med 0,01"
                        title="+0,01"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={() =>
                          startRepeat(
                            () =>
                              setWearCostPerKm((w) =>
                                Math.max(0, Math.round((w - 0.01) * 100) / 100),
                              ),
                            priceInterval,
                          )
                        }
                        onMouseUp={() => stopRepeat(priceInterval)}
                        onMouseLeave={() => stopRepeat(priceInterval)}
                        onTouchStart={() =>
                          startRepeat(
                            () =>
                              setWearCostPerKm((w) =>
                                Math.max(0, Math.round((w - 0.01) * 100) / 100),
                              ),
                            priceInterval,
                          )
                        }
                        onTouchEnd={() => stopRepeat(priceInterval)}
                        onClick={() => {
                          if (suppressClick.current) {
                            suppressClick.current = false;
                            return;
                          }
                          setWearCostPerKm((w) =>
                            Math.max(0, Math.round((w - 0.01) * 100) / 100),
                          )
                        }}
                        className="bg-transparent hover:bg-white/5 rounded text-white flex items-center justify-center"
                        style={{ width: "27px", height: "19px" }}
                        aria-label="Minska slitage med 0,01"
                        title="-0,01"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="calc-results mt-8 pt-6 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-white/10 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Totalt
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalFormatted(total)} kr
            </p>
            {includeWearCost && (
              <p className="text-[10px] text-gray-500 mt-1">
                ink. {totalFormatted(wearCost)} kr slitage
              </p>
            )}
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-900/50 to-teal-900/50 border border-white/10 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Per Person
            </p>
            <p className="text-2xl font-bold text-cyan-300 mt-1">
              {payingPassengers > 0
                ? perPersonFormatted(total / payingPassengers)
                : "0,00"}{" "}
              kr
            </p>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="calc-reset flex justify-center pt-4">
        <button
          onClick={handleReset}
          className="calc-reset-btn flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Återställ kalkylator
        </button>

        {/* End main content wrapper */}
      </div>
    </div>
  );
};

export default Calculator;
