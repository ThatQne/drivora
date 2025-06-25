interface CarData {
  make: string;
  models: string[];
  basePrice: number; // Base price for a 2020 model with average mileage
}

interface ValuationResult {
  estimatedValue: number;
  priceRange: {
    low: number;
    high: number;
  };
  factors: {
    year: number;
    mileage: number;
    condition: number;
  };
}

// Comprehensive car database with realistic pricing
const CAR_DATABASE: CarData[] = [
  { make: 'Acura', models: ['ILX', 'TLX', 'RLX', 'MDX', 'RDX', 'NSX', 'Integra', 'ZDX'], basePrice: 28000 },
  { make: 'Alfa Romeo', models: ['Giulia', 'Stelvio', '4C', 'Tonale'], basePrice: 35000 },
  { make: 'Aston Martin', models: ['Vantage', 'DB11', 'DBS', 'DBX', 'Valkyrie'], basePrice: 180000 },
  { make: 'Audi', models: ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'R8', 'e-tron GT', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'SQ5', 'SQ7', 'SQ8'], basePrice: 40000 },
  { make: 'Bentley', models: ['Continental', 'Flying Spur', 'Bentayga', 'Mulsanne'], basePrice: 220000 },
  { make: 'BMW', models: ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'i3', 'i4', 'i7', 'i8', 'iX', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'X3 M', 'X4 M', 'X5 M', 'X6 M'], basePrice: 45000 },
  { make: 'Buick', models: ['Encore', 'Encore GX', 'Envision', 'Enclave', 'Regal', 'LaCrosse'], basePrice: 28000 },
  { make: 'Cadillac', models: ['ATS', 'CTS', 'CT4', 'CT5', 'CT6', 'XT4', 'XT5', 'XT6', 'Escalade', 'Lyriq', 'Celestiq'], basePrice: 42000 },
  { make: 'Chevrolet', models: ['Spark', 'Sonic', 'Cruze', 'Malibu', 'Impala', 'Camaro', 'Corvette', 'Trax', 'Equinox', 'Blazer', 'Traverse', 'Tahoe', 'Suburban', 'Colorado', 'Silverado 1500', 'Silverado 2500HD', 'Silverado 3500HD', 'Bolt EV', 'Bolt EUV'], basePrice: 32000 },
  { make: 'Chrysler', models: ['300', 'Pacifica', 'Voyager', 'Aspen'], basePrice: 30000 },
  { make: 'Dodge', models: ['Charger', 'Challenger', 'Durango', 'Journey', 'Grand Caravan', 'Dart', 'Viper', 'Hornet'], basePrice: 33000 },
  { make: 'Ferrari', models: ['488', 'F8', 'SF90', 'Roma', 'Portofino', 'LaFerrari', '812', 'F12', 'California', 'GTC4Lusso', 'Purosangue'], basePrice: 280000 },
  { make: 'Fiat', models: ['500', '500X', '500L', '124 Spider'], basePrice: 22000 },
  { make: 'Ford', models: ['Fiesta', 'Focus', 'Fusion', 'Mustang', 'Taurus', 'EcoSport', 'Escape', 'Edge', 'Explorer', 'Expedition', 'Ranger', 'F-150', 'F-250', 'F-350', 'F-450', 'Bronco', 'Bronco Sport', 'Maverick', 'Lightning', 'Mustang Mach-E', 'Transit'], basePrice: 35000 },
  { make: 'Genesis', models: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'], basePrice: 48000 },
  { make: 'GMC', models: ['Terrain', 'Acadia', 'Yukon', 'Yukon XL', 'Canyon', 'Sierra 1500', 'Sierra 2500HD', 'Sierra 3500HD', 'Hummer EV'], basePrice: 38000 },
  { make: 'Honda', models: ['Fit', 'Civic', 'Insight', 'Accord', 'CR-V', 'HR-V', 'Passport', 'Pilot', 'Ridgeline', 'Odyssey', 'Clarity'], basePrice: 28000 },
  { make: 'Hyundai', models: ['Accent', 'Elantra', 'Sonata', 'Azera', 'Veloster', 'Venue', 'Kona', 'Tucson', 'Santa Fe', 'Santa Cruz', 'Palisade', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Genesis'], basePrice: 26000 },
  { make: 'Infiniti', models: ['Q50', 'Q60', 'Q70', 'QX30', 'QX50', 'QX60', 'QX80'], basePrice: 38000 },
  { make: 'Jaguar', models: ['XE', 'XF', 'XJ', 'F-Type', 'E-Pace', 'F-Pace', 'I-Pace'], basePrice: 45000 },
  { make: 'Jeep', models: ['Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Gladiator', 'Renegade', 'Avenger', 'Grand Wagoneer', 'Wagoneer'], basePrice: 35000 },
  { make: 'Kia', models: ['Rio', 'Forte', 'Optima', 'K5', 'Stinger', 'Soul', 'Seltos', 'Sportage', 'Sorento', 'Telluride', 'Carnival', 'Niro', 'EV6'], basePrice: 25000 },
  { make: 'Lamborghini', models: ['Huracan', 'Aventador', 'Urus', 'Gallardo', 'Murcielago', 'Revuelto'], basePrice: 250000 },
  { make: 'Land Rover', models: ['Discovery Sport', 'Discovery', 'Range Rover Evoque', 'Range Rover Velar', 'Range Rover Sport', 'Range Rover', 'Defender'], basePrice: 55000 },
  { make: 'Lexus', models: ['IS', 'ES', 'GS', 'LS', 'RC', 'LC', 'UX', 'NX', 'RX', 'GX', 'LX', 'CT', 'RZ'], basePrice: 42000 },
  { make: 'Lincoln', models: ['MKZ', 'Continental', 'Corsair', 'Nautilus', 'Aviator', 'Navigator'], basePrice: 45000 },
  { make: 'Lotus', models: ['Evija', 'Emira', 'Elise', 'Exige', 'Evora'], basePrice: 95000 },
  { make: 'Maserati', models: ['Ghibli', 'Quattroporte', 'Levante', 'GranTurismo', 'GranCabrio', 'MC20'], basePrice: 85000 },
  { make: 'Mazda', models: ['Mazda3', 'Mazda6', 'MX-5 Miata', 'CX-3', 'CX-30', 'CX-5', 'CX-9', 'CX-50', 'CX-90'], basePrice: 26000 },
  { make: 'McLaren', models: ['570S', '720S', '765LT', 'Artura', 'GT', 'Senna', 'P1'], basePrice: 220000 },
  { make: 'Mercedes-Benz', models: ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLS', 'SL', 'SLC', 'AMG GT', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'EQC', 'EQS', 'EQE', 'EQA', 'EQB'], basePrice: 48000 },
  { make: 'Mini', models: ['Cooper', 'Cooper Countryman', 'Cooper Clubman', 'Cooper Paceman'], basePrice: 28000 },
  { make: 'Mitsubishi', models: ['Mirage', 'Lancer', 'Eclipse Cross', 'Outlander', 'Outlander Sport'], basePrice: 24000 },
  { make: 'Nissan', models: ['Versa', 'Sentra', 'Altima', 'Maxima', '370Z', '400Z', 'GT-R', 'Kicks', 'Rogue', 'Murano', 'Pathfinder', 'Armada', 'Frontier', 'Titan', 'Leaf', 'Ariya'], basePrice: 28000 },
  { make: 'Polestar', models: ['1', '2', '3', '4'], basePrice: 48000 },
  { make: 'Porsche', models: ['718 Boxster', '718 Cayman', '911', 'Panamera', 'Macan', 'Cayenne', 'Taycan'], basePrice: 75000 },
  { make: 'Ram', models: ['1500', '2500', '3500', 'ProMaster', 'ProMaster City'], basePrice: 38000 },
  { make: 'Rolls-Royce', models: ['Ghost', 'Wraith', 'Dawn', 'Phantom', 'Cullinan', 'Spectre'], basePrice: 350000 },
  { make: 'Subaru', models: ['Impreza', 'Legacy', 'Outback', 'Forester', 'Crosstrek', 'Ascent', 'WRX', 'BRZ'], basePrice: 28000 },
  { make: 'Tesla', models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck', 'Roadster'], basePrice: 45000 },
  { make: 'Toyota', models: ['Yaris', 'Corolla', 'Camry', 'Avalon', 'Prius', 'C-HR', 'RAV4', 'Venza', 'Highlander', '4Runner', 'Sequoia', 'Land Cruiser', 'Tacoma', 'Tundra', 'Sienna', 'Supra', '86', 'bZ4X'], basePrice: 30000 },
  { make: 'Volkswagen', models: ['Jetta', 'Passat', 'Arteon', 'Golf', 'GTI', 'Golf R', 'Beetle', 'Tiguan', 'Atlas', 'Atlas Cross Sport', 'ID.4'], basePrice: 28000 },
  { make: 'Volvo', models: ['S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'C40', 'EX30', 'EX90'], basePrice: 42000 }
];

// Condition multipliers
const CONDITION_MULTIPLIERS = {
  excellent: 1.15,
  good: 1.0,
  fair: 0.85,
  poor: 0.65
};

// Year depreciation (per year from 2024)
const YEAR_DEPRECIATION = 0.12; // 12% per year

// Mileage impact (per 1000 miles over 12k/year average)
const MILEAGE_IMPACT = 0.0008; // 0.08% per 1000 miles

export class CarValuationService {
  static getPopularMakes(): string[] {
    return CAR_DATABASE.map(car => car.make).sort();
  }

  static getModelsForMake(make: string): string[] {
    const carData = CAR_DATABASE.find(car => car.make.toLowerCase() === make.toLowerCase());
    return carData ? carData.models.sort() : [];
  }

  static async getValuation(
    make: string,
    model: string,
    year: number,
    mileage: number,
    condition: 'excellent' | 'good' | 'fair' | 'poor'
  ): Promise<ValuationResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const carData = CAR_DATABASE.find(car => car.make.toLowerCase() === make.toLowerCase());
    if (!carData) {
      throw new Error('Make not found');
    }

    if (!carData.models.some(m => m.toLowerCase() === model.toLowerCase())) {
      throw new Error('Model not found for this make');
    }

    // Calculate base price for the year
    const currentYear = new Date().getFullYear();
    const yearsOld = currentYear - year;
    const yearFactor = Math.pow(1 - YEAR_DEPRECIATION, yearsOld);

    // Calculate mileage impact
    const expectedMileage = (currentYear - year) * 12000; // 12k miles per year
    const excessMileage = Math.max(0, mileage - expectedMileage);
    const mileageFactor = 1 - (excessMileage / 1000 * MILEAGE_IMPACT);

    // Apply condition multiplier
    const conditionFactor = CONDITION_MULTIPLIERS[condition];

    // Calculate final value
    let estimatedValue = carData.basePrice * yearFactor * mileageFactor * conditionFactor;

    // Add some luxury car premiums
    if (['Ferrari', 'Lamborghini', 'McLaren', 'Rolls-Royce', 'Bentley', 'Aston Martin'].includes(make)) {
      estimatedValue *= 1.2; // Luxury premium
    }

    // Electric car adjustments
    if (['Tesla', 'Polestar'].includes(make) || 
        ['Leaf', 'Bolt EV', 'Bolt EUV', 'Mustang Mach-E', 'Lightning', 'i3', 'i4', 'iX', 'EQC', 'EQS', 'EQE', 'Ioniq 5', 'Ioniq 6', 'EV6', 'ID.4', 'Taycan', 'e-tron GT'].includes(model)) {
      if (yearsOld < 3) {
        estimatedValue *= 1.1; // New EV premium
      } else {
        estimatedValue *= 0.9; // EV depreciation concern
      }
    }

    // Ensure minimum value
    estimatedValue = Math.max(estimatedValue, 1000);

    const priceRange = {
      low: Math.round(estimatedValue * 0.85),
      high: Math.round(estimatedValue * 1.15)
    };

    return {
      estimatedValue: Math.round(estimatedValue),
      priceRange,
      factors: {
        year: Math.round(yearFactor * 100),
        mileage: Math.round(mileageFactor * 100),
        condition: Math.round(conditionFactor * 100)
      }
    };
  }

  // Get a quick estimate without full calculation
  static getQuickEstimate(make: string, model: string, year: number): number {
    const carData = CAR_DATABASE.find(car => car.make.toLowerCase() === make.toLowerCase());
    if (!carData) return 15000; // Default fallback

    const currentYear = new Date().getFullYear();
    const yearsOld = currentYear - year;
    
    // Simple depreciation for all cars
    const yearFactor = Math.pow(1 - YEAR_DEPRECIATION, yearsOld);
    return Math.round(carData.basePrice * yearFactor);
  }


} 