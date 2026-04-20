#!/usr/bin/env python3
"""Generate WorldCapIQ brand icons (PNG + ICO) from spec."""

import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Installing Pillow...")
    os.system(f"{sys.executable} -m pip install Pillow")
    from PIL import Image, ImageDraw, ImageFont

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
FONT_PATH = os.path.join(PROJECT_ROOT, "public", "fonts", "bebas-neue-400.ttf")
ICONS_DIR = os.path.join(PROJECT_ROOT, "public", "icons")
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "public")

# Brand colors
BG_GREEN = (160, 212, 148)       # #a0d494
TEXT_DARK = (13, 15, 13)          # #0d0f0d
ACCENT_LINE = (13, 15, 13, 102)  # #0d0f0d at 40% opacity

os.makedirs(ICONS_DIR, exist_ok=True)


def draw_squircle(draw, size, radius, fill):
    """Draw a rounded rectangle (squircle approximation)."""
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=fill)


def draw_accent_line(draw, size):
    """Draw diagonal accent line in bottom-right."""
    x_start = int(size * 0.625)
    y_start = size
    x_end = size
    y_end = int(size * 0.625)
    line_width = max(1, int(size * 0.006))
    draw.line([(x_start, y_start), (x_end, y_end)], fill=ACCENT_LINE, width=line_width)


def create_standard_icon(size, with_accent=True):
    """Create a standard 'any' purpose icon at given size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Squircle background (22% radius)
    radius = int(size * 0.22)
    draw_squircle(draw, size, radius, BG_GREEN)

    # Accent line
    if with_accent and size >= 64:
        draw_accent_line(draw, size)

    # IQ text
    font_size = int(size * 0.62)
    try:
        font = ImageFont.truetype(FONT_PATH, font_size)
    except (OSError, IOError):
        print(f"  Warning: Could not load Bebas Neue, using default font")
        font = ImageFont.load_default()

    text = "IQ"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    # Center the text (adjust y slightly up for visual centering)
    x = (size - text_w) // 2 - bbox[0]
    y = (size - text_h) // 2 - bbox[1] - int(size * 0.02)

    draw.text((x, y), text, fill=TEXT_DARK, font=font)
    return img


def create_maskable_icon(size):
    """Create a maskable icon (full-bleed, content in safe zone)."""
    img = Image.new("RGBA", (size, size), BG_GREEN + (255,))
    draw = ImageDraw.Draw(img)

    # Content in safe zone (inner 80%)
    safe_zone = int(size * 0.8)
    offset = int(size * 0.1)

    # IQ text sized to safe zone
    font_size = int(safe_zone * 0.62)
    try:
        font = ImageFont.truetype(FONT_PATH, font_size)
    except (OSError, IOError):
        font = ImageFont.load_default()

    text = "IQ"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    x = (size - text_w) // 2 - bbox[0]
    y = (size - text_h) // 2 - bbox[1] - int(size * 0.02)

    draw.text((x, y), text, fill=TEXT_DARK, font=font)
    return img


def create_favicon_ico(icon_img):
    """Create a multi-resolution favicon.ico."""
    sizes = [(16, 16), (32, 32), (48, 48)]
    ico_images = []
    for s in sizes:
        resized = icon_img.resize(s, Image.LANCZOS)
        ico_images.append(resized)
    return ico_images


def main():
    print("Generating WorldCapIQ brand icons...")
    print(f"  Font: {FONT_PATH}")
    print(f"  Output: {ICONS_DIR}")
    print()

    # Standard icons (purpose: "any")
    standard_sizes = {
        "icon-192.png": 192,
        "icon-512.png": 512,
    }

    for filename, size in standard_sizes.items():
        path = os.path.join(ICONS_DIR, filename)
        img = create_standard_icon(size)
        img.save(path, "PNG", optimize=True)
        file_size = os.path.getsize(path)
        print(f"  Created {filename} ({size}x{size}, {file_size:,} bytes)")

    # Maskable icons (purpose: "maskable")
    maskable_sizes = {
        "icon-maskable-192.png": 192,
        "icon-maskable-512.png": 512,
    }

    for filename, size in maskable_sizes.items():
        path = os.path.join(ICONS_DIR, filename)
        img = create_maskable_icon(size)
        img.save(path, "PNG", optimize=True)
        file_size = os.path.getsize(path)
        print(f"  Created {filename} ({size}x{size}, {file_size:,} bytes)")

    # Apple touch icon (180x180, standard style)
    apple_icon = create_standard_icon(180)
    apple_path = os.path.join(PUBLIC_DIR, "apple-touch-icon.png")
    apple_icon.save(apple_path, "PNG", optimize=True)
    file_size = os.path.getsize(apple_path)
    print(f"  Created apple-touch-icon.png (180x180, {file_size:,} bytes)")

    # Favicon.ico (multi-res: 16, 32, 48)
    base_icon = create_standard_icon(512)
    ico_path = os.path.join(PUBLIC_DIR, "favicon.ico")
    ico_16 = base_icon.resize((16, 16), Image.LANCZOS)
    ico_32 = base_icon.resize((32, 32), Image.LANCZOS)
    ico_48 = base_icon.resize((48, 48), Image.LANCZOS)
    ico_16.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)],
                append_images=[ico_32, ico_48])
    file_size = os.path.getsize(ico_path)
    print(f"  Created favicon.ico (16+32+48, {file_size:,} bytes)")

    print()
    print("Done. All icons generated.")


if __name__ == "__main__":
    main()
