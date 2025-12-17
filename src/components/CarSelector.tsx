import React, { useState } from 'react';

import { Fuel } from 'lucide-react';
import { Tooltip } from './Tooltip';


interface CarSelectorProps {
  onSelect: (consumption: number, fuelType: string) => void;
  onReset?: () => void;
}

export const CarSelector: React.FC<CarSelectorProps> = ({ onSelect, onReset }) => {
  const [fuelType, setFuelType] = useState('');
  const [consumption, setConsumption] = useState('');

  const handleReset = () => {
    setFuelType('');
    setConsumption('');
    if (onReset) {
      onReset();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm font-medium text-gray-300">
          <Fuel className="w-4 h-4 mr-2 text-yellow-400" />
          Ange bränsletyp och förbrukning
        </label>
        <div className="flex items-center gap-2">
          {(fuelType || consumption) && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Återställ
            </button>
          )}
          <Tooltip content="Ange bränsletyp (t.ex. Bensin, Diesel) och förbrukning (liter per mil eller 100 km)." />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-3">
          <label className="block text-xs text-gray-400 mb-1">Bränsletyp</label>
          <input
            type="text"
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={fuelType}
            onChange={e => {
              setFuelType(e.target.value);
              if (onSelect) onSelect(Number(consumption) || 0, e.target.value);
            }}
            placeholder="t.ex. Bensin, Diesel"
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs text-gray-400 mb-1">Förbrukning (l/100km eller l/mil)</label>
          <input
            type="number"
            step="0.01"
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={consumption}
            onChange={e => {
              setConsumption(e.target.value);
              if (onSelect) onSelect(Number(e.target.value) || 0, fuelType);
            }}
            placeholder="t.ex. 0.65 eller 6.5"
          />
        </div>
      </div>
    </div>
  );
};
