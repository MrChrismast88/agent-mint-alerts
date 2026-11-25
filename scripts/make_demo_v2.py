from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1280, 720
BG = (11, 14, 17)
GOLD = (240, 185, 11)
WHITE = (255, 255, 255)
MUTED = (170, 178, 188)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
def font(size, bold=True):
    return ImageFont.truetype(FB if bold else FR, size)

SNAP = "/home/hatch/workspace/.hatch-browser/snapshots/browser-task:73198ee9-6aef-597d-8b3b-ed13ba608b6b"
OUT = "/home/hatch/workspace/agent-mint-alerts/frontend/demo_assets"
DA = f"{OUT}"

def cover_crop(img, w=W, h=H):
    iw, ih = img.size
    scale = max(w/iw, h/ih)
    ni = img.resize((int(iw*scale), int(ih*scale)))
    x = (ni.width - w)//2; y = (ni.height - h)//2
    return ni.crop((x, y, x+w, y+h))

def caption_bar(img, step, text):
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, H-96, W, H], fill=(0, 0, 0, 200))
    d.rectangle([0, H-96, W, H-92], fill=GOLD)
    d.text((48, H-78), step, font=font(30), fill=GOLD)
    d.text((48, H-40), text, font=font(26, bold=False), fill=WHITE)
    return img

def save(img, name):
    img.save(f"{OUT}/{name}.png")
    print("wrote", name)

# v2 shot 1: hero (snapshot 2, Subscribe button visible)
hero = Image.open(f"{SNAP}/20261125T032235.269801876Z/look.1.png").convert("RGB")
hero = cover_crop(hero)
hero = caption_bar(hero, "STEP 1", "Connect your own wallet — no QR code, no session saved.")
save(hero, "v2_hero")

# v2 shot 2: alerts list (snapshot 3)
alerts = Image.open(f"{SNAP}/20261125T032246.346425215Z/look.1.png").convert("RGB")
alerts = cover_crop(alerts)
alerts = caption_bar(alerts, "STEP 2", "Browse verified alerts — FREE, PAID and CLOSED, each with its contract.")
save(alerts, "v2_alerts")

# v2 shot 3: How Agent ID is used card only (crop out the erroring Recent subscribers box)
foot = Image.open(f"{SNAP}/20261125T032255.696426726Z/look.1.png").convert("RGB")
# card region: x 220..1060, y ~270..595 in the 1280x720 shot
card = foot.crop((220, 268, 1060, 596))
card = card.resize((1100, int(1100*card.height/card.width)))
img = Image.new("RGB", (W, H), BG)
img.paste(card, ((W-card.width)//2, 90))
d = ImageDraw.Draw(img)
d.text((90, 30), "HOW AGENT ID IS USED", font=font(30), fill=GOLD)
img = caption_bar(img, "STEP 3", "Subscribe free, gas only — Agent ID is checked on-chain.")
save(img, "v2_how")

print("done")
