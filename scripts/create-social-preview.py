#!/usr/bin/env python3
"""Draw the portfolio's original 1200 x 630 sharing artwork with Pillow.

No remote images or game artwork are used. Run from any directory:
    python3 scripts/create-social-preview.py
"""

from pathlib import Path
import argparse
import math
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SIZE = (1200, 630)
SCALE = 2


def font_path(bold=False):
    names = (
        ["/System/Library/Fonts/Supplemental/Arial Bold.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
         "C:/Windows/Fonts/arialbd.ttf"]
        if bold else
        ["/System/Library/Fonts/Supplemental/Arial.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
         "C:/Windows/Fonts/arial.ttf"]
    )
    return next((str(Path(name)) for name in names if Path(name).is_file()), None)


def create_preview(output):
    width, height = SIZE
    image = Image.new("RGB", SIZE)
    background = ImageDraw.Draw(image)
    for y in range(height):
        ratio = y / height
        background.line((0, y, width, y), fill=(10 + round(3 * ratio), 15 + round(3 * ratio), 34 + round(8 * ratio)))
    image = image.resize((width * SCALE, height * SCALE), Image.Resampling.BICUBIC).convert("RGBA")

    def point(x, y):
        return round(x * SCALE), round(y * SCALE)

    def box(x0, y0, x1, y1):
        return tuple(round(value * SCALE) for value in (x0, y0, x1, y1))

    glow = Image.new("RGBA", image.size)
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(box(650, 30, 1260, 560), fill=(72, 72, 212, 65))
    glow_draw.ellipse(box(890, 90, 1160, 480), fill=(126, 72, 211, 62))
    glow_draw.ellipse(box(760, 230, 1040, 420), fill=(59, 122, 228, 42))
    image = Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(80 * SCALE)))
    ink = ImageDraw.Draw(image)

    random_source = random.Random(222282)
    for _ in range(95):
        x, y = random_source.uniform(590, 1200), random_source.uniform(36, 570)
        radius = random_source.choice([0.5, 0.65, 0.85, 1.1])
        alpha = random_source.randint(28, 125)
        ink.ellipse(box(x - radius, y - radius, x + radius, y + radius), fill=(172, 191, 255, alpha))

    center = (1008, 285)

    def orbit(radius_x, radius_y, angle, color, line_width=1):
        rotation = math.radians(angle)
        points = []
        for index in range(481):
            theta = index * math.tau / 480
            x = radius_x * math.cos(theta)
            y = radius_y * math.sin(theta)
            points.append(point(center[0] + x * math.cos(rotation) - y * math.sin(rotation), center[1] + x * math.sin(rotation) + y * math.cos(rotation)))
        ink.line(points, fill=color, width=max(1, round(line_width * SCALE)))

    orbit(204, 204, 0, (119, 143, 243, 62))
    orbit(238, 238, 0, (145, 155, 248, 28))
    orbit(310, 97, -31, (145, 159, 255, 185), 1.35)
    orbit(260, 83, 52, (155, 119, 245, 122), 1)
    orbit(286, 65, 10, (92, 174, 241, 75), 1)

    core = Image.new("RGBA", image.size)
    core_draw = ImageDraw.Draw(core)
    core_draw.ellipse(box(963, 240, 1053, 330), fill=(118, 130, 255, 130))
    image = Image.alpha_composite(image, core.filter(ImageFilter.GaussianBlur(23 * SCALE)))
    ink = ImageDraw.Draw(image)
    ink.ellipse(box(952, 229, 1064, 341), fill=(18, 26, 66, 240), outline=(169, 179, 255, 195), width=SCALE)
    ink.ellipse(box(963, 240, 1053, 330), outline=(131, 150, 255, 50), width=SCALE)

    regular = font_path()
    bold = font_path(bold=True)

    def font(size, strong=False):
        path = bold if strong else regular
        return ImageFont.truetype(path, round(size * SCALE)) if path else ImageFont.load_default(size=round(size * SCALE))

    def label(value, x, y, size, color, tracking=0, strong=False):
        face = font(size, strong)
        if not tracking:
            ink.text(point(x, y), value, font=face, fill=color, anchor="lt")
            return
        cursor = x * SCALE
        for letter in value:
            ink.text((round(cursor), round(y * SCALE)), letter, font=face, fill=color, anchor="lt")
            cursor += ink.textlength(letter, font=face) + tracking * SCALE

    ink.line([point(64, 49), point(118, 49)], fill=(161, 174, 255, 255), width=3 * SCALE)
    label("BL / PERSONAL ARCHIVE", 134, 42, 14, (177, 189, 230, 255), tracking=2)
    label("PERSONAL PORTFOLIO", 64, 113, 18, (155, 174, 255, 255), tracking=4)
    label("BERNIE", 58, 170, 112, (244, 246, 255, 255), strong=True)
    label("LEUNG.", 58, 287, 112, (176, 187, 255, 255), strong=True)

    # A restrained monogram gives the abstract orbital artwork a clear centre.
    face = font(34, strong=True)
    ink.text(point(*center), "BL", font=face, fill=(221, 226, 255, 255), anchor="mm")
    ink.line([point(1008, 70), point(1008, 87)], fill=(154, 172, 255, 135), width=SCALE)
    ink.line([point(790, 285), point(807, 285)], fill=(154, 172, 255, 135), width=SCALE)
    ink.ellipse(box(776, 390, 785, 399), fill=(181, 198, 255, 255))
    ink.ellipse(box(1115, 128, 1121, 134), fill=(183, 151, 255, 235))

    ink.line([point(64, 483), point(1136, 483)], fill=(129, 151, 219, 63), width=SCALE)
    label("AI & ICT  /  WEB  /  PHOTOGRAPHY  /  STEM", 64, 519, 19, (209, 219, 248, 255), tracking=1.1)
    label("BERNIE8026.GITHUB.IO", 64, 570, 12, (132, 149, 193, 255), tracking=2)
    label("LEARNING THROUGH MAKING", 840, 570, 11, (132, 149, 193, 255), tracking=1.4)

    output.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").resize(SIZE, Image.Resampling.LANCZOS).save(output, optimize=True)
    print(f"Created {output} ({width} x {height})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "public/assets/social-preview.png")
    create_preview(parser.parse_args().output)
