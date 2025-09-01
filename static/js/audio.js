const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
ctx.lineCap = 'round';
let color = '#ffffff';
let size = 60;

let history = [];
let redoStack = [];

function snapshot() {
  history.push(canvas.toDataURL());
  if (history.length > 50) history.shift();
  redoStack = [];
}
function restore(dataUrl) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(img, 0,0, canvas.width, canvas.height);
  };
  img.src = dataUrl;
}

// cursor = last clicked point
let cursor = {x: canvas.width/2, y: canvas.height/2};
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  cursor.x = e.clientX - rect.left;
  cursor.y = e.clientY - rect.top;
});

// ---------- Drawing Shapes ----------
function drawTree(x, y, size) {
  // trunk
  ctx.fillStyle = "sienna";
  ctx.fillRect(x - size/10, y - size/2, size/5, size/2);

  // foliage (three circles stacked)
  ctx.beginPath();
  ctx.arc(x, y - size/1.2, size/2, 0, Math.PI * 2);
  ctx.arc(x - size/3, y - size/1.5, size/2.5, 0, Math.PI * 2);
  ctx.arc(x + size/3, y - size/1.5, size/2.5, 0, Math.PI * 2);
  ctx.fillStyle = "green";
  ctx.fill();
}



function drawMountain(x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x - size, y + size/2); // left base
  ctx.lineTo(x, y - size);          // peak
  ctx.lineTo(x + size, y + size/2); // right base
  ctx.closePath();
  ctx.fillStyle = "gray";
  ctx.fill();

  // snowy cap
  ctx.beginPath();
  ctx.moveTo(x - size/4, y - size/4);
  ctx.lineTo(x, y - size);
  ctx.lineTo(x + size/4, y - size/4);
  ctx.closePath();
  ctx.fillStyle = "white";
  ctx.fill();
}

function drawSun(x, y, size, c="yellow") {
  // main circle
  ctx.beginPath();
  ctx.arc(x, y, size/2, 0, Math.PI*2);
  ctx.fillStyle = c;
  ctx.fill();

  // rays
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  for (let i=0; i<12; i++) {
    let angle = (i * Math.PI) / 6;
    let x1 = x + Math.cos(angle) * (size/2 + 5);
    let y1 = y + Math.sin(angle) * (size/2 + 5);
    let x2 = x + Math.cos(angle) * (size/2 + 15);
    let y2 = y + Math.sin(angle) * (size/2 + 15);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}


function drawCurve(x, y, s, c="white") {
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.quadraticCurveTo(x, y - s, x + s, y);
  ctx.strokeStyle = c;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawCircle(x, y, r, c="white") {
  ctx.beginPath();
  ctx.strokeStyle = c;
  ctx.lineWidth = 3;
  ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.stroke();
}

// ---------- Voice Recognition ----------
const statusEl = document.getElementById('status');
let recognition = null;
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
} else if ('SpeechRecognition' in window) {
  recognition = new SpeechRecognition();
}

if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => statusEl.textContent = 'Listening...';
  recognition.onerror = (e) => statusEl.textContent = 'Error: ' + e.error;
  recognition.onend = () => statusEl.textContent = 'Stopped';

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    statusEl.textContent = 'Heard: ' + transcript;
    handleCommand(transcript);
  };
} else {
  statusEl.textContent = 'Speech recognition not supported in this browser.';
}

// ---------- Handle Commands ----------
function handleCommand(t) {
  if (!t) return;

  const words = t.split(" ");
  let phrase = t;   // full transcript

  let obj = null;
  let c = color;
  let s = size;

  // -------- detect objects (more forgiving) --------
  if (phrase.includes("tree")) obj = "tree";
  if (phrase.includes("mountain")) obj = "mountain";
  if (phrase.includes("sun")) obj = "sun";
  if (phrase.includes("circle")) obj = "circle";
  if (phrase.includes("curve")) obj = "curve";
  if (phrase.includes("line")) obj = "line";

  // -------- detect size --------
  if (phrase.includes("small") || phrase.includes("tiny")) s = 40;
  if (phrase.includes("medium") || phrase.includes("normal")) s = 60;
  if (phrase.includes("large") || phrase.includes("big") || phrase.includes("huge")) s = 120;

  // -------- detect color --------
  const colors = ["red","green","blue","yellow","black","white","orange","purple"];
  for (let w of words) {
    if (colors.includes(w)) c = w;
  }

  // -------- system commands --------
  if (phrase.includes("clear")) { ctx.clearRect(0,0,canvas.width,canvas.height); snapshot(); return; }
  if (phrase.includes("undo")) { undo(); return; }
  if (phrase.includes("redo")) { redo(); return; }
  if (phrase.includes("save")) { saveImage(); return; }

 // -------- draw at cursor --------
  if (obj === "tree") { drawTree(cursor.x, cursor.y, s); snapshot(); return; }
  if (obj === "mountain") { drawMountain(cursor.x, cursor.y, s); snapshot(); return; }
  if (obj === "sun") { drawSun(cursor.x, cursor.y, s, c); snapshot(); return; }
  if (obj === "circle") { drawCircle(cursor.x, cursor.y, s/2, c); snapshot(); return; }
  if (obj === "curve") { drawCurve(cursor.x, cursor.y, s, c); snapshot(); return; }
  if (obj === "line") { 
    ctx.beginPath();
    ctx.moveTo(cursor.x - s/2, cursor.y);
    ctx.lineTo(cursor.x + s/2, cursor.y);
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.stroke();
    snapshot();
    return;
  }


  // ---------- fallback for unknown word ----------
  let unknown = words.find(w => !["tree","mountain","sun","circle","curve","line",
                                  "small","tiny","medium","normal","large","big","huge",
                                  "red","green","blue","yellow","black","white","orange","purple",
                                  "clear","undo","redo","save"].includes(w));
  if (unknown) {
    // Draw placeholder circle + text
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, 30, 0, Math.PI*2);
    ctx.fillStyle = "lightgray";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.fillStyle = "black";
    ctx.fillText(unknown, cursor.x-20, cursor.y+5);

    // Send placeholder metadata to backend
    savePlaceholder(unknown, cursor.x, cursor.y, s);
    snapshot();
    return;
  }
}

// helper to send placeholder metadata
function savePlaceholder(word, x, y, size){
  fetch('/api/save_placeholder', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({word, x, y, size})
  });
}
// ---------- Undo / Redo ----------
function undo() {
  if (history.length) {
    const last = history.pop();
    redoStack.push(canvas.toDataURL());
    restore(last);
  }
}
function redo() {
  if (redoStack.length) {
    const next = redoStack.pop();
    history.push(canvas.toDataURL());
    restore(next);
  }
}

// ---------- Buttons ----------
document.getElementById('startVoice').onclick = () => {
  if (recognition) recognition.start();
};
document.getElementById('stopVoice').onclick = () => {
  if (recognition) recognition.stop();
};
document.getElementById('undoBtn').onclick = () => handleCommand('undo');
document.getElementById('redoBtn').onclick = () => handleCommand('redo');
document.getElementById('clearBtn').onclick = () => handleCommand('clear');
document.getElementById('saveBtn').onclick = () => handleCommand('save');

async function saveImage(){
  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({dataUrl})
  });
  const j = await res.json();
  if(j.ok){ alert('Saved! Open Saved Images to view.'); }
  else { alert('Save failed: ' + j.error); }
}
