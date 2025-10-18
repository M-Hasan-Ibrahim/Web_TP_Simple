function $(id){ 
    return document.getElementById(id); 
}

function formatNumber(n, d=2){
  if (typeof n !== 'number' || !isFinite(n)) return '0.00';
  return n.toLocaleString(undefined, {minimumFractionDigits:d, maximumFractionDigits:d});
}

function showError(msg){ 
    const e=$('error'); 
    if(!e) return; 
    e.textContent=msg; 
    e.style.display='block'; 
}

function clearError(){ 
    const e=$('error'); 
    if(!e) return; 
    e.textContent=''; 
    e.style.display='none'; 
}

function info(msg){ 
    const n=$('rateNote'); 
    if(n) n.textContent = msg; 
}

function currencySymbolGuess(code){
  const map = {
    USD: '$',         
    EUR: '€',         
    GBP: '£',         
    JPY: '¥',         
    CAD: '$',         
    AUD: '$',          
    SAR: 'ريال',         
    EGP: 'ج.م',         
    LBP: 'ل.ل',         
    BRL: 'R$',         
    TRY: '₺'           
  };
  return map[code] || '';
}

function updateToSymbol(code){ 
    const el=$('toSymbol'); 
    if(el) el.textContent = currencySymbolGuess(code) || ''; 
}

function populateSelect(select, symbols){
  if (!select) return;
  select.innerHTML = '';
  const codes = Object.keys(symbols).sort();
  const prefSet = new Set(PREFERRED.filter(c => symbols[c]));
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


async function updateResult(){
  clearError();
  const amountEl = $('amount'), fromEl = $('from'), toEl = $('to');
  if (!amountEl || !fromEl || !toEl) return;

  const amount = parseFloat(amountEl.value);
  const from = fromEl.value;
  const to = toEl.value;

  if (isNaN(amount) || amount < 0){ 
    showError('Enter a valid non-negative amount.'); 
    return;
  }

  try{
    const { result, rate, date, source } = await convert(amount, from, to);

    if (source === 'offline-fixed') {
      alert('⚠️ You are offline.\nOnly EUR ↔ USD is available (fixed rate: 1 EUR = 1.20 USD).');
    }

    const resEl = $('result');
    if (resEl) {
        resEl.textContent = formatNumber(result, 2);
    }
    const noteEl = $('rateNote');
    if (noteEl) {
      if (source === 'offline-fixed') {
        noteEl.textContent = 'You are offline. Only EUR <-> USD is available (fixed rate: 1 EUR = 1.20 USD).';
      } else {
        noteEl.textContent = `Rate: 1 ${from} ≈ ${formatNumber(rate, 6)} ${to} (${source === 'live' ? 'live' : source} @ ${date})`;
      }
    }

    updateToSymbol(to);

  } catch(e){
    const msg = e.message || 'Conversion failed.';
    if (/offline/i.test(msg)) {
      alert('⚠️ You are offline.\nOnly EUR <-> USD is available (fixed rate: 1 EUR = 1.20 USD).');
    }
    showError(msg);
  }
}



function handleAutoUpdate(){
  const auto = $('autoUpdate')?.checked;
  const amountInput = $('amount');
  const fromSel = $('from');
  const toSel = $('to');
  if (amountInput){
    amountInput.oninput = null;
  } 
  
  if (fromSel) {
    fromSel.onchange = null;
  }
  
  if (toSel){
    toSel.onchange = null;
  } 

  if (auto){
    if (amountInput){
        amountInput.oninput = updateResult;
    } 

    if (fromSel){
        fromSel.onchange = updateResult;
    }

    if (toSel){
        toSel.onchange = updateResult;
    } 
  }
}

function handleConversion(){ 
    updateResult(); 
}
