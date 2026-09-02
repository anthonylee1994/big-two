"""生成 PWA icon：金色圓角方底 + 深綠葵扇，同 public/favicon.svg 一致。

    python3 scripts/make-icons.py
"""

import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[1] / "public"

GOLD = (255, 201, 60, 255)
INK = (10, 42, 28, 255)

SUPERSAMPLE = 4


# 葵扇輪廓，畫喺 0..100 嘅方框入面，同 public/favicon.svg 嘅 path 一模一樣。
# 每段係一條 cubic bezier (c1, c2, end)，由頂尖順時針行一圈。
SPADE_START = (50.0, 2.0)
SPADE_CURVES = [
    ((42.0, 18.0), (20.0, 38.0), (8.0, 56.0)),  # 尖頂向左下凹落去
    ((-2.0, 74.0), (16.0, 88.0), (34.0, 80.0)),  # 左邊圓葉
    ((42.0, 76.0), (45.0, 72.0), (46.0, 68.0)),  # 左葉內側收窄到柄
    ((45.0, 80.0), (40.0, 90.0), (30.0, 96.0)),  # 柄左邊，向下擴
    ((36.7, 96.0), (63.3, 96.0), (70.0, 96.0)),  # 柄底
    ((60.0, 90.0), (55.0, 80.0), (54.0, 68.0)),  # 柄右邊
    ((55.0, 72.0), (58.0, 76.0), (66.0, 80.0)),  # 右葉內側
    ((84.0, 88.0), (102.0, 74.0), (92.0, 56.0)),  # 右邊圓葉
    ((80.0, 38.0), (58.0, 18.0), (50.0, 2.0)),  # 返回頂尖
]

BEZIER_STEPS = 28


def draw_spade(draw: ImageDraw.ImageDraw, cx: float, cy: float, size: float) -> None:
    """喺 (cx, cy) 為中心、邊長 size 嘅框入面畫一個葵扇。"""
    scale = size / 100
    ox = cx - size / 2
    oy = cy - size / 2

    points = []
    current = SPADE_START
    for c1, c2, end in SPADE_CURVES:
        for step in range(1, BEZIER_STEPS + 1):
            t = step / BEZIER_STEPS
            u = 1 - t
            x = u**3 * current[0] + 3 * u**2 * t * c1[0] + 3 * u * t**2 * c2[0] + t**3 * end[0]
            y = u**3 * current[1] + 3 * u**2 * t * c1[1] + 3 * u * t**2 * c2[1] + t**3 * end[1]
            points.append((ox + x * scale, oy + y * scale))
        current = end

    draw.polygon(points, fill=INK)


def render(size: int, *, maskable: bool, spade_ratio: float | None = None) -> Image.Image:
    scale = SUPERSAMPLE
    canvas = size * scale
    image = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    if maskable:
        # maskable 會被 OS 切成圓形／圓角，所以背景填滿、圖案收喺 safe zone 入面
        draw.rectangle([0, 0, canvas, canvas], fill=GOLD)
        spade = canvas * (spade_ratio if spade_ratio is not None else 0.42)
    else:
        border = canvas * 0.045
        radius = canvas * 0.24
        draw.rounded_rectangle(
            [border / 2, border / 2, canvas - border / 2, canvas - border / 2],
            radius=radius,
            fill=GOLD,
            outline=INK,
            width=round(border),
        )
        spade = canvas * (spade_ratio if spade_ratio is not None else 0.56)

    draw_spade(draw, canvas / 2, canvas / 2, spade)
    return image.resize((size, size), Image.LANCZOS)


def save(image: Image.Image, path: pathlib.Path, *, flatten: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if flatten:
        background = Image.new("RGB", image.size, GOLD[:3])
        background.paste(image, mask=image.split()[3])
        background.save(path)
    else:
        image.save(path)
    print(f"寫咗 {path.relative_to(ROOT.parent)}")


def main() -> None:
    icons = ROOT / "icons"
    save(render(192, maskable=False), icons / "icon-192.png")
    save(render(512, maskable=False), icons / "icon-512.png")
    save(render(512, maskable=True), icons / "icon-maskable-512.png")
    # iOS 唔支援透明，而且會自己加圓角，所以用滿版底、圖案可以大過 maskable
    save(render(180, maskable=True, spade_ratio=0.54), ROOT / "apple-touch-icon.png", flatten=True)


if __name__ == "__main__":
    main()
