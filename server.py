import os
import uuid
import base64
import cv2
from PIL import Image, ImageOps
import torch
import gradio as gr
from diffusers import StableDiffusionImg2ImgPipeline, StableDiffusionPipeline

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

# ----------------- Helpers -----------------
def cv2_pencil_sketch(image: Image.Image):
    img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    dst_gray, _ = cv2.pencilSketch(img, sigma_s=60, sigma_r=0.07, shade_factor=0.05)
    return Image.fromarray(dst_gray)

# ----------------- Functions for Gradio -----------------
def text_to_image(prompt):
    if not prompt.strip():
        return None
    image = pipe_txt2img(prompt, guidance_scale=7.5).images[0]
    return image

def image_to_sketch(image: Image.Image):
    return cv2_pencil_sketch(image)

def image_to_img2img(image: Image.Image, prompt="realistic landscape, vivid colors, detailed painting"):
    init_image = image.convert("RGB")
    w, h = init_image.size
    init_image = init_image.resize(((w//8)*8, (h//8)*8))
    images = pipe_img2img(prompt=prompt, image=init_image, strength=0.7, guidance_scale=7.5).images
    return images[0]

def image_to_vr(image: Image.Image):
    return ImageOps.mirror(image)

# ----------------- Gradio UI -----------------
text_demo = gr.Interface(
    fn=text_to_image,
    inputs=gr.Textbox(lines=2, placeholder="Enter prompt here..."),
    outputs="image",
    title="Text → Image"
)

sketch_demo = gr.Interface(
    fn=image_to_sketch,
    inputs="image",
    outputs="image",
    title="Image → Sketch"
)

img2img_demo = gr.Interface(
    fn=image_to_img2img,
    inputs=["image", gr.Textbox(value="realistic landscape, vivid colors, detailed painting")],
    outputs="image",
    title="Image → Image (Img2Img)"
)

vr_demo = gr.Interface(
    fn=image_to_vr,
    inputs="image",
    outputs="image",
    title="Image → VR (Mirror Panorama)"
)

demo = gr.TabbedInterface([text_demo, sketch_demo, img2img_demo, vr_demo],
                          ["Text2Img", "Sketch", "Img2Img", "VR"])

if __name__ == "__main__":
    demo.launch()
