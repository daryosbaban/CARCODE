// Thin wrapper around NHTSA's free, public vPIC API (US Dept. of Transportation).
// https://vpic.nhtsa.dot.gov/api/ — public domain government data, no key required.
// Network calls fail closed: callers must handle rejection and fall back to local data.

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';
const TIMEOUT_MS = 6000;

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`NHTSA request failed (${res.status})`);
  return res.json();
}

async function decodeVinNHTSA(vin) {
  const data = await fetchJson(`${NHTSA_BASE}/decodevinvalues/${encodeURIComponent(vin)}?format=json`);
  const row = data.Results && data.Results[0];
  if (!row || (!row.Make && !row.ErrorText)) throw new Error('NHTSA: empty response');
  if (row.ErrorCode && row.ErrorCode !== '0') {
    return { valid: false, reason: row.ErrorText || 'رقم هيكل غير صالح' };
  }
  return {
    valid: true,
    source: 'nhtsa',
    make: row.Make || null,
    model: row.Model || null,
    year: row.ModelYear ? parseInt(row.ModelYear, 10) : null,
    bodyClass: row.BodyClass || null,
    vehicleType: row.VehicleType || null,
    engineCylinders: row.EngineCylinders || null,
    fuelType: row.FuelTypePrimary || null,
    plantCountry: row.PlantCountry || null,
    driveType: row.DriveType || null,
  };
}

async function getAllMakes() {
  const data = await fetchJson(`${NHTSA_BASE}/getallmakes?format=json`);
  return (data.Results || []).map((r) => r.Make_Name).filter(Boolean);
}

async function getModelsForMakeYear(make, year) {
  const data = await fetchJson(
    `${NHTSA_BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${encodeURIComponent(year)}?format=json`
  );
  return (data.Results || []).map((r) => r.Model_Name).filter(Boolean);
}

module.exports = { decodeVinNHTSA, getAllMakes, getModelsForMakeYear };
