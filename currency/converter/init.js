function init(){
  const fromSel = $('from');
  const toSel = $('to');

  populateSelect(fromSel, SYMBOLS);
  populateSelect(toSel, SYMBOLS);

  const opts = Array.from(fromSel.options).map(o => o.value);
  fromSel.value = opts.includes('EUR') ? 'EUR' : opts[0];
  toSel.value   = opts.includes('USD') ? 'USD' : (opts[1] || opts[0]);

  const amountEl = $('amount');
  if (amountEl) amountEl.value = '100';
  updateToSymbol(toSel.value);

  $('convertBtn')?.addEventListener('click', handleConversion);
  $('autoUpdate')?.addEventListener('change', handleAutoUpdate);

  updateResult();
}

document.addEventListener('DOMContentLoaded', init);
