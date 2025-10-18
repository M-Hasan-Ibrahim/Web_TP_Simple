const PREFERRED = ['USD','EUR', 'LBP'];

const LIVE_API = (base) => `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
const FETCH_TIMEOUT_MS = 6000;

const SYMBOLS = {
  USD: 'United States Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  SAR: 'Saudi Riyal',
  EGP: 'Egyptian Pound',
  LBP: 'Lebanese Pound',
  BRL: 'Brazilian Real',
  TRY: 'Turkish Lira'
};


let lastBase = null;
let lastRates = null;
let lastDate = null;

async function fetchWithTimeout(url, ms){
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), ms);
  try{
    return await fetch(url, { signal: ctrl.signal, cache:'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

async function getRates(base){
  if (lastBase === base && lastRates){
    return { rates:lastRates, date:lastDate, source:'cache' };
  }

  try{
    const res = await fetchWithTimeout(LIVE_API(base), FETCH_TIMEOUT_MS);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if (data && data.result === 'success' && data.base_code === base && data.rates){
      lastBase = base;
      lastRates = data.rates;
      lastDate = data.time_last_update_utc || data.time_last_update || data.time_last_update_unix || '—';
      return { rates:lastRates, date:lastDate, source:'live' };
    }
    throw new Error('Unexpected response');
  } catch (_) {
    const EUR_TO_USD = 1.20;

    if (base === 'EUR'){
      const limited = { EUR: 1, USD: EUR_TO_USD };
      lastBase = 'EUR';
      lastRates = limited;
      lastDate = 'offline-fixed';
      return { rates: limited, date: lastDate, source: 'offline-fixed' };
    }

    if (base === 'USD'){
      const limited = { USD: 1, EUR: 1 / EUR_TO_USD };
      lastBase = 'USD';
      lastRates = limited;
      lastDate = 'offline-fixed';
      return { rates: limited, date: lastDate, source: 'offline-fixed' };
    }

    const msg = 'You are offline. Please connect to the internet. You can only convert from EUR to USD or vice versa.';
    throw new Error(msg);
  }
}

async function convert(amount, from, to){
  const { rates, date, source } = await getRates(from);
  const rate = rates[to];
  if (typeof rate !== 'number') {
    if (source === 'offline-fixed') {
      throw new Error('You are offline. Please connect to the internet. You can only convert from EUR to USD or vice versa.');
    }
    throw new Error(`No rate ${from}→${to}`);
  }
  return { result: amount * rate, rate, date, source };
}
