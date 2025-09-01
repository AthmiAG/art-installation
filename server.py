from flask import Flask, render_template, request, jsonify, url_for
import os
import uuid
import base64
import cv2
import json
import shutil
from PIL import Image, ImageDraw, ImageOps

from diffusers import StableDiffusionImg2ImgPipeline, StableDiffusionPipeline
import torch

# ----------------- Stable Diffusion Setup -----------------
device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if device == "cuda" else torch.float32

pipe_img2img = StableDiffusionImg2ImgPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=dtype
).to(device)

pipe_txt2img = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=dtype
).to(device)

# ----------------- Flask Setup -----------------
app = Flask(__name__, static_folder="static", template_folder="templates")

SAVE_DIR = os.path.join(app.static_folder, "saved")
GEN_DIR = os.path.join(app.static_folder, "generated")
os.makedirs(SAVE_DIR, exist_ok=True)
os.makedirs(GEN_DIR, exist_ok=True)

# ----------------- Helpers -----------------
def save_data_url_image(data_url, prefix="img"):
    header, b64data = data_url.split(",", 1)
    ext = "png" if "image/png" in header else "jpg"
    filename = f"{prefix}_{uuid.uuid4().hex}.{ext}"
    path = os.path.join(SAVE_DIR, filename)
    with open(path, "wb") as f:
        f.write(base64.b64decode(b64data))
    return filename

def cv2_pencil_sketch(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Could not read image")
    dst_gray, _ = cv2.pencilSketch(img, sigma_s=60, sigma_r=0.07, shade_factor=0.05)
    return dst_gray

# ----------------- Routes -----------------
@app.route("/")
def index():
    return render_template("index.html", title="Art Installation")

@app.route("/text")
def text_mode():
    return render_template("text.html", title="Text Mode")

@app.route("/mouse")
def mouse_mode():
    return render_template("mouse.html", title="Mouse Mode")

@app.route("/camera")
def camera_mode():
    return render_template("camera.html", title="Camera Mode")

@app.route("/audio")
def audio_mode():
    return render_template("audio.html", title="Audio Mode")

@app.route("/saved")
def saved_images():
    files = sorted([f for f in os.listdir(SAVE_DIR) if f.lower().endswith((".png",".jpg",".jpeg",".webp"))])
    return render_template("saved.html", title="Saved Images", files=files)

# ----------------- API: Save & Delete -----------------
@app.post("/api/save")
def api_save():
    data = request.get_json()
    if not data or "dataUrl" not in data:
        return jsonify({"ok": False, "error": "Missing dataUrl"}), 400
    fname = save_data_url_image(data["dataUrl"])
    return jsonify({"ok": True, "filename": fname, "url": url_for('static', filename=f"saved/{fname}")})

@app.post("/api/delete")
def api_delete():
    data = request.get_json()
    if not data or "filename" not in data:
        return jsonify({"ok": False, "error": "Missing filename"}), 400
    path = os.path.join(SAVE_DIR, os.path.basename(data["filename"]))
    if os.path.exists(path):
        os.remove(path)
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": "File not found"}), 404

# ----------------- API: Text-to-Image -----------------
@app.post("/api/text_generate")
def api_text_generate():
    data = request.get_json()
    if not data or "prompt" not in data:
        return jsonify({"ok": False, "error": "Missing prompt"}), 400

    prompt = data["prompt"].strip()
    if not prompt:
        return jsonify({"ok": False, "error": "Empty prompt"}), 400

    try:
        image = pipe_txt2img(prompt, guidance_scale=7.5).images[0]
        out_name = f"text_{uuid.uuid4().hex}.png"
        out_path = os.path.join(SAVE_DIR, out_name)
        image.save(out_path)

        return jsonify({"ok": True, "filename": out_name, "url": url_for("static", filename=f"saved/{out_name}")})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ----------------- API: Sketch Generation -----------------
@app.post("/api/generate_sketch")
def api_generate_sketch():
    data = request.get_json()
    if not data or "filename" not in data:
        return jsonify({"ok": False, "error": "Missing filename"}), 400

    src_path = os.path.join(SAVE_DIR, os.path.basename(data["filename"]))
    if not os.path.exists(src_path):
        return jsonify({"ok": False, "error": "Source not found"}), 404

    try:
        out = cv2_pencil_sketch(src_path)
        out_name = f"sketch_{uuid.uuid4().hex}.png"
        out_path = os.path.join(SAVE_DIR, out_name)
        cv2.imwrite(out_path, out)
        return jsonify({"ok": True, "filename": out_name, "url": url_for('static', filename=f"saved/{out_name}")})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ----------------- API: Img2Img Generation -----------------
@app.post("/api/generate_image")
def api_generate_image():
    data = request.get_json()
    if not data or "filename" not in data:
        return jsonify({"ok": False, "error": "Missing filename"}), 400

    src_name = os.path.basename(data["filename"])
    src_path = os.path.join(SAVE_DIR, src_name)

    if not os.path.exists(src_path):
        return jsonify({"ok": False, "error": "Source not found"}), 404

    try:
        prompt = "realistic landscape, vivid colors, detailed painting"
        init_image = Image.open(src_path).convert("RGB")
        w, h = init_image.size
        init_image = init_image.resize(((w//8)*8, (h//8)*8))

        images = pipe_img2img(prompt=prompt, image=init_image, strength=0.7, guidance_scale=7.5).images
        out_name = f"gen_{uuid.uuid4().hex}.png"
        out_path = os.path.join(SAVE_DIR, out_name)
        images[0].save(out_path)

        return jsonify({"ok": True, "filename": out_name, "url": url_for('static', filename=f"saved/{out_name}")})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ----------------- API: VR Generation -----------------
@app.route("/api/generate_vr", methods=["POST"])
def generate_vr():
    try:
        data = request.json
        filename = data.get("filename")
        filepath = os.path.join(SAVE_DIR, filename)

        if not os.path.exists(filepath):
            return jsonify({"ok": False, "error": "File not found"})

        vr_filename = "vr_" + filename
        vr_filepath = os.path.join(SAVE_DIR, vr_filename)

        img = Image.open(filepath)
        vr_img = ImageOps.mirror(img)  # simple panorama effect
        vr_img.save(vr_filepath)

        return jsonify({"ok": True, "file": vr_filename})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})


# ----------------- Main -----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
