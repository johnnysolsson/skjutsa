import React, { useState, useEffect } from 'react';
import { Car as CarIcon, Loader2, ChevronRight, Save, X } from 'lucide-react';
import { Tooltip } from './Tooltip';

// Constants
const MAX_SAVED_CARS = 3;
const LOCAL_STORAGE_KEY = 'savedCars';

interface CarSelectorProps {
  onSelect: (consumption: number, fuelType: string) => void;
  onReset?: () => void;
}

interface SavedCar {
  regPlate: string;
  make: string;
  model: string;
  year: string;
  trim: string;
  consumption: number;
  fuelType: string;
}

interface CarMake {
  make_id: string;
  make_display: string;
  make_country: string;
}

interface CarModel {
  model_name: string;
  model_make_id: string;
}

interface CarTrim {
  model_id: string;
  model_make_id: string;
  model_name: string;
  model_trim: string;
  model_year: string;
  model_engine_fuel: string;
  model_engine_fuel_l_100_km?: string;
  model_lkm_mixed?: string;
}

export const CarSelector: React.FC<CarSelectorProps> = ({ onSelect, onReset }) => {
  const [makes, setMakes] = useState<CarMake[]>([]);
  const [models, setModels] = useState<CarModel[]>([]);
  const [trims, setTrims] = useState<CarTrim[]>([]);
  
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedTrim, setSelectedTrim] = useState<string>('');
  const [regPlate, setRegPlate] = useState<string>('');
  const [savedCars, setSavedCars] = useState<SavedCar[]>([]);
  
  const [isLoadingMakes, setIsLoadingMakes] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingTrims, setIsLoadingTrims] = useState(false);

  /**
   * Convert API fuel consumption to Swedish format (L/mil)
   * API returns L/100km, we convert to L/10km (per "mil")
   */
  const parseConsumption = (trim: CarTrim): number => {
    const DEFAULT_CONSUMPTION = 0.65;
    if (trim.model_lkm_mixed) {
      return parseFloat(trim.model_lkm_mixed) / 10;
    }
    if (trim.model_engine_fuel_l_100_km) {
      return parseFloat(trim.model_engine_fuel_l_100_km) / 10;
    }
    return DEFAULT_CONSUMPTION;
  };

  /**
   * Map API fuel type to our FuelType
   */
  const parseFuelType = (trim: CarTrim): string => {
    if (!trim.model_engine_fuel) return 'Bensin 95';
    
    const fuel = trim.model_engine_fuel.toLowerCase();
    if (fuel.includes('diesel')) return 'Diesel';
    if (fuel.includes('e85')) return 'E85';
    return 'Bensin 95';
  };

  // Load saved cars from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setSavedCars(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved cars:', error);
      }
    }
  }, []);

  // Fetch available car makes from CarQuery API on mount
  useEffect(() => {
    const fetchMakes = async () => {
      setIsLoadingMakes(true);
      try {
        const response = await fetch('/api/carquery/?cmd=getMakes');
        const data = await response.json();
        console.log('CarQuery API response:', data);
        if (data.Makes) {
          console.log('Found makes:', data.Makes.length);
          setMakes(data.Makes);
        } else {
          console.error('No Makes in response:', data);
        }
      } catch (error) {
        console.error('Error fetching makes:', error);
      } finally {
        setIsLoadingMakes(false);
      }
    };
    fetchMakes();
  }, []);

  // Fetch models when make is selected
  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      return;
    }
    
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const response = await fetch(`/api/carquery/?cmd=getModels&make=${encodeURIComponent(selectedMake)}`);
        const data = await response.json();
        if (data.Models) {
          setModels(data.Models);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, [selectedMake]);

  // Fetch trims when model is selected
  useEffect(() => {
    if (!selectedMake || !selectedModel) {
      setTrims([]);
      return;
    }
    
    const fetchTrims = async () => {
      setIsLoadingTrims(true);
      try {
        const response = await fetch(`/api/carquery/?cmd=getTrims&make=${encodeURIComponent(selectedMake)}&model=${encodeURIComponent(selectedModel)}`);
        const data = await response.json();
        if (data.Trims) {
          setTrims(data.Trims);
        }
      } catch (error) {
        console.error('Error fetching trims:', error);
      } finally {
        setIsLoadingTrims(false);
      }
    };
    fetchTrims();
  }, [selectedMake, selectedModel]);

  const handleMakeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMake(e.target.value);
    setSelectedModel('');
    setSelectedTrim('');
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
    setSelectedTrim('');
  };

  const handleTrimChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const trimId = e.target.value;
    setSelectedTrim(trimId);
    
    const trim = trims.find(t => t.model_id === trimId);
    if (trim) {
      onSelect(parseConsumption(trim), parseFuelType(trim));
    }
  };

  const handleSaveCar = () => {
    if (!regPlate || !selectedMake || !selectedModel || !selectedTrim) return;
    
    const trim = trims.find(t => t.model_id === selectedTrim);
    if (!trim) return;

    const newCar: SavedCar = {
      regPlate: regPlate.toUpperCase(),
      make: selectedMake,
      model: selectedModel,
      year: trim.model_year,
      trim: trim.model_trim,
      consumption: parseConsumption(trim),
      fuelType: parseFuelType(trim)
    };

    const updated = savedCars.filter(car => car.regPlate !== newCar.regPlate);
    updated.unshift(newCar);
    const limited = updated.slice(0, MAX_SAVED_CARS);
    
    setSavedCars(limited);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(limited));
    setRegPlate('');
  };

  const handleLoadCar = (car: SavedCar) => {
    setSelectedMake(car.make);
    setSelectedModel(car.model);
    setTimeout(() => {
      const trimMatch = trims.find(t => 
        t.model_year === car.year && 
        t.model_trim === car.trim
      );
      if (trimMatch) {
        setSelectedTrim(trimMatch.model_id);
      }
    }, 500);
    onSelect(car.consumption, car.fuelType);
  };

  const handleDeleteCar = (regPlate: string) => {
    const updated = savedCars.filter(car => car.regPlate !== regPlate);
    setSavedCars(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleReset = () => {
    setSelectedMake('');
    setSelectedModel('');
    setSelectedTrim('');
    setRegPlate('');
    if (onReset) {
      onReset();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm font-medium text-gray-300">
          <CarIcon className="w-4 h-4 mr-2 text-orange-400" />
          Välj bilmodell
        </label>
        <div className="flex items-center gap-2">
          {(selectedMake || selectedModel || selectedTrim) && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Återställ
            </button>
          )}
          <Tooltip content="Välj bilmärke, modell och årsmodell för att hämta förbrukningsdata från CarQuery API." />
        </div>
      </div>
      <p className="text-xs text-gray-400">Hämtar data från CarQuery API.</p>
      
      {/* Saved Cars */}
      {savedCars.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Sparade bilar:</p>
          <div className="flex flex-wrap gap-2">
            {savedCars.map((car) => (
              <div
                key={car.regPlate}
                className="group relative flex items-center gap-2 px-3 py-2 bg-cyan-900/30 hover:bg-cyan-800/40 border border-cyan-500/30 rounded-lg text-sm transition-colors"
              >
                <button
                  onClick={() => handleLoadCar(car)}
                  className="flex items-center gap-2"
                >
                  <span className="font-medium text-cyan-300">{car.regPlate}</span>
                  <span className="text-gray-400 text-xs">{car.make} {car.model}</span>
                </button>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCar(car.regPlate);
                  }}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-3 h-3 text-red-400 hover:text-red-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Make Selector */}
        <div className="relative">
          <select
            value={selectedMake}
            onChange={handleMakeChange}
            disabled={isLoadingMakes}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          >
            <option value="">Välj märke</option>
            {makes.map(make => (
              <option key={make.make_id} value={make.make_display} className="text-black">
                {make.make_display}
              </option>
            ))}
          </select>
          {isLoadingMakes ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 animate-spin" />
          ) : (
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none rotate-90" />
          )}
        </div>

        {/* Model Selector */}
        <div className="relative">
          <select
            value={selectedModel}
            onChange={handleModelChange}
            disabled={!selectedMake || isLoadingModels}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          >
            <option value="">Välj modell</option>
            {models.map((model, idx) => (
              <option key={idx} value={model.model_name} className="text-black">
                {model.model_name}
              </option>
            ))}
          </select>
          {isLoadingModels ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 animate-spin" />
          ) : (
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none rotate-90" />
          )}
        </div>

        {/* Trim/Year Selector */}
        <div className="relative">
          <select
            value={selectedTrim}
            onChange={handleTrimChange}
            disabled={!selectedModel || isLoadingTrims}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
          >
            <option value="">Välj årsmodell</option>
            {trims.map(trim => {
              const consumption = trim.model_lkm_mixed 
                ? (parseFloat(trim.model_lkm_mixed) / 10).toFixed(2)
                : trim.model_engine_fuel_l_100_km
                ? (parseFloat(trim.model_engine_fuel_l_100_km) / 10).toFixed(2)
                : 'N/A';
              
              return (
                <option key={trim.model_id} value={trim.model_id} className="text-black">
                  {trim.model_year} {trim.model_trim} ({consumption} L/mil)
                </option>
              );
            })}
          </select>
          {isLoadingTrims ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 animate-spin" />
          ) : (
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none rotate-90" />
          )}
        </div>
      </div>

      {selectedTrim && (
        <div className="space-y-2">
          <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="text-green-400 text-sm font-medium">
              ✓ {selectedMake} {selectedModel} vald
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Förbrukning uppdaterad från CarQuery API
            </div>
          </div>
          
          {/* Save Car Section */}
          <div className="flex gap-2">
            <input
              type="text"
              value={regPlate}
              onChange={(e) => setRegPlate(e.target.value.toUpperCase())}
              placeholder="Regnr (t.ex. ABC123)"
              maxLength={7}
              className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase"
            />
            <button
              onClick={handleSaveCar}
              disabled={!regPlate || savedCars.length >= 3}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Spara
            </button>
          </div>
          {savedCars.length >= 3 && !savedCars.find(c => c.regPlate === regPlate.toUpperCase()) && (
            <p className="text-xs text-yellow-400">Max 3 sparade bilar. Ta bort en för att spara ny.</p>
          )}
        </div>
      )}
    </div>
  );
};
