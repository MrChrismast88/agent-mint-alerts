from PIL import Image, ImageDraw, ImageFont, ImageFilter
import textwrap, os

W, H = 1280, 720
BG = (11, 14, 17)
GOLD = (240, 185, 11)
WHITE = (255, 255, 255)
MUTED = (170, 178, 188)
CARD = (22, 28, 35)

FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
def font(size, bold=True):
    return ImageFont.truetype(FB if bold else FR, size)

OUT = "/home/hatch/workspace/agent-mint-alerts/frontend/demo_assets"
os.makedirs(OUT, exist_ok=True)

def base():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 10], fill=GOLD)
    d.rectangle([0, H-10, W, H], fill=GOLD)
    return img, d

def title_block(d, kicker, title, y=150):
    d.text((90, y), kicker, font=font(30), fill=GOLD)
    d.text((90, y+50), title, font=font(64), fill=WHITE)

def body_lines(d, lines, y, size=34, gap=52, color=WHITE, x=90):
    for ln in lines:
        d.text((x, y), ln, font=font(size, bold=False), fill=color)
        y += gap
    return y

def save(img, name):
    img.save(f"{OUT}/{name}.png")
    print("wrote", name)

# Slide 1: banner cover
banner = Image.open("/home/hatch/workspace/agent-mint-alerts/frontend/media-generation-agent-mint-alerts-banner-0-3e95d146-76e7-439e-997e-1f5a2e7e2089.webp").convert("RGB")
bw, bh = banner.size
scale = max(W/bw, H/bh)
nb = banner.resize((int(bw*scale), int(bh*scale)))
nb = nb.crop(((nb.width-W)//2, (nb.height-H)//2, (nb.width-W)//2+W, (nb.height-H)//2+H))
dark = Image.new("RGB", (W, H), (0,0,0))
nb = Image.blend(nb, dark, 0.45)
d = ImageDraw.Draw(nb)
d.text((90, 470), "Agent Mint Alerts", font=font(72), fill=WHITE)
d.text((90, 560), "Never miss a free mint again.", font=font(38, bold=False), fill=GOLD)
save(nb, "s1")

# Slide 2: problem
img, d = base()
title_block(d, "THE PROBLEM", "Free mints sell out in minutes.")
body_lines(d, ["Agent ID wallets get free mints — but alerts live", "in scattered chats and disappear fast.", "Holders miss the mint before they even see it."], 300)
save(img, "s2")

# Slide 3: how it works
img, d = base()
title_block(d, "HOW IT WORKS", "Subscribe. Claim. On-chain.")
steps = [
    ("1.", "Open the website and connect your own wallet."),
    ("2.", "Subscribe — free, gas only. Agent ID required."),
    ("3.", "Claim alerts on-chain. One click per alert."),
]
y = 300
for num, txt in steps:
    d.text((90, y), num, font=font(36), fill=GOLD)
    d.text((150, y), txt, font=font(34, bold=False), fill=WHITE)
    y += 64
d.text((90, 520), "No QR login. No session saved. No seed phrase, ever.", font=font(28, bold=False), fill=MUTED)
save(img, "s3")

# Slide 4: trustless
img, d = base()
title_block(d, "ON-CHAIN & TRUSTLESS", "No owner. No fees. No token.")
body_lines(d, ["Contract (BSC): 0x4836Af06A6AD107BedfA74888ae3c98EBc1Cb42B",
               "Verified: Sourcify exact match — source open.",
               "Agent ID checked on-chain via the SPACE ID registry."], 300, size=30, gap=56)
save(img, "s4")

# Slide 5: traction
img, d = base()
title_block(d, "LIVE TRACTION", "Real wallets. Real usage.")
d.text((90, 300), "28", font=font(150), fill=GOLD)
d.text((330, 380), "Agent ID subscribers", font=font(36, bold=False), fill=WHITE)
d.text((90, 480), "41", font=font(150), fill=GOLD)
d.text((330, 560), "alert claims on-chain", font=font(36, bold=False), fill=WHITE)
d.text((880, 640), "checked on-chain, 25 Nov 2026", font=font(22, bold=False), fill=MUTED)
save(img, "s5")

# Slide 6: end card
img, d = base()
d.text((90, 220), "Try it live", font=font(72), fill=WHITE)
d.text((90, 330), "mrchrismast88.github.io/agent-mint-alerts", font=font(38), fill=GOLD)
d.text((90, 410), "github.com/MrChrismast88/agent-mint-alerts", font=font(32, bold=False), fill=WHITE)
d.text((90, 500), "Free for Agent ID holders. Gas only.", font=font(30, bold=False), fill=MUTED)
save(img, "s6")
print("done")
