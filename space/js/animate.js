const ship = document.getElementById('ship');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const speedRange = document.getElementById('speedRange');
const flipBtn = document.getElementById('flipBtn');

let timer = null;

let angleRad = 0;     
let dirX = +1;        
let dirY = +1;        

const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const px = n => `${Math.round(n)}px`;

function dims(){
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  const sw = ship.clientWidth  || 56;
  const sh = ship.clientHeight || 56;
  return { cw, ch, sw, sh, maxLeft: cw - sw, maxTop: ch - sh };
}

function setFacing(){
  ship.style.transform = `scaleX(${dirX > 0 ? 1 : -1})`;
}

function initPositionAndHeading(){
  const { ch, sh } = dims();

  ship.style.left = '0px';
  ship.style.top  = px(clamp((ch - sh) / 2, 0, ch - sh));

  const angleDeg = 25 + Math.random() * 10; 
  angleRad = angleDeg * (Math.PI / 180);

  dirX = +1;
  dirY = Math.random() < 0.5 ? -1 : +1;

  setFacing();
}

function currentLeft(){
  const v = parseFloat(ship.style.left || '0');
  return isNaN(v) ? 0 : v;
}
function currentTop(){
  const v = parseFloat(ship.style.top || '0');
  return isNaN(v) ? 0 : v;
}

function step(){
  const { maxLeft, maxTop } = dims();

  const pxPerSec = parseInt(speedRange.value, 10) || 250;
  const dt = 16;
  const stepLen = (pxPerSec * dt) / 1000;

  const dx = Math.cos(angleRad) * stepLen * dirX;
  const dy = Math.sin(angleRad) * stepLen * dirY;

  let nextLeft = currentLeft() + dx;
  let nextTop  = currentTop()  + dy;

  const margin = 1;

  const jitter = 5 * DEG;

  if (nextLeft >= maxLeft) {
    nextLeft = maxLeft;
    dirX = -1;
    angleRad = clamp(angleRad + (Math.random()*2 - 1)*jitter, 5*DEG, 60*DEG)
    setFacing();
  } else if (nextLeft <= 0) {
    nextLeft = 0;
    dirX = +1;
    angleRad = clamp(angleRad + (Math.random()*2 - 1)*jitter, 5*DEG, 60*DEG)
    setFacing();
  }


  if (nextTop >= maxTop - margin) {
    nextTop = maxTop - margin;
    dirY = -1;
    angleRad = clamp(angleRad + (Math.random()*2 - 1)*jitter, 5*DEG, 60*DEG); // <-- add this
  } else if (nextTop <= margin) {
    nextTop = margin;
    dirY = +1;
    angleRad = clamp(angleRad + (Math.random()*2 - 1)*jitter, 5*DEG, 60*DEG); // <-- add this
  }


  ship.style.left = px(nextLeft);
  ship.style.top  = px(nextTop);
}

function start(){
  if (timer) return;
  timer = setInterval(step, 16);
}

function stop(){
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

function flip(){
  dirX *= -1;
  setFacing();
}


startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);
flipBtn.addEventListener('click', flip);

function boot(){
  initPositionAndHeading();
  start();
}
if (ship.complete && ship.naturalWidth > 0) {
  window.addEventListener('load', boot);
} else {
  ship.addEventListener('load', () => boot(), { once:true });
  window.addEventListener('load', () => { if (!timer) boot(); });
}
