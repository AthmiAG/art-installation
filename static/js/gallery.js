// mouse.js
window.addEventListener('load', () => {
  const canvas = document.getElementById('drawCanvas');
  const ctx = canvas.getContext('2d');
  function resizeCanvas() {
    // keep high DPI sharpness
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let drawing = false;
  let last = {x:0,y:0};
  let color = '#000';
  let brushSize = 6;
  let eraser = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY ?? e.touches?.[0].clientY) - rect.top;
    return {x, y};
  }

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    last = getPos(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = eraser ? '#ffffff' : color;
    ctx.lineWidth = brushSize;
    ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over';
    ctx.stroke();
    last = p;
  });
  window.addEventListener('pointerup', () => drawing = false);
  window.addEventListener('pointercancel', () => drawing = false);

  // palette
  document.querySelectorAll('.swatch').forEach(b => {
    b.addEventListener('click', () => {
      color = b.dataset.color;
      eraser = false;
      document.getElementById('eraser').innerText = 'Eraser';
    });
  });

  document.getElementById('brushSize').addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value);
  });

  document.getElementById('eraser').addEventListener('click', () => {
    eraser = !eraser;
    document.getElementById('eraser').innerText = eraser ? 'Eraser ✓' : 'Eraser';
  });

  document.getElementById('clear').addEventListener('click', () => {
    ctx.clearRect(0,0,canvas.width, canvas.height);
  });

  document.getElementById('save').addEventListener('click', async () => {
    // export visible-size png
    const dataUrl = canvas.toDataURL('image/png');
    const res = await fetch('/save_image', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({image: dataUrl})
    });
    const j = await res.json();
    if (j.status === 'ok') {
      alert('Saved to server: ' + j.filename);
    } else {
      alert('Save failed');
    }
  });

});
