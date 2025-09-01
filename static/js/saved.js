

async function deleteImage(filename){
  if(!confirm('Delete this image permanently?')) return;
  const res = await fetch('/api/delete', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({filename})
  });
  const j = await res.json();
  if(j.ok){ location.reload(); }
  else { alert('Delete failed: ' + j.error); }
}

async function generateSketch(filename){
  const res = await fetch('/api/generate_sketch', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({filename})
  });
  const j = await res.json();
  if(j.ok){ alert('Sketch generated!'); location.reload(); }
  else { alert('Generation failed: ' + j.error); }
}

async function generateImage(filename){
  const res = await fetch('/api/generate_image', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({filename})
  });
  const j = await res.json();
  if(j.ok){ alert('Image generated!'); location.reload(); }
  else { alert('Generation failed: ' + j.error); }
}

async function generateVR(filename){
  const res = await fetch('/api/generate_vr', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({filename})
  });
  const j = await res.json();
  if(j.ok){ 
    alert('Virtual Environment generated!');
    location.reload();
  }
  else { 
    alert('VR generation failed: ' + j.error); 
  }
}


