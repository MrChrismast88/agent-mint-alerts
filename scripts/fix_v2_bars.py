from PIL import Image, ImageDraw, ImageFont
W, H = 1280, 720
GOLD = (240, 185, 11)
WHITE = (255, 255, 255)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
def font(size, bold=True):
    return ImageFont.truetype(FB if bold else FR, size)
SNAP = "/home/hatch/workspace/.hatch-browser/snapshots/browser-task:73198ee9-6aef-597d-8b3b-ed13ba608b6b"
OUT = "/home/hatch/workspace/agent-mint-alerts/frontend/demo_assets"

def shot(src, step, text, name):
    img = Image.open(src).convert("RGB")
    img = img.resize((W, 624))  # fit above the caption bar, nothing hidden
    canvas = Image.new("RGB", (W, H), (11, 14, 17))
    canvas.paste(img, (0, 0))
    d = ImageDraw.Draw(canvas, "RGBA")
    d.rectangle([0, H-96, W, H], fill=(0, 0, 0, 200))
    d.rectangle([0, H-96, W, H-92], fill=GOLD)
    d.text((48, H-78), step, font=font(30), fill=GOLD)
    d.text((48, H-40), text, font=font(26, bold=False), fill=WHITE)
    canvas.save(f"{OUT}/{name}.png")
    print("wrote", name)

shot(f"{SNAP}/20261125T032235.269801876Z/look.1.png",
     "STEP 1", "Connect your own wallet — no QR code, no session saved.", "v2_hero")
shot(f"{SNAP}/20261125T032246.346425215Z/look.1.png",
     "STEP 2", "Browse verified alerts — FREE, PAID and CLOSED, each with its contract.", "v2_alerts")
