import React, { useState, useEffect } from 'react';
import { Car, Fuel, Users, MapPin, ArrowRightLeft, Wallet, RotateCcw, Save, X, Navigation } from 'lucide-react';
import { RouteMap } from './RouteMap';
import { CarSelector } from './CarSelector';
import { Tooltip } from './Tooltip';

type FuelType = 'Bensin 95' | 'Diesel' | 'E85' | 'HVO100';

interface SavedCar {
  regPlate: string;
  consumption: number;
  fuelType: FuelType;
  carName?: string;
}

// Constants
const DEFAULT_CONSUMPTION = 0.65; // L/mil - average consumption
const WEAR_COST_PER_KM = 1.5; // kr/km - based on Swedish Tax Agency's mileage allowance
const MAX_SAVED_CARS = 3;
const KM_PER_MIL = 10;

// Regional fuel prices (kr/L) - Updated periodically based on market averages
const REGIONAL_PRICES: Record<string, Record<FuelType, number>> = {
  'Stockholm': { 'Bensin 95': 17.44, 'Diesel': 18.04, 'E85': 14.14, 'HVO100': 21.69 },
  'Öteborg': { 'Bensin 95': 17.34, 'Diesel': 17.94, 'E85': 14.04, 'HVO100': 21.59 },
  'Malmö': { 'Bensin 95': 17.24, 'Diesel': 17.84, 'E85': 13.94, 'HVO100': 21.49 },
  'Uppsala': { 'Bensin 95': 17.29, 'Diesel': 17.89, 'E85': 13.99, 'HVO100': 21.54 },
  'Default': { 'Bensin 95': 17.29, 'Diesel': 17.89, 'E85': 13.99, 'HVO100': 21.54 }
};

const Calculator: React.FC = () => {
  const [distance, setDistance] = useState<number | ''>('');
  const [consumption, setConsumption] = useState<number | ''>(DEFAULT_CONSUMPTION);
  const [passengers, setPassengers] = useState<number>(1);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false);
  const [fuelType, setFuelType] = useState<FuelType>('Bensin 95');
  const [startCity, setStartCity] = useState<string>('Uppsala');
  const [driverPays, setDriverPays] = useState<boolean>(true);
  const [resetKey, setResetKey] = useState<number>(0);
  const [isCarSelected, setIsCarSelected] = useState<boolean>(false);
  const [savedCars, setSavedCars] = useState<SavedCar[]>(() => {
    try {
      const saved = localStorage.getItem('savedCarsManual');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading saved cars:', error);
      return [];
    }
  });
  const [regPlate, setRegPlate] = useState<string>('');
  const [carName, setCarName] = useState<string>('');
  const [regPlateError, setRegPlateError] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [includeWearCost, setIncludeWearCost] = useState<boolean>(false);

  // Fetch user's current city on mount using geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const address = data.address;
            const city = address?.city || address?.town || address?.village || address?.municipality || 'Din plats';
            console.log('Fetched city from geolocation:', city);
            setStartCity(city);
          } catch (error) {
            console.error('Error getting location name:', error);
          }
        },
        (error) => {
          console.error('Geolocation permission denied or error:', error);
        }
      );
    }
  }, []);

  const handleReset = () => {
    setDistance('');
    setConsumption(DEFAULT_CONSUMPTION);
    setPassengers(1);
    setIsRoundTrip(false);
    setFuelType('Bensin 95');
    setStartCity('Uppsala');
    setDriverPays(true);
    setResetKey(prev => prev + 1);
    setIsCarSelected(false);
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
  const calculatePrice = (): number => {
    const normalizedStart = startCity.trim();
    const cityKey = Object.keys(REGIONAL_PRICES).find(key => 
      normalizedStart === key || normalizedStart.includes(key)
    ) || 'Default';

    return REGIONAL_PRICES[cityKey][fuelType];
  };

  const price = calculatePrice();

  // Cost calculations
  const dist = Number(distance) || 0;
  const cons = Number(consumption) || 0;
  const pass = passengers || 1;

  const calculatedDistance = isRoundTrip ? dist * 2 : dist;
  
  // Swedish consumption is in L/mil (10km), so divide distance by 10
  const fuelNeeded = (calculatedDistance / KM_PER_MIL) * cons;
  const fuelCost = fuelNeeded * price;
  const wearCost = includeWearCost ? calculatedDistance * WEAR_COST_PER_KM : 0;
  const total = fuelCost + wearCost;
  
  const payingPassengers = driverPays ? pass : Math.max(0, pass - 1);
  const totalCost = Math.round(total);
  const costPerPerson = payingPassengers > 0 ? Math.round(total / payingPassengers) : 0;

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
            <label className="text-sm font-medium text-gray-300">Karta & Rutt</label>
            <Tooltip content="Klicka på kartan eller sök för att sätta startpunkt och destination. Rutten beräknas automatiskt." />
          </div>
          <p className="text-xs text-gray-400 px-1 pb-1">Sök start och mål på kartan.</p>
          <RouteMap 
            onDistanceCalculated={(d: number) => setDistance(d)} 
            onStartLocationFound={(city: string) => setStartCity(city)}
            onDurationCalculated={(mins: number) => setDuration(mins)}
          />
        </div>

        {/* Distance & Duration Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-300">
                <MapPin className="w-4 h-4 mr-2 text-purple-400" />
                Avstånd (km)
              </label>
              <Tooltip content="Avståndet fylls i automatiskt när du väljer rutt på kartan, men du kan också skriva in det manuellt." />
            </div>
            <p className="text-xs text-gray-400">Resans längd i km.</p>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              placeholder="T.ex. 450"
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-300">
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

        {/* Car Selector */}
        <CarSelector 
          key={resetKey}
          onSelect={(cons, type) => {
          setConsumption(cons);
          setIsCarSelected(true);
          if (type === 'Diesel') setFuelType('Diesel');
          else if (type === 'Bensin' || type === 'Hybrid') setFuelType('Bensin 95');
        }}
          onReset={() => setIsCarSelected(false)}
        />

        {/* Fuel Type Selection */}
        {!isCarSelected && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm font-medium text-gray-300">
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
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
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
              <label className="flex items-center text-sm font-medium text-gray-300">
                <Fuel className="w-4 h-4 mr-2 text-yellow-400" />
                Förbrukning
              </label>
              <Tooltip content="Hur mycket bränsle bilen drar per mil vid blandad körning." />
            </div>
            <p className="text-xs text-gray-400">Liter per mil.</p>
            <input
              type="number"
              step="0.01"
              value={consumption}
              onChange={(e) => setConsumption(Number(e.target.value))}
              disabled={isCarSelected}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-300">
                <Wallet className="w-4 h-4 mr-2 text-green-400" />
                Bränslepris
              </label>
              <Tooltip content="Genomsnittligt pumppris. Hämtas automatiskt men kan ändras manuellt." />
            </div>
            <p className="text-xs text-gray-400">Pris per liter (kr).</p>
            <input
              type="number"
              step="0.01"
              value={price}
              readOnly
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            />
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
            <div className="flex gap-2">
              <input
                type="text"
                value={carName}
                onChange={(e) => setCarName(e.target.value)}
                placeholder="Bilnamn (valfritt)"
                maxLength={20}
                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
              <div className="flex flex-col bg-white border-4 border-black rounded-md shadow-lg overflow-hidden">
                <div className="flex items-center relative">
                  <div className="w-10 bg-blue-600 h-full py-2.5 flex flex-col items-center justify-center gap-0.5">
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
                    className={`w-32 px-3 py-2.5 bg-white text-black placeholder-gray-400 focus:outline-none uppercase text-base font-black tracking-widest border-0 ${
                      regPlateError ? 'ring-2 ring-red-500' : ''
                    }`}
                    style={{ fontFamily: 'Arial Black, sans-serif' }}
                  />
                </div>
                <div className="w-full bg-black px-2 py-0.5 text-center">
                  <span className="text-white text-[9px] font-medium">skjuts.amig.nu</span>
                </div>
              </div>
              <button
                onClick={handleSaveCar}
                disabled={!regPlate || savedCars.length >= 3 || !!regPlateError}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors flex items-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" />
                Spara
              </button>
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
              <label className="flex items-center text-sm font-medium text-gray-300 mr-2">
                <Users className="w-4 h-4 mr-2 text-blue-400" />
                Passagerare
              </label>
              <Tooltip content="Dela totalkostnaden på antalet resenärer för att se pris per person." />
            </div>
            <span className="text-cyan-400 font-bold">{passengers} st</span>
          </div>
          <p className="text-xs text-gray-400">Antal som delar.</p>
          <input
            type="range"
            min="1"
            max="9"
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
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
            <label htmlFor="driverPays" className={`ml-2 text-sm font-medium ${passengers <= 1 ? 'text-gray-500' : 'text-gray-300'}`}>
              Föraren betalar sin del
            </label>
            <Tooltip content="Om avmarkerad delas kostnaden endast på passagerarna (föraren åker gratis)." />
          </div>
        </div>

        {/* Round Trip Toggle */}
        <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
          <div className="flex flex-col">
            <div className="flex items-center">
              <label className="flex items-center text-sm font-medium text-gray-300 cursor-pointer">
                <ArrowRightLeft className="w-4 h-4 mr-2 text-pink-400" />
                Tur & Retur
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
              <label className="flex items-center text-sm font-medium text-gray-300 cursor-pointer">
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
              <p className="text-2xl font-bold text-white mt-1">{totalCost} kr</p>
              {includeWearCost && (
                <p className="text-[10px] text-gray-500 mt-1">ink. {Math.round(wearCost)} kr slitage</p>
              )}
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-900/50 to-teal-900/50 border border-white/10 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Per Person</p>
              <p className="text-2xl font-bold text-cyan-300 mt-1">{costPerPerson} kr</p>
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
