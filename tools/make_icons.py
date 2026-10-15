"""Generate simple PNG app icons (no dependencies). Usage: uv run tools/make_icons.py"""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "app" / "icons"
OLIVE, CREAM, GOLD = (106, 127, 68), (243, 236, 224), (211, 165, 59)


def png(size: int, path: Path) -> None:
    c, rows = size / 2, []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            d = ((x - c) ** 2 + (y - c) ** 2) ** 0.5
            col = OLIVE
            if size * 0.26 <= d <= size * 0.36:
                col = CREAM
            if d < size * 0.12:
                col = GOLD
            row += bytes(col)
        rows.append(bytes(row))
    raw = zlib.compress(b"".join(rows), 9)

    def chunk(t: bytes, d: bytes) -> bytes:
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))

    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
                     + chunk(b"IDAT", raw) + chunk(b"IEND", b""))


for name, s in (("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)):
    png(s, OUT / name)
print("icons written to", OUT)
