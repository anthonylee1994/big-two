import pathlib
import struct
import zlib

ROOT = pathlib.Path(__file__).resolve().parents[1] / "public"


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: pathlib.Path, size: int) -> None:
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            dx = x / size - 0.5
            dy = y / size - 0.5
            inside = dx * dx + dy * dy < 0.16
            if inside:
                row += bytes([228, 195, 106])
            else:
                row += bytes([12, 51, 40])
        rows.append(b"\x00" + bytes(row))
    raw = b"".join(rows)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    icons = ROOT / "icons"
    icons.mkdir(parents=True, exist_ok=True)
    write_png(icons / "icon-192.png", 192)
    write_png(icons / "icon-512.png", 512)
    write_png(ROOT / "apple-touch-icon.png", 180)


if __name__ == "__main__":
    main()
