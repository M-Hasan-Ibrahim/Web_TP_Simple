const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const studentInput = qs('#searchStudent');
const moduleInput  = qs('#searchModule');
const cardsWrap    = qs('#cards');
const statusEl     = qs('#status');

function normalize(str) {
  return (str || '').toString().normalize('NFKD').toLowerCase();
}

function filter() {
  const nameQuery = normalize(studentInput.value);
  const moduleQuery = normalize(moduleInput.value);

  let shown = 0;
  qsa('.card', cardsWrap).forEach(card => {
    const name = normalize(card.dataset.name);
    const modules = normalize(card.dataset.modules);
    const matchName = !nameQuery || name.includes(nameQuery);
    const matchModule = !moduleQuery || modules.includes(moduleQuery);
    const isMatch = matchName && matchModule;

    card.classList.toggle('hidden', !isMatch);
    if (isMatch) shown++;
  });

  statusEl.classList.toggle('hidden', shown > 0);
}

studentInput.addEventListener('input', filter);
moduleInput.addEventListener('input', filter);

filter();