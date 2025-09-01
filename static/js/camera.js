const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const octx = overlay.getContext('2d');
const drawCanvas = document.getElementById('drawCanvas');
const dctx = drawCanvas.getContext('2d');

let erasing = false;
let canDraw = false;
let lastPoint = null;
let smoothX = null, smoothY = null;
let handPresent = false;

// ---------------- Camera Setup ----------------
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
  video.srcObject = stream;
  await video.play();
}
setupCamera();

// ---------------- Mediapipe Hands ----------------
const hands = new Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,  // higher confidence
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

const camera = new Camera(video, {
  onFrame: async () => { await hands.send({image: video}); },
  width: 640, height: 480
});
camera.start();

// ---------------- Helpers ----------------
function countExtendedFingers(landmarks) {
  const tips = [8, 12, 16, 20];
  const mcps = [5, 9, 13, 17];
  let count = 0;
  for (let i=0; i<4; i++) {
    if (landmarks[tips[i]].y < landmarks[mcps[i]].y) count++;
  }
  if (landmarks[4].x < landmarks[3].x) count++;
  return count;
}

// ---------------- Drawing ----------------
function onResults(results) {
  octx.clearRect(0, 0, overlay.width, overlay.height);
  octx.drawImage(results.image, 0, 0, overlay.width, overlay.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handPresent = true;
    const lm = results.multiHandLandmarks[0];

    drawConnectors(octx, lm, HAND_CONNECTIONS);
    drawLandmarks(octx, lm, { radius: 2 });

    const fingerCount = countExtendedFingers(lm);
    if (fingerCount === 1) canDraw = true;
    if (fingerCount === 2) { canDraw = false; }
    if (fingerCount === 3) { erasing = !erasing; }

        const tip = lm[8];
    // Map from video/overlay (640x480) → drawCanvas (900x520)
    let x = tip.x * overlay.width;
    let y = tip.y * overlay.height;

    // Scale to drawCanvas size
    x = x * (drawCanvas.width / overlay.width);
    y = y * (drawCanvas.height / overlay.height);

    // Smooth fingertip
    const alpha = 0.4;
    if (smoothX === null) { smoothX = x; smoothY = y; }
    smoothX = alpha * x + (1 - alpha) * smoothX;
    smoothY = alpha * y + (1 - alpha) * smoothY;

    if (canDraw) {
      dctx.lineWidth = erasing ? 25 : 5;
      dctx.lineCap = 'round';
      dctx.lineJoin = 'round';
      dctx.strokeStyle = erasing ? '#0b1220' : '#ffffff';

      dctx.beginPath();
      if (lastPoint) {
        dctx.moveTo(lastPoint.x, lastPoint.y);
      } else {
        dctx.moveTo(smoothX, smoothY);
      }
      dctx.lineTo(smoothX, smoothY);
      dctx.stroke();

      lastPoint = {x: smoothX, y: smoothY};
    } else {
      lastPoint = null;
    }

  } else {
    if (handPresent) {
      setTimeout(() => {
        lastPoint = null;
        smoothX = null;
        smoothY = null;
        handPresent = false;
      }, 150);
    }
  }
}

// ---------------- Buttons ----------------
document.getElementById('clearBtn').onclick = () => {
  dctx.clearRect(0,0,drawCanvas.width, drawCanvas.height);
};

document.getElementById('saveBtn').onclick = async () => {
  const dataUrl = drawCanvas.toDataURL('image/png');
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({dataUrl})
  });
  const j = await res.json();
  if (j.ok) { alert('Saved! Open Saved Images to view.'); }
  else { alert('Save failed: ' + j.error); }
};
