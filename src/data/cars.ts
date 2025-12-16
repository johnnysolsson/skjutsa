export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  variant: string;
  consumption: number; // l/10km or kWh/10km
  fuelType: 'Bensin' | 'Diesel' | 'El' | 'Hybrid';
}

export const CAR_DATABASE: Car[] = [
  // Volvo
  { id: 'volvo-v60-2022-b4', make: 'Volvo', model: 'V60', year: 2022, variant: 'B4 Bensin', consumption: 0.69, fuelType: 'Bensin' },
  { id: 'volvo-v60-2022-b4-d', make: 'Volvo', model: 'V60', year: 2022, variant: 'B4 Diesel', consumption: 0.55, fuelType: 'Diesel' },
  { id: 'volvo-xc60-2022-b5', make: 'Volvo', model: 'XC60', year: 2022, variant: 'B5 AWD', consumption: 0.78, fuelType: 'Bensin' },
  { id: 'volvo-xc40-2022-t2', make: 'Volvo', model: 'XC40', year: 2022, variant: 'T2', consumption: 0.70, fuelType: 'Bensin' },
  
  // Volkswagen
  { id: 'vw-golf-2021-1.5', make: 'Volkswagen', model: 'Golf', year: 2021, variant: '1.5 eTSI', consumption: 0.58, fuelType: 'Bensin' },
  { id: 'vw-passat-2021-tdi', make: 'Volkswagen', model: 'Passat', year: 2021, variant: '2.0 TDI', consumption: 0.51, fuelType: 'Diesel' },
  { id: 'vw-tiguan-2021-tsi', make: 'Volkswagen', model: 'Tiguan', year: 2021, variant: '1.5 TSI', consumption: 0.65, fuelType: 'Bensin' },

  // Toyota
  { id: 'toyota-corolla-2022-hybrid', make: 'Toyota', model: 'Corolla', year: 2022, variant: '1.8 Hybrid', consumption: 0.45, fuelType: 'Hybrid' },
  { id: 'toyota-rav4-2022-hybrid', make: 'Toyota', model: 'RAV4', year: 2022, variant: '2.5 Hybrid AWD', consumption: 0.57, fuelType: 'Hybrid' },
  { id: 'toyota-yaris-2022-hybrid', make: 'Toyota', model: 'Yaris', year: 2022, variant: '1.5 Hybrid', consumption: 0.38, fuelType: 'Hybrid' },

  // Kia
  { id: 'kia-ceed-2022-sw', make: 'Kia', model: 'Ceed SW', year: 2022, variant: '1.5 T-GDI', consumption: 0.59, fuelType: 'Bensin' },
  { id: 'kia-niro-2022-hybrid', make: 'Kia', model: 'Niro', year: 2022, variant: '1.6 GDI Hybrid', consumption: 0.44, fuelType: 'Hybrid' },
  
  // Audi
  { id: 'audi-a4-2021-40tdi', make: 'Audi', model: 'A4', year: 2021, variant: '40 TDI quattro', consumption: 0.56, fuelType: 'Diesel' },
  { id: 'audi-a6-2021-40tdi', make: 'Audi', model: 'A6', year: 2021, variant: '40 TDI quattro', consumption: 0.59, fuelType: 'Diesel' },

  // BMW
  { id: 'bmw-320i-2021', make: 'BMW', model: '3-serie', year: 2021, variant: '320i', consumption: 0.64, fuelType: 'Bensin' },
  { id: 'bmw-520d-2021', make: 'BMW', model: '5-serie', year: 2021, variant: '520d', consumption: 0.52, fuelType: 'Diesel' },
  { id: 'bmw-x3-2020-20d', make: 'BMW', model: 'X3', year: 2020, variant: '20d xDrive', consumption: 0.62, fuelType: 'Diesel' },
  { id: 'bmw-118i-2020', make: 'BMW', model: '1-serie', year: 2020, variant: '118i', consumption: 0.59, fuelType: 'Bensin' },

  // Mercedes-Benz
  { id: 'mb-c200-2021', make: 'Mercedes-Benz', model: 'C-Klass', year: 2021, variant: 'C 200', consumption: 0.66, fuelType: 'Bensin' },
  { id: 'mb-e220d-2020', make: 'Mercedes-Benz', model: 'E-Klass', year: 2020, variant: 'E 220 d', consumption: 0.53, fuelType: 'Diesel' },
  { id: 'mb-a180-2021', make: 'Mercedes-Benz', model: 'A-Klass', year: 2021, variant: 'A 180', consumption: 0.58, fuelType: 'Bensin' },
  { id: 'mb-glc220d-2020', make: 'Mercedes-Benz', model: 'GLC', year: 2020, variant: '220 d 4MATIC', consumption: 0.65, fuelType: 'Diesel' },

  // Skoda
  { id: 'skoda-octavia-2021-tsi', make: 'Skoda', model: 'Octavia', year: 2021, variant: '1.5 TSI', consumption: 0.56, fuelType: 'Bensin' },
  { id: 'skoda-octavia-2020-tdi', make: 'Skoda', model: 'Octavia', year: 2020, variant: '2.0 TDI', consumption: 0.48, fuelType: 'Diesel' },
  { id: 'skoda-superb-2020-tdi', make: 'Skoda', model: 'Superb', year: 2020, variant: '2.0 TDI', consumption: 0.52, fuelType: 'Diesel' },
  { id: 'skoda-kodiaq-2021-tdi', make: 'Skoda', model: 'Kodiaq', year: 2021, variant: '2.0 TDI 4x4', consumption: 0.68, fuelType: 'Diesel' },
  { id: 'skoda-fabia-2022-tsi', make: 'Skoda', model: 'Fabia', year: 2022, variant: '1.0 TSI', consumption: 0.51, fuelType: 'Bensin' },

  // Peugeot
  { id: 'peugeot-208-2021', make: 'Peugeot', model: '208', year: 2021, variant: '1.2 PureTech', consumption: 0.54, fuelType: 'Bensin' },
  { id: 'peugeot-3008-2020-hdi', make: 'Peugeot', model: '3008', year: 2020, variant: '1.5 BlueHDi', consumption: 0.52, fuelType: 'Diesel' },
  { id: 'peugeot-508-2020-sw', make: 'Peugeot', model: '508 SW', year: 2020, variant: '2.0 BlueHDi', consumption: 0.55, fuelType: 'Diesel' },

  // Nissan
  { id: 'nissan-qashqai-2021', make: 'Nissan', model: 'Qashqai', year: 2021, variant: '1.3 DIG-T MHEV', consumption: 0.64, fuelType: 'Bensin' },
  { id: 'nissan-juke-2020', make: 'Nissan', model: 'Juke', year: 2020, variant: '1.0 DIG-T', consumption: 0.59, fuelType: 'Bensin' },

  // Ford
  { id: 'ford-focus-2020-ecoboost', make: 'Ford', model: 'Focus', year: 2020, variant: '1.0 EcoBoost', consumption: 0.57, fuelType: 'Bensin' },
  { id: 'ford-kuga-2021-hybrid', make: 'Ford', model: 'Kuga', year: 2021, variant: '2.5 PHEV (Bensin-läge)', consumption: 0.65, fuelType: 'Hybrid' },
  { id: 'ford-fiesta-2019', make: 'Ford', model: 'Fiesta', year: 2019, variant: '1.0 EcoBoost', consumption: 0.54, fuelType: 'Bensin' },
  { id: 'ford-mondeo-2019-tdci', make: 'Ford', model: 'Mondeo', year: 2019, variant: '2.0 TDCi', consumption: 0.58, fuelType: 'Diesel' },

  // More Volvo
  { id: 'volvo-v90-2020-d4', make: 'Volvo', model: 'V90', year: 2020, variant: 'D4 AWD', consumption: 0.61, fuelType: 'Diesel' },
  { id: 'volvo-xc90-2020-b5', make: 'Volvo', model: 'XC90', year: 2020, variant: 'B5 Diesel AWD', consumption: 0.72, fuelType: 'Diesel' },

  // More Volkswagen
  { id: 'vw-polo-2020-tsi', make: 'Volkswagen', model: 'Polo', year: 2020, variant: '1.0 TSI', consumption: 0.55, fuelType: 'Bensin' },
  { id: 'vw-touareg-2020-tdi', make: 'Volkswagen', model: 'Touareg', year: 2020, variant: '3.0 V6 TDI', consumption: 0.82, fuelType: 'Diesel' },

  // More Toyota
  { id: 'toyota-chr-2020-hybrid', make: 'Toyota', model: 'C-HR', year: 2020, variant: '1.8 Hybrid', consumption: 0.49, fuelType: 'Hybrid' },
  { id: 'toyota-avensis-2018', make: 'Toyota', model: 'Avensis', year: 2018, variant: '1.8 Valvematic', consumption: 0.65, fuelType: 'Bensin' }, // Slightly older but common

  // Renault
  { id: 'renault-clio-2020', make: 'Renault', model: 'Clio', year: 2020, variant: 'TCe 100', consumption: 0.52, fuelType: 'Bensin' },
  { id: 'renault-captur-2021', make: 'Renault', model: 'Captur', year: 2021, variant: 'E-TECH Plug-in Hybrid', consumption: 0.15, fuelType: 'Hybrid' }, // Very low WLTP for PHEV, but realistic in hybrid mode is higher. Let's use a mixed value or stick to WLTP if user charges. Let's use a conservative hybrid mode estimate for long trips: 0.50
  { id: 'renault-captur-2021-hybrid-mode', make: 'Renault', model: 'Captur', year: 2021, variant: 'E-TECH Hybrid (Bensin-läge)', consumption: 0.50, fuelType: 'Hybrid' },
  { id: 'renault-megane-2020-dci', make: 'Renault', model: 'Megane', year: 2020, variant: 'Blue dCi 115', consumption: 0.46, fuelType: 'Diesel' },

  // Hyundai
  { id: 'hyundai-i20-2021', make: 'Hyundai', model: 'i20', year: 2021, variant: '1.0 T-GDi', consumption: 0.53, fuelType: 'Bensin' },
  { id: 'hyundai-tucson-2021-hybrid', make: 'Hyundai', model: 'Tucson', year: 2021, variant: '1.6 T-GDi Hybrid', consumption: 0.57, fuelType: 'Hybrid' },
  { id: 'hyundai-kona-2020-hybrid', make: 'Hyundai', model: 'Kona', year: 2020, variant: '1.6 GDi Hybrid', consumption: 0.50, fuelType: 'Hybrid' },
  { id: 'hyundai-i30-2020', make: 'Hyundai', model: 'i30', year: 2020, variant: '1.0 T-GDi', consumption: 0.54, fuelType: 'Bensin' },

  // Seat
  { id: 'seat-leon-2020-tsi', make: 'Seat', model: 'Leon', year: 2020, variant: '1.5 eTSI', consumption: 0.56, fuelType: 'Bensin' },
  { id: 'seat-ateca-2021-tsi', make: 'Seat', model: 'Ateca', year: 2021, variant: '1.5 TSI', consumption: 0.62, fuelType: 'Bensin' },
  { id: 'seat-ibiza-2021', make: 'Seat', model: 'Ibiza', year: 2021, variant: '1.0 TSI', consumption: 0.52, fuelType: 'Bensin' },

  // Mazda
  { id: 'mazda-3-2019', make: 'Mazda', model: 'Mazda3', year: 2019, variant: '2.0 Skyactiv-G M Hybrid', consumption: 0.60, fuelType: 'Bensin' },
  { id: 'mazda-cx30-2020', make: 'Mazda', model: 'CX-30', year: 2020, variant: '2.0 Skyactiv-X M Hybrid', consumption: 0.59, fuelType: 'Bensin' },
  { id: 'mazda-cx5-2021', make: 'Mazda', model: 'CX-5', year: 2021, variant: '2.0 Skyactiv-G', consumption: 0.68, fuelType: 'Bensin' },

  // Dacia
  { id: 'dacia-duster-2021-dci', make: 'Dacia', model: 'Duster', year: 2021, variant: '1.5 Blue dCi 4x4', consumption: 0.54, fuelType: 'Diesel' },
  { id: 'dacia-sandero-2021', make: 'Dacia', model: 'Sandero', year: 2021, variant: 'TCe 90', consumption: 0.53, fuelType: 'Bensin' },

  // Tesla (Electric - consumption in kWh/10km approx equivalent to l/10km for cost if price is adjusted, but here we just store raw consumption)
  // Note: The calculator currently assumes price per liter. If we add electric, we need to handle price per kWh.
  // For now, let's stick to liquid fuel or hybrids that use l/10km.
];
