/* Prancha de teste — aplica a variante escolhida no protótipo.
   A escolha vive em localStorage; index.html lê a mesma chave ao abrir. */

const VARIANT_KEY = 'fz-stage-card';
const VARIANT_NAMES = { a: 'Verde pálido', b: 'Roxo sólido', c: 'Lilás claro', d: 'Papel com acento', e: 'Lilás cheio', f: 'Verde pontual' };

const statusEl = document.getElementById('apply-status');
const resetEl = document.getElementById('reset-variant');
const openEl = document.getElementById('open-proto');
const toastEl = document.getElementById('v-toast');
let toastTimer;

function readVariant() {
  try {
    const value = localStorage.getItem(VARIANT_KEY);
    return value && VARIANT_NAMES[value] ? value : '';
  } catch {
    return '';
  }
}

function writeVariant(value) {
  try {
    if (value) localStorage.setItem(VARIANT_KEY, value);
    else localStorage.removeItem(VARIANT_KEY);
  } catch {
    /* Armazenamento indisponível: a prancha continua funcionando como amostra. */
  }
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3600);
}

function syncVariant() {
  const current = readVariant();

  document.querySelectorAll('.v-apply').forEach((button) => {
    const key = button.dataset.apply;
    const isOn = key === current;
    button.setAttribute('aria-pressed', String(isOn));
    button.textContent = isOn ? 'Em uso no protótipo' : 'Aplicar no protótipo';
    button.setAttribute('aria-label', isOn
      ? `Variante ${key.toUpperCase()}, ${VARIANT_NAMES[key]}, em uso no protótipo`
      : `Aplicar variante ${key.toUpperCase()}, ${VARIANT_NAMES[key]}, no protótipo`);
  });

  document.querySelectorAll('.v-item').forEach((item) => {
    item.classList.toggle('is-applied', item.dataset.item === current);
  });

  resetEl.hidden = !current;
  statusEl.classList.toggle('is-on', Boolean(current));
  statusEl.textContent = current
    ? `Variante ${current.toUpperCase()} · ${VARIANT_NAMES[current]} aplicada. Abra o protótipo na etapa 1 para ver na jornada.`
    : 'Nenhuma variante aplicada — o protótipo segue com o card atual.';

  openEl.href = `index.html${current ? `?card=${current}` : ''}#etapa-1`;
}

document.querySelectorAll('.v-apply').forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.apply;
    writeVariant(key);
    syncVariant();
    showToast(`Variante ${key.toUpperCase()} aplicada · abra o protótipo para ver.`);
  });
});

resetEl.addEventListener('click', () => {
  writeVariant('');
  syncVariant();
  showToast('Protótipo de volta ao card original.');
});

syncVariant();
