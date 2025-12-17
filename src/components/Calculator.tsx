// Fuel price data from bensinpriser.nu (HenrikHjelm.se)
const FUEL_PRICE_DATA = {
  "uppsalalan_St1_AlvkarlebyBrannmovagen_42__etanol": "12.34",
  "uppsalalan_St1_UppsalaHogsta__Vag_600__etanol": "12.34",
  "uppsalalan_St1_EnkopingMastergatan_1__etanol": "12.34",
  "uppsalalan_St1_AlvkarlebyBrannmovagen_42__diesel": "15.84",
  "uppsalalan_OKQ8_UppsalaBernadottevagen_5__diesel": "16.34",
  "uppsalalan_OKQ8_UppsalaSkebogatan_2__diesel": "16.24",
  "uppsalalan_Ingo_UppsalaKungsgatan_72__diesel": "16.09",
  "uppsalalan_St1_UppsalaHogsta__Vag_600__diesel": "15.84",
  "uppsalalan_Ingo_UppsalaSylveniusgatan_10__diesel": "15.59",
  "uppsalalan_Qstar_TierpKarlsholmsbruk_Mellanbovagen_29__diesel": "15.99",
  "uppsalalan_Circle_K_KnivstaGredelbyleden_128__diesel": "16.34",
  "uppsalalan_St1_EnkopingMastergatan_1__diesel": "15.84",
  "uppsalalan_St1_AlvkarlebyBrannmovagen_42__95": "14.49",
  "uppsalalan_OKQ8_UppsalaKungsgatan_80__95": "15.09",
  "uppsalalan_OKQ8_UppsalaBernadottevagen_5__95": "15.09",
  "uppsalalan_Ingo_UppsalaKungsgatan_72__95": "14.84",
  "uppsalalan_OKQ8_UppsalaSkebogatan_2__95": "14.64",
  "uppsalalan_St1_UppsalaHogsta__Vag_600__95": "14.49",
  "uppsalalan_Ingo_UppsalaSylveniusgatan_10__95": "14.29",
  "uppsalalan_Qstar_TierpKarlsholmsbruk_Mellanbovagen_29__95": "14.59",
  "uppsalalan_St1_EnkopingMastergatan_1__95": "14.49",
  "data_fran_https://bensinpriser.nu": "HenrikHjelm.se"
};
import React, { useState, useEffect, useRef } from 'react';
// import CITY_TO_LAN from data mapping (unused currently)
import { Car, Fuel, Users, MapPin, ArrowRightLeft, Wallet, RotateCcw, Save, X, Navigation, ChevronUp, ChevronDown } from 'lucide-react';
import { RouteMap } from './RouteMap';
import { Tooltip } from './Tooltip';

// Basic constants and types used by the component (restored to satisfy references)
const KM_PER_MIL = 10;
const WEAR_COST_PER_KM = 1.5;
const DEFAULT_CONSUMPTION = 0.7;
const MAX_SAVED_CARS = 3;

type FuelType = 'Bensin 95' | 'Diesel' | 'E85' | 'HVO100';
type SavedCar = { regPlate: string; consumption: number; fuelType: FuelType; carName?: string };
const Calculator: React.FC = () => {
  const [distance, setDistance] = useState<string | number>('');
  const [consumption, setConsumption] = useState<number | string>(DEFAULT_CONSUMPTION);
  const [passengers, setPassengers] = useState<number>(1);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false);
  const [fuelType, setFuelType] = useState<FuelType>('Bensin 95');
  const [startCity, setStartCity] = useState<string>('Uppsala');
  const [startLan, setStartLan] = useState<string>('');
  const [driverPays, setDriverPays] = useState<boolean>(true);
  const [isCarSelected, setIsCarSelected] = useState<boolean>(false);
  const [cheapestPrices, setCheapestPrices] = useState<Record<string, number>>({});
  const [, setUserHasInteracted] = useState<boolean>(false);
  const [savedCars, setSavedCars] = useState<SavedCar[]>(() => {
    try {
      const s = localStorage.getItem('savedCarsManual');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [regPlate, setRegPlate] = useState<string>('');
  const [regPlateError, setRegPlateError] = useState<string>('');
  const [carName, setCarName] = useState<string>('');
  const [includeWearCost, setIncludeWearCost] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [consumptionOverride, setConsumptionOverride] = useState<number | null>(null);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);

  // Responsive layout flag: stack save-form on narrow screens (<889px)
  const [isNarrow, setIsNarrow] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth < 889;
  });

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 889);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Helpers for Swedish decimal formatting/parsing
  const formatDecimal = (n: number, digits = 2) => {
    return n.toFixed(digits).replace('.', ',');
  };

  const parseNumberInput = (v: string): number | '' => {
    const s = String(v).trim();
    if (s === '') return '';
    const n = parseFloat(s.replace(',', '.'));
    return Number.isNaN(n) ? '' : n;
  };

  // Stepping helpers + long-press support
  const consInterval = useRef<number | null>(null);
  const priceInterval = useRef<number | null>(null);

  const startRepeat = (fn: () => void, ref: React.MutableRefObject<number | null>) => {
    fn();
    let delay = 400;
    ref.current = window.setTimeout(function tick() {
      fn();
      delay = Math.max(50, delay - 50);
      ref.current = window.setTimeout(tick, delay);
    }, delay) as unknown as number;
  };

  const stopRepeat = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  };

  // Temporary no-op effect to reference setters/flags until fetch logic is restored
  useEffect(() => {
    // no-op call to reference setter until fetch logic is present
    setCheapestPrices((p) => p);
  }, []);

  // NOTE: Removed automatic geolocation on mount — geolocation is triggered
  // only when the user clicks the crosshair in the map component.

  const handleReset = () => {
    setDistance('');
    setConsumption(DEFAULT_CONSUMPTION);
    setPassengers(1);
    setIsRoundTrip(false);
    setFuelType('Bensin 95');
    setStartCity('Uppsala');
    setDriverPays(true);
    setIsCarSelected(false);
    setPriceOverride(null);
  };

  /**
   * Validates Swedish registration plate formats
   * Modern (2019-): ABC12D (3 letters, 2 digits, 1 letter)
   * Legacy (1974-2019): ABC123 (3 letters, 3 digits)
   * Note: Å, Ä, Ö are not allowed in Swedish plates
   */
  /**
   * Validates Swedish registration plate formats
   * @param plate - The registration plate to validate
   * @returns true if valid Swedish format
   * 
   * Accepted formats:
   * - Modern (2019-): ABC12D (3 letters, 2 digits, 1 letter)
   * - Legacy (1974-2019): ABC123 (3 letters, 3 digits)
   * - Note: Swedish characters (Å, Ä, Ö) are not allowed
   */
  const validateSwedishRegPlate = (plate: string): boolean => {
    const cleaned = plate.replace(/\s/g, '').toUpperCase();
    
    // Moderna systemet (2019-): ABC12D (3 bokstäver, 2 siffror, 1 bokstav)
    const modern = /^[A-Z]{3}\d{2}[A-Z]$/;
    
    // Äldre systemet (1974-2019): ABC123 (3 bokstäver, 3 siffror)
    const legacy = /^[A-Z]{3}\d{3}$/;
    
    // Kontrollera att inga svenska bokstäver används (Å, Ä, Ö)
    if (/[ÅÄÖ]/.test(cleaned)) return false;
    
    // Kontrollera format
    return modern.test(cleaned) || legacy.test(cleaned);
  };

  const handleSaveCar = () => {
    if (!regPlate || !consumption) return;
    
    if (!validateSwedishRegPlate(regPlate)) {
      setRegPlateError('Ogiltigt format. Exempel: ABC123 eller ABC12D');
      return;
    }
    
    const newCar: SavedCar = {
      regPlate: regPlate.replace(/\s/g, '').toUpperCase(),
      consumption: Number(consumption),
      fuelType,
      carName: carName || undefined
    };

    const updated = savedCars.filter(car => car.regPlate !== newCar.regPlate);
    updated.unshift(newCar);
    const limited = updated.slice(0, MAX_SAVED_CARS);
    
    setSavedCars(limited);
    localStorage.setItem('savedCarsManual', JSON.stringify(limited));
    setRegPlate('');
    setCarName('');
    setRegPlateError('');
  };

  const handleLoadCar = (car: SavedCar) => {
    setConsumption(car.consumption);
    setFuelType(car.fuelType);
    setCarName(car.carName || '');
  };

  const handleDeleteCar = (regPlate: string) => {
    const updated = savedCars.filter(car => car.regPlate !== regPlate);
    setSavedCars(updated);
    localStorage.setItem('savedCarsManual', JSON.stringify(updated));
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
  const calculatePrice = (): number => {
    // Normalize län to match keys (e.g., "Uppsala län" or "uppsalacounty" -> "uppsala-lan")
    let lanKey = (startLan || '').toLowerCase().replace(/[^a-zåäö]/gi, '');
    lanKey = lanKey.replace(/(lan|county|l\u00e4n)$/i, ''); // Remove any trailing 'lan', 'län', or 'county'
    lanKey = lanKey.replace(/-+$/, ''); // Remove trailing dashes
    lanKey = lanKey + '-lan';
    // Map fuelType to key suffix
    let fuelKey = '';
    switch (fuelType) {
      case 'Bensin 95': fuelKey = '95'; break;
      case 'Diesel': fuelKey = 'diesel'; break;
      case 'E85': fuelKey = 'etanol'; break;
      case 'HVO100': fuelKey = 'hvo100'; break;
      default: fuelKey = '95';
    }
    // Find all prices for this län and fuel type
    const matches = Object.entries(FUEL_PRICE_DATA)
      .filter(([k]) => k.startsWith(lanKey + '_') && k.endsWith(`__${fuelKey}`));
    if (matches.length > 0) {
      // Return the lowest price found
      return Math.min(...matches.map(([, v]) => parseFloat(v)));
    }
    // Fallback: return a default price
    return 17.29;
  };

  // Use the cheapest price from län API or fallback to local data
  const getAutoPrice = () => {
    if (cheapestPrices && cheapestPrices[fuelType]) {
      return cheapestPrices[fuelType];
    }
    return calculatePrice();
  };
  const price = priceOverride ?? getAutoPrice();

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
  const wearCost = includeWearCost ? calculatedDistance * WEAR_COST_PER_KM : 0;
  const total = fuelCost + wearCost;
  
  const payingPassengers = driverPays ? pass : Math.max(0, pass - 1);
  

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl text-white">
      <div className="flex items-center justify-center mb-8">
        <Car className="w-8 h-8 text-cyan-400 mr-3" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Resekalkylator
        </h2>
      </div>

      <div className="space-y-6">
        {/* Map & Route Selection */}
            <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center text-lg font-medium text-gray-300">
              <MapPin className="w-4 h-4 mr-2 text-purple-400" />
              Karta och rutt
            </label>
            <Tooltip content="Klicka på kartan eller sök för att sätta startpunkt och destination. Rutten beräknas automatiskt." />
          </div>
          <p className="text-xs text-gray-400 px-1 pb-1">Sök start och mål på kartan.</p>
          <RouteMap 
            onDistanceCalculated={(d: number) => setDistance(d)} 
            onStartLocationFound={(result: { city?: string; lan?: string } | string) => {
              // Accept both city and län from RouteMap
              // Only set userHasInteracted if not already true (debounce)
              setUserHasInteracted((prev) => prev ? prev : true);
              if (typeof result === 'object' && result !== null) {
                if (result.city) {
                  setStartCity(result.city);
                }
                if (result.lan) setStartLan(result.lan);
              } else {
                setStartCity(result);
                setStartLan('Uppsala län'); // fallback if only city is provided
              }
              // No immediate logging here; handled by useEffect above
            }}
            onDurationCalculated={(mins: number) => setDuration(mins)}
          />
        </div>

        {/* Distance & Duration Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-lg font-medium text-gray-300">
                <MapPin className="w-4 h-4 mr-2 text-purple-400" />
                Avstånd (km)
              </label>
              <Tooltip content="Avståndet fylls i automatiskt när du väljer rutt på kartan, men du kan också skriva in det manuellt." />
            </div>
            <p className="text-xs text-gray-400">Resans längd i km.</p>
              <input
                type="text"
                value={distance === '' ? '' : (Number(distance) % 1 === 0 ? String(distance) : formatDecimal(Number(distance), 2))}
                onChange={(e) => {
                  setDistance(parseNumberInput(e.target.value));
                  setUserHasInteracted(true);
                }}
                placeholder="T.ex. 450"
                className="w-full mb-8 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-lg font-medium text-gray-300">
                <Navigation className="w-4 h-4 mr-2 text-indigo-400" />
                Restid
              </label>
              <Tooltip content="Beräknad restid hämtas automatiskt från rutten. Dubblas vid tur & retur." />
            </div>
            <p className="text-xs text-gray-400">Ungefärlig körtid.</p>
            <div className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-gray-400">
              {duration > 0 ? formatDuration(isRoundTrip ? duration * 2 : duration) : 'Välj rutt'}
            </div>
          </div>
        </div>

        {/* Fuel Type Selection */}
        {!isCarSelected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-lg font-medium text-gray-300">
              <Fuel className="w-4 h-4 mr-2 text-yellow-400" />
              Bränsletyp ({startCity})
            </label>
            <Tooltip content="Priset uppdateras automatiskt baserat på vald bränsletyp och region." />
          </div>
          <p className="text-xs text-gray-400">Välj bränsle.</p>
          <div className="relative">
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as FuelType)}
              className="w-full mb-8 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
            >
              <option value="Bensin 95">Bensin 95</option>
              <option value="Diesel">Diesel</option>
              <option value="E85">E85</option>
              <option value="HVO100">HVO100</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
              </svg>
            </div>
          </div>
        </div>
        )}

        {/* Consumption & Price Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-lg font-medium text-gray-300">
                <Fuel className="w-4 h-4 mr-2 text-yellow-400" />
                Förbrukning
              </label>
              <Tooltip content="Hur mycket bränsle bilen drar per mil vid blandad körning." />
            </div>
            <p className="text-xs text-gray-400">Liter per mil.</p>
            <div className="relative">
              <div className="relative bg-black/20 border border-white/10 rounded-lg h-12 mb-8">
                <input
                  type="text"
                  step="0.01"
                  value={consumption === '' ? '' : formatDecimal(Number(consumption), 2)}
                  onChange={(e) => setConsumption(parseNumberInput(e.target.value))}
                  disabled={isCarSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const cur = typeof consumption === 'number' ? consumption : 0;
                      setConsumption(Math.round((cur + 0.01) * 100) / 100);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const cur = typeof consumption === 'number' ? consumption : 0;
                      setConsumption(Math.max(0, Math.round((cur - 0.01) * 100) / 100));
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

                <div className="absolute top-1/2 transform -translate-y-1/2 flex flex-col gap-1" style={{ right: '6px' }}>
                  <button
                    type="button"
                    onMouseDown={() => startRepeat(() => {
                      const cur = typeof consumption === 'number' ? consumption : 0;
                      const next = Math.round((cur + 0.01) * 100) / 100;
                      setConsumption(next);
                    }, consInterval)}
                    onMouseUp={() => stopRepeat(consInterval)}
                    onMouseLeave={() => stopRepeat(consInterval)}
                    onTouchStart={() => startRepeat(() => {
                      const cur = typeof consumption === 'number' ? consumption : 0;
                      const next = Math.round((cur + 0.01) * 100) / 100;
                      setConsumption(next);
                    }, consInterval)}
                    onTouchEnd={() => stopRepeat(consInterval)}
                    onClick={() => {
                      const cur = typeof consumption === 'number' ? consumption : 0;
                      const next = Math.round((cur + 0.01) * 100) / 100;
                      setConsumption(next);
                    }}
                    className="bg-transparent hover:bg-white/5 rounded text-white flex items-center justify-center"
                    style={{ width: '27px', height: '19px' }}
                    aria-label="Öka förbrukning med 0,01"
                    title="+0,01"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => startRepeat(() => {
                      const cur = typeof consumption === 'number' ? consumption : 0;
                      const next = Math.max(0, Math.round((cur - 0.01) * 100) / 100);
                      setConsumption(next);
                    }, consInterval)}
                    onMouseUp={() => stopRepeat(consInterval)}
                    onMouseLeave={() => stopRepeat(consInterval)}
                    onTouchStart={() => startRepeat(() => {
                      const cur = typeof consumption === 'number' ? consumption : 0;
                      const next = Math.max(0, Math.round((cur - 0.01) * 100) / 100);
                      setConsumption(next);
                    }, consInterval)}
                    onTouchEnd={() => stopRepeat(consInterval)}
                    onClick={() => {
                      const cur = typeof consumption === 'number' ? consumption : 0;
                      const next = Math.max(0, Math.round((cur - 0.01) * 100) / 100);
                      setConsumption(next);
                    }}
                    className="bg-transparent hover:bg-white/5 rounded text-white flex items-center justify-center"
                    style={{ width: '27px', height: '19px' }}
                    aria-label="Minska förbrukning med 0,01"
                    title="-0,01"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-lg font-medium text-gray-300">
                <Wallet className="w-4 h-4 mr-2 text-green-400" />
                Bränslepris
              </label>
              <Tooltip content="Genomsnittligt pumppris. Hämtas automatiskt men kan ändras manuellt." />
            </div>
            <p className="text-xs text-gray-400">Pris per liter (kr).</p>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1 bg-black/20 border border-white/10 rounded-lg h-12 mb-8">
                  <input
                  type="text"
                  step="0.01"
                  value={price != null ? formatDecimal(price, 2) : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    const parsed = parseNumberInput(v);
                    if (parsed === '') setPriceOverride(null);
                    else setPriceOverride(parsed as number);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const cur = price != null ? price : 0;
                      const next = Math.round((cur + 0.01) * 100) / 100;
                      setPriceOverride(next);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const cur = price != null ? price : 0;
                      const next = Math.max(0, Math.round((cur - 0.01) * 100) / 100);
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

                <div className="absolute top-1/2 transform -translate-y-1/2 flex flex-col gap-1" style={{ right: '6px' }}>
                  <button
                    type="button"
                    onMouseDown={() => startRepeat(() => {
                      const cur = price != null ? price : 0;
                      const next = Math.round((cur + 0.01) * 100) / 100;
                      setPriceOverride(next);
                    }, priceInterval)}
                    onMouseUp={() => stopRepeat(priceInterval)}
                    onMouseLeave={() => stopRepeat(priceInterval)}
                    onTouchStart={() => startRepeat(() => {
                      const cur = price != null ? price : 0;
                      const next = Math.round((cur + 0.01) * 100) / 100;
                      setPriceOverride(next);
                    }, priceInterval)}
                    onTouchEnd={() => stopRepeat(priceInterval)}
                    onClick={() => {
                      const cur = price != null ? price : 0;
                      const next = Math.round((cur + 0.01) * 100) / 100;
                      setPriceOverride(next);
                    }}
                    className="bg-transparent hover:bg-white/5 rounded text-white flex items-center justify-center"
                    style={{ width: '27px', height: '19px' }}
                    aria-label="Öka pris med 0,01"
                    title="+0,01"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => startRepeat(() => {
                      const cur = price != null ? price : 0;
                      const next = Math.max(0, Math.round((cur - 0.01) * 100) / 100);
                      setPriceOverride(next);
                    }, priceInterval)}
                    onMouseUp={() => stopRepeat(priceInterval)}
                    onMouseLeave={() => stopRepeat(priceInterval)}
                    onTouchStart={() => startRepeat(() => {
                      const cur = price != null ? price : 0;
                      const next = Math.max(0, Math.round((cur - 0.01) * 100) / 100);
                      setPriceOverride(next);
                    }, priceInterval)}
                    onTouchEnd={() => stopRepeat(priceInterval)}
                    onClick={() => {
                      const cur = price != null ? price : 0;
                      const next = Math.max(0, Math.round((cur - 0.01) * 100) / 100);
                      setPriceOverride(next);
                    }}
                    className="bg-transparent hover:bg-white/5 rounded text-white flex items-center justify-center"
                    style={{ width: '27px', height: '19px' }}
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

        {/* Saved Cars Section */}
        {savedCars.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Mina bilar:</p>
            <div className="flex flex-wrap gap-2">
              {savedCars.map((car) => (
                <div
                  key={car.regPlate}
                  className="group relative flex items-center gap-2 transition-colors"
                >
                  <button
                    onClick={() => handleLoadCar(car)}
                    className="flex flex-col bg-white border-4 border-black rounded-md shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
                  >
                    <div className="flex items-center relative">
                      <div className="w-10 bg-blue-600 h-full py-2 flex flex-col items-center justify-center gap-0.5">
                        <div className="relative w-6 h-6">
                          {Array.from({ length: 12 }).map((_, i) => {
                            const angle = (i * 30 - 90) * (Math.PI / 180);
                            const radius = 8;
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;
                            return (
                              <div
                                key={i}
                                className="absolute w-1 h-1 bg-yellow-400"
                                style={{
                                  left: `calc(50% + ${x}px)`,
                                  top: `calc(50% + ${y}px)`,
                                  transform: 'translate(-50%, -50%)'
                                }}
                              />
                            );
                          })}
                        </div>
                        <div className="text-white font-bold text-xs">S</div>
                      </div>
                      <div className="px-3 py-2 bg-white">
                        <span className="font-black text-black text-base tracking-widest" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                          {car.regPlate.replace(/^([A-Z]{3})(\d)/, '$1 $2')}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-black px-2 py-0.5">
                      <span className="text-white text-[9px] font-medium">
                        {car.carName || 'skjuts.amig.nu'}
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

        {/* Save Car Form */}
        {consumption && !isCarSelected && (
          <div className="space-y-2 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs font-medium text-gray-300">Spara bildata</p>
            <div className={isNarrow ? 'flex flex-col gap-2' : 'flex gap-2 items-center'}>
              <input
                type="text"
                value={carName}
                onChange={(e) => setCarName(e.target.value)}
                placeholder="Bilnamn (valfritt)"
                maxLength={20}
                className={`${isNarrow ? 'w-full' : 'flex-1 mb-0'} bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-base`}
              />

              <div className={isNarrow ? 'flex items-center gap-2 w-full' : 'flex items-center gap-2'}>
                <div className={`${isNarrow ? 'w-3/5' : ''} flex flex-col bg-white border-4 border-black rounded-md shadow-lg overflow-hidden`} style={{ height: '38px', minHeight: 'unset', maxHeight: '40px' }}>
                  <div className="flex items-center justify-center relative h-full" style={{ height: '100%' }}>
                    <div className="w-6 bg-blue-600 h-full flex flex-col items-center justify-center gap-0.5" style={{ height: '100%' }}>
                      <div className="relative mt-1 w-1 h-1">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const angle = (i * 30 - 90) * (Math.PI / 180);
                          const radius = 4.5;
                          const x = Math.cos(angle) * radius;
                          const y = Math.sin(angle) * radius;
                          return (
                            <div
                              key={i}
                              className="absolute w-0.5 h-0.5 bg-yellow-400"
                              style={{
                                left: `calc(50% + ${x}px)`,
                                top: `calc(50% + ${y}px)`,
                                transform: 'translate(-50%, -50%)'
                              }}
                            />
                          );
                        })}
                      </div>
                      <div className="text-white font-bold text-xs">S</div>
                    </div>
                    <input
                      type="text"
                      value={regPlate.replace(/^([A-Z]{3})(\d)/, '$1 $2')}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '').toUpperCase();
                        setRegPlate(value);
                        if (regPlateError && value) {
                          if (validateSwedishRegPlate(value)) {
                            setRegPlateError('');
                          }
                        }
                      }}
                      onBlur={() => {
                        if (regPlate && !validateSwedishRegPlate(regPlate)) {
                          setRegPlateError('Ogiltigt format. Exempel: ABC123 eller ABC12D');
                        }
                      }}
                      placeholder="ABC 123"
                      maxLength={8}
                      className={`w-28 px-1 py-1 bg-white text-black placeholder-gray-400 focus:outline-none uppercase text-base font-black tracking-widest border-0 flex items-center ${
                        regPlateError ? 'ring-2 ring-red-500' : ''
                      }`}
                      style={{ fontFamily: 'Arial Black, sans-serif', height: '20px', minHeight: 'unset', maxHeight: '20px', display: 'flex', alignItems: 'center' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveCar}
                  disabled={savedCars.length >= 3}
                  className={`${isNarrow ? 'w-2/5' : ''} px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-all flex items-center gap-2 text-base`}
                  title={savedCars.length >= 3 ? 'Max 3 sparade bilar' : ''}
                >
                  <Save className="w-4 h-4" />
                  Spara
                </button>
              </div>
            </div>
            {regPlateError && (
              <p className="text-xs text-red-400">{regPlateError}</p>
            )}
            {savedCars.length >= 3 && !savedCars.find(c => c.regPlate === regPlate.replace(/\s/g, '').toUpperCase()) && (
              <p className="text-xs text-yellow-400">Max 3 sparade bilar. Ta bort en för att spara ny.</p>
            )}
          </div>
        )}

        {/* Passengers Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <label className="flex items-center text-lg font-medium text-gray-300 mr-2">
                <Users className="w-4 h-4 mr-2 text-blue-400" />
                Passagerare
              </label>
              <Tooltip content="Dela totalkostnaden på antalet resenärer för att se pris per person." />
            </div>
            <span className="text-cyan-400 font-bold">{passengerCount > 0 ? `${passengerCount} st` : 'Ingen passagerare'}</span>
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
            <label htmlFor="driverPays" className={`ml-2 text-lg font-medium ${passengers <= 1 ? 'text-gray-500' : 'text-gray-300'}`}>
              Föraren betalar sin del
            </label>
            <Tooltip content="Om avmarkerad delas kostnaden endast på passagerarna (föraren åker gratis)." />
          </div>
        </div>

        {/* Round Trip Toggle */}
        <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
          <div className="flex flex-col">
            <div className="flex items-center">
              <label className="flex items-center text-lg font-medium text-gray-300 cursor-pointer">
                <ArrowRightLeft className="w-4 h-4 mr-2 text-pink-400" />
                Tur och retur
              </label>
              <Tooltip content="Räknar med hemresan (dubbla avståndet)." />
            </div>
            <p className="text-xs text-gray-400 mt-1">Ska ni åka tillbaka?</p>
          </div>
          <button
            onClick={() => setIsRoundTrip(!isRoundTrip)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              isRoundTrip ? 'bg-cyan-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isRoundTrip ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Wear Cost Toggle */}
        <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
          <div className="flex flex-col">
            <div className="flex items-center">
              <label className="flex items-center text-lg font-medium text-gray-300 cursor-pointer">
                <Wallet className="w-4 h-4 mr-2 text-orange-400" />
                Inkludera slitage
              </label>
              <Tooltip content="Beräknas till 1.50 kr/km baserat på Skatteverkets schablon för milersättning (ca 24-25 kr/mil totalt, varav ~15 kr/mil är slitage). Inkluderar däckslitage, service, reparationer, försäkring och värdeminskning." />
            </div>
            <p className="text-xs text-gray-400 mt-1">Däck, service, värdeminskning (1.50 kr/km)</p>
          </div>
          <button
            onClick={() => setIncludeWearCost(!includeWearCost)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              includeWearCost ? 'bg-orange-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                includeWearCost ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Results */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-white/10 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Totalt</p>
                <p className="text-2xl font-bold text-white mt-1">{totalFormatted(total)} kr</p>
                {includeWearCost && (
                  <p className="text-[10px] text-gray-500 mt-1">ink. {totalFormatted(wearCost)} kr slitage</p>
                )}
              </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-900/50 to-teal-900/50 border border-white/10 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Per Person</p>
              <p className="text-2xl font-bold text-cyan-300 mt-1">{payingPassengers > 0 ? perPersonFormatted(total / payingPassengers) : '0,00'} kr</p>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Återställ kalkylator
          </button>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
