
// ===== CONFIG =====
const EXCLUDED = new Set(['ILS']); // hide from lists
const PREFERRED = ['USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','AED','SAR','EGP'];

// Primary live API (no key, CORS-friendly)
const LIVE_API = (base) => `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
const FETCH_TIMEOUT_MS = 6000;

// Offline fallback (rough sample rates; update anytime). Base = USD.
const OFFLINE_USD = {
  USD:1, EUR:0.92, GBP:0.78, JPY:151.0, CAD:1.36, AUD:1.53, CHF:0.86, CNY:7.10,
  AED:3.67, SAR:3.75, EGP:51.0, SEK:10.7, NOK:10.9, DKK:6.86, PLN:3.95, CZK:23.5,
  HUF:365, RON:4.58, TRY:34.0, ARS:980, MXN:18.2, BRL:5.5, ZAR:18.3, NZD:1.68,
  SGD:1.34, HKD:7.80, INR:83.2, KRW:1370, THB:36.2, VND:24400
};

// ===== UTIL =====
function formatNumber(n, d=2){
  if (typeof n !== 'number' || !isFinite(n)) return '0.00';
  return n.toLocaleString(undefined, {minimumFractionDigits:d, maximumFractionDigits:d});
}
function $(id){ return document.getElementById(id); }
function showError(msg){ const e=$('error'); e.textContent=msg; e.style.display='block'; }
function clearError(){ const e=$('error'); e.textContent=''; e.style.display='none'; }
function info(msg){ $('rateNote').textContent = msg; }

function currencySymbolGuess(code){
  const map = { USD:'$', EUR:'€', GBP:'£', JPY:'¥', CNY:'¥', INR:'₹', RUB:'₽', KRW:'₩', NGN:'₦', THB:'฿', VND:'₫',
                UAH:'₴', EGP:'£', AED:'د.إ', SAR:'﷼', KWD:'د.ك', QAR:'ر.ق', OMR:'ر.ع.', CAD:'$', AUD:'$', NZD:'$',
                HKD:'$', SGD:'$', CHF:'Fr', SEK:'kr', NOK:'kr', DKK:'kr', PLN:'zł', CZK:'Kč', HUF:'Ft', RON:'lei',
                TRY:'₺', ARS:'$', MXN:'$', BRL:'R$', ZAR:'R' };
  return map[code] || '';
}
function updateToSymbol(code){ $('toSymbol').textContent = currencySymbolGuess(code) || ''; }

function addLoading(select){
  select.innerHTML = '';
  const o = document.createElement('option');
  o.value = ''; o.textContent = 'Loading...';
  select.appendChild(o);
}

function populateSelect(select, symbols){
  select.innerHTML = '';
  const codes = Object.keys(symbols).filter(c => !EXCLUDED.has(c)).sort();
  const prefSet = new Set(PREFERRED.filter(c => symbols[c] && !EXCLUDED.has(c)));
  const ordered = [
    ...PREFERRED.filter(c => prefSet.has(c)),
    ...codes.filter(c => !prefSet.has(c))
  ];
  for (const code of ordered){
    const opt = document.createElement('option');
    const desc = symbols[code] || code;
    opt.value = code; opt.textContent = `${code} — ${desc}`;
    select.appendChild(opt);
  }
}

// ===== SYMBOLS (no network needed) =====
// Simple, reliable list (no API). Add more as needed.
const SYMBOLS = {
  USD:'United States Dollar', EUR:'Euro', GBP:'British Pound', JPY:'Japanese Yen',
  CAD:'Canadian Dollar', AUD:'Australian Dollar', CHF:'Swiss Franc', CNY:'Chinese Yuan',
  AED:'UAE Dirham', SAR:'Saudi Riyal', EGP:'Egyptian Pound', SEK:'Swedish Krona',
  NOK:'Norwegian Krone', DKK:'Danish Krone', PLN:'Polish Złoty', CZK:'Czech Koruna',
  HUF:'Hungarian Forint', RON:'Romanian Leu', TRY:'Turkish Lira', ARS:'Argentine Peso',
  MXN:'Mexican Peso', BRL:'Brazilian Real', ZAR:'South African Rand', NZD:'New Zealand Dollar',
  SGD:'Singapore Dollar', HKD:'Hong Kong Dollar', INR:'Indian Rupee', KRW:'South Korean Won',
  THB:'Thai Baht', VND:'Vietnamese Đồng'
};

// ===== RATES CACHE =====
let lastBase = null;
let lastRates = null;   // { CODE: rateVsBase }
let lastDate = null;    // ISO date/time from API or "offline"

// Fetch with timeout
async function fetchWithTimeout(url, ms){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), ms);
  try{
    const res = await fetch(url, {signal: ctrl.signal, cache:'no-store'});
    return res;
  } finally { clearTimeout(t); }
}

// Get live rates for a base code, else offline fallback
async function getRates(base){
  // If we already have matching base cached, reuse
  if (lastBase === base && lastRates) return { rates:lastRates, date:lastDate, source:'cache' };

  // Try network
  try{
    const res = await fetchWithTimeout(LIVE_API(base), FETCH_TIMEOUT_MS);
    if (!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    // API format: { result:'success', base_code:'USD', time_last_update_utc:'...', rates:{ EUR:0.92, ... } }
    if (data && data.result === 'success' && data.base_code === base && data.rates){
      lastBase = base;
      lastRates = data.rates;
      lastDate = data.time_last_update_utc || data.time_last_update || data.time_last_update_unix || '—';
      return { rates:lastRates, date:lastDate, source:'live' };
    }
    throw new Error('Unexpected response');
  } catch(_){
    // Offline fallback via USD cross-rates
    if (!OFFLINE_USD[base]){
      // compute base→X from USD table: rate(base→X) = OFFLINE_USD[X] / OFFLINE_USD[base]
      // if base not in OFFLINE_USD, degrade to USD
      base = 'USD';
    }
    const makeRatesFromUSD = (b) => {
      const r = {};
      for (const c of Object.keys(OFFLINE_USD)){
        r[c] = OFFLINE_USD[c] / OFFLINE_USD[b]; // base->c
      }
      r[b] = 1;
      return r;
    };
    const offlineRates = makeRatesFromUSD(base);
    lastBase = base;
    lastRates = offlineRates;
    lastDate = 'offline';
    return { rates: lastRates, date: lastDate, source:'offline' };
  }
}

// Convert amount using (possibly) different bases:
// If current cache base matches `from`, just multiply by rates[to].
// If not, fetch base=`from`. If offline, we’ll build from USD fallback.
async function convert(amount, from, to){
  const { rates, date, source } = await getRates(from);
  const rate = rates[to];
  if (typeof rate !== 'number') throw new Error(`No rate ${from}→${to}`);
  return { result: amount * rate, rate, date, source };
}

// ===== UI HANDLERS =====
async function updateResult(){
  clearError();
  const amount = parseFloat($('amount').value);
  const from = $('from').value;
  const to = $('to').value;
  if (isNaN(amount) || amount < 0){ showError('Enter a valid non-negative amount.'); return; }
  try{
    const { result, rate, date, source } = await convert(amount, from, to);
    $('result').textContent = formatNumber(result, 2);
    $('rateNote').textContent = `Rate: 1 ${from} ≈ ${formatNumber(rate, 6)} ${to} (${source === 'live' ? 'live' : source} @ ${date})`;
    updateToSymbol(to);
  }catch(e){
    showError(e.message || 'Conversion failed.');
  }
}

function handleAutoUpdate(){
  const auto = $('autoUpdate').checked;
  const amountInput = $('amount');
  const fromSel = $('from');
  const toSel = $('to');
  amountInput.oninput = null; fromSel.onchange = null; toSel.onchange = null;
  if (auto){ amountInput.oninput = updateResult; fromSel.onchange = updateResult; toSel.onchange = updateResult; }
}

function handleConversion(){ updateResult(); }

// ===== INIT =====
function init(){
  const fromSel = $('from');
  const toSel = $('to');
  addLoading(fromSel); addLoading(toSel);

  // Populate from static list (instant, no network)
  populateSelect(fromSel, SYMBOLS);
  populateSelect(toSel, SYMBOLS);

  // Defaults (avoid excluded)
  const opts = Array.from(fromSel.options).map(o => o.value);
  fromSel.value = opts.includes('EUR') ? 'EUR' : opts[0];
  toSel.value   = opts.includes('USD') ? 'USD' : (opts[1] || opts[0]);

  $('amount').value = '100';
  updateToSymbol(toSel.value);

  $('convertBtn').addEventListener('click', handleConversion);
  $('autoUpdate').addEventListener('change', handleAutoUpdate);

  // First run
  updateResult();

  // Tip for file:// usage
  // If you open via file:// some setups block fetch — running a tiny local server avoids that.
  // python -m http.server 8000  →  http://localhost:8000/yourfile.html
}

document.addEventListener('DOMContentLoaded', init);
