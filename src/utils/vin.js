// Decodes only the public, standardized parts of a VIN (ISO 3779 / SAE J853):
// World Manufacturer Identifier (positions 1-3) and model year (position 10).
// This uses openly published industry standards, not any third-party database.

const WMI_BRANDS = {
  KNA: 'Kia', KND: 'Kia', KNC: 'Kia', KNE: 'Kia', KNM: 'Kia',
  KMH: 'Hyundai', KM8: 'Hyundai', KMJ: 'Hyundai',
  JT: 'Toyota', JTD: 'Toyota', JTN: 'Toyota', '4T1': 'Toyota', '5TD': 'Toyota',
  JHM: 'Honda', '1HG': 'Honda', '2HG': 'Honda', SHH: 'Honda',
  JN1: 'Nissan', JN8: 'Nissan', '1N4': 'Nissan', '5N1': 'Nissan',
  '1FA': 'Ford', '1FT': 'Ford', '3FA': 'Ford', WF0: 'Ford',
  '1G1': 'Chevrolet', '1GC': 'Chevrolet', KL1: 'Chevrolet',
  JM1: 'Mazda', JM3: 'Mazda', '4F2': 'Mazda',
};

const YEAR_CODES = {
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016, H: 2017,
  J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025,
  T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
  1: 2001, 2: 2002, 3: 2003, 4: 2004, 5: 2005, 6: 2006, 7: 2007, 8: 2008, 9: 2009,
};

function decodeVin(vin) {
  if (!vin || typeof vin !== 'string') return null;
  const clean = vin.trim().toUpperCase();
  if (clean.length !== 17) return { valid: false, reason: 'يجب أن يتكون رقم الهيكل (VIN) من 17 رمزاً' };

  const wmi3 = clean.slice(0, 3);
  const wmi2 = clean.slice(0, 2);
  const brand = WMI_BRANDS[wmi3] || WMI_BRANDS[wmi2] || null;
  const yearChar = clean[9];
  const year = YEAR_CODES[yearChar] || null;

  return { valid: true, vin: clean, brand, year, wmi: wmi3 };
}

module.exports = { decodeVin };
