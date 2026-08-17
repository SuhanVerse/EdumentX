"""Generate assets/splash-icon.png — a simple branded placeholder for the
expo-splash-screen Android drawable. Pure-stdlib PNG writer (no PIL needed).

Design: night background (#0F172A) with a centered "E" monogram in the
brand accent amber (#E5A03B). Square 512x512 so the splash-screen plugin
can scale it down for every density bucket.
"""
import struct
import zlib

W = H = 512

NIGHT = (15, 23, 42)       # #0F172A
AMBER = (229, 160, 59)     # #E5A03B
GREEN = (47, 93, 80)       # #2F5D50 — secondary accent for the middle bar

# "E" monogram geometry (all in the 512x512 canvas)
LEFT = 96
RIGHT = 416
THICK = 52
TOP = 96
BOTTOM = 416
MID_Y = 230
MID_W = 250  # middle bar is shorter so the E reads as a letterform


def in_rect(x, y, x0, y0, x1, y1):
    return x0 <= x < x1 and y0 <= y < y1


def pixel(x, y):
    # vertical stem
    if in_rect(x, y, LEFT, TOP, LEFT + THICK, BOTTOM + THICK):
        return AMBER
    # top bar
    if in_rect(x, y, LEFT, TOP, RIGHT, TOP + THICK):
        return AMBER
    # bottom bar
    if in_rect(x, y, LEFT, BOTTOM, RIGHT, BOTTOM + THICK):
        return AMBER
    # middle bar (shorter, green)
    if in_rect(x, y, LEFT, MID_Y, LEFT + MID_W, MID_Y + THICK):
        return GREEN
    return NIGHT


def write_png(path):
    raw = bytearray()
    for y in range(H):
        raw.append(0)  # filter: none
        for x in range(W):
            r, g, b = pixel(x, y)
            raw += bytes((r, g, b))

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        return c

    ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)  # 8-bit RGB
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print(f"wrote {path} ({W}x{H})")


if __name__ == "__main__":
    write_png("assets/splash-icon.png")
