
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let brushColor = '#ffffff';
let brushSize = document.getElementById('brushSize').value;
let erasing = false;

const paletteEl = document.getElementById('palette');
const colors = ['#ffffff','#e11d48','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899','#94a3b8','#9ca3af','#000000'];
colors.forEach(c => {
  const d = document.createElement('div');
  d.className = 'swatch';
  d.style.background = c;
  d.onclick = () => { brushColor = c; erasing = false; };
  paletteEl.appendChild(d);
});

document.getElementById('brushSize').addEventListener('input', e => {
  brushSize = e.target.value;
});

document.getElementById('eraserBtn').addEventListener('click', () => {
  erasing = !erasing;
});

function pos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches) {
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  } else {
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
}

function start(e) { drawing = true; draw(e); }
function end() { drawing = false; ctx.beginPath(); }
function draw(e) {
  if (!drawing) return;
  const {x,y} = pos(e);
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.strokeStyle = erasing ? '#0b1220' : brushColor;
  ctx.lineTo(x,y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x,y);
}

canvas.addEventListener('mousedown', start);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', end);
canvas.addEventListener('mouseleave', end);
canvas.addEventListener('touchstart', start, {passive:false});
canvas.addEventListener('touchmove', (e)=>{ e.preventDefault(); draw(e); }, {passive:false});
canvas.addEventListener('touchend', end);

document.getElementById('clearBtn').onclick = () => {
  ctx.clearRect(0,0,canvas.width, canvas.height);
};

document.getElementById('saveBtn').onclick = async () => {
  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({dataUrl})
  });
  const j = await res.json();
  if(j.ok){ alert('Saved! Open Saved Images to view.'); }
  else { alert('Save failed: ' + j.error); }
};
