// animate.js — diagonal start (15–25°), vector motion + clean bounces

(function(){
  const ship       = document.getElementById('ship');
  const canvas     = document.getElementById('canvas');
  const startBtn   = document.getElementById('startBtn');
  const stopBtn    = document.getElementById('stopBtn');
  const speedRange = document.getElementById('speedRange');

  let timer = null;

  // Velocity vector (per second), updated from slider:
  // We use angle in radians, with cos/sin split to vx, vy signs handled.
  let angleRad = 0;     // absolute angle magnitude in radians (15°..25°)
  let dirX = +1;        // +1 => moving right, -1 => moving left
  let dirY = +1;        // +1 => moving down, -1 => moving up

  // Helpers
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
    // Flip only on X depending on horizontal direction
    ship.style.transform = `scaleX(${dirX > 0 ? 1 : -1})`;
  }

  function initPositionAndHeading(){
    const { ch, sh } = dims();

    // Place horizontally at left edge; vertically around middle
    ship.style.left = '0px';
    ship.style.top  = px(clamp((ch - sh) / 2, 0, ch - sh));

    // Random angle 15–25 degrees; random vertical direction up/down
    const angleDeg = 15 + Math.random() * 10; // [15,25]
    angleRad = angleDeg * DEG;
    dirX = +1;                           // start moving right
    dirY = Math.random() < 0.5 ? -1 : +1; // random up/down

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

    // Speed (px/sec) → per-tick distance
    const pxPerSec = parseInt(speedRange.value, 10) || 250;
    const dt = 16; // ms
    const stepLen = (pxPerSec * dt) / 1000;

    // Decompose by current angle
    const dx = Math.cos(angleRad) * stepLen * dirX;
    const dy = Math.sin(angleRad) * stepLen * dirY;

    // Proposed next position
    let nextLeft = currentLeft() + dx;
    let nextTop  = currentTop()  + dy;

    // Bounce logic — reflect on edges with a tiny margin to avoid stickiness
    const margin = 1;

    // Horizontal edges
    if (nextLeft >= maxLeft) {
      nextLeft = maxLeft;
      dirX = -1;
      setFacing();
    } else if (nextLeft <= 0) {
      nextLeft = 0;
      dirX = +1;
      setFacing();
    }

    // Vertical edges
    if (nextTop >= maxTop - margin) {
      nextTop = maxTop - margin;
      dirY = -1;
    } else if (nextTop <= margin) {
      nextTop = margin;
      dirY = +1;
    }

    ship.style.left = px(nextLeft);
    ship.style.top  = px(nextTop);
  }

  function start(){
    if (timer) return;
    timer = setInterval(step, 16); // ~60fps
  }

  function stop(){
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  // Click toggles ONLY the horizontal direction (like a quick U-turn)
  ship.addEventListener('click', () => {
    dirX *= -1;
    setFacing();
  });

  startBtn.addEventListener('click', start);
  stopBtn .addEventListener('click', stop);

  // Boot after image is ready so dimensions are correct
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
})();
