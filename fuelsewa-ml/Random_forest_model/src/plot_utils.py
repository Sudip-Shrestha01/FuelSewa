import numpy as np
from PIL import Image, ImageDraw, ImageFont


def save_confusion_matrix_to_file(cm, labels, filepath, title="Confusion Matrix - Random Forest"):
    rows, cols = len(cm), len(cm[0])
    cell_w, cell_h = 120, 80
    pad = 60
    font_size = 16

    img_w = pad * 2 + cols * cell_w
    img_h = pad * 2 + rows * cell_h + 40

    img = Image.new("RGB", (img_w, img_h), "white")
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13)
    except Exception:
        font = ImageFont.load_default()
        font_small = ImageFont.load_default()

    cm_array = np.array(cm, dtype=float)
    cm_max = cm_array.max() if cm_array.max() > 0 else 1

    for i in range(rows):
        for j in range(cols):
            x = pad + j * cell_w
            y = pad + i * cell_h + 40
            val = cm[i][j]
            intensity = 1.0 - (val / cm_max) * 0.7
            r = int(255 * intensity)
            g = int(min(255, 255 * intensity * 1.3))
            b = int(255 * intensity)
            draw.rectangle([x, y, x + cell_w, y + cell_h], fill=(r, g, b), outline=(200, 200, 200))

            text = str(int(val))
            bbox = draw.textbbox((0, 0), text, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            draw.text((x + (cell_w - tw) / 2, y + (cell_h - th) / 2),
                      text, fill=(0, 0, 0), font=font)

    for i, label in enumerate(labels):
        bbox = draw.textbbox((0, 0), label, font=font_small)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((pad - tw - 10, pad + i * cell_h + 40 + (cell_h - th) / 2),
                  label, fill=(50, 50, 50), font=font_small)
        draw.text((pad + i * cell_w + (cell_w - tw) / 2, pad + 40 + rows * cell_h + 5),
                  label, fill=(50, 50, 50), font=font_small)

    draw.text((pad, pad + 40 + rows * cell_h + 30), "Predicted", fill=(50, 50, 50), font=font_small)
    draw.text((10, pad + 40 + rows * cell_h // 2), "Actual", fill=(50, 50, 50), font=font_small)

    bbox = draw.textbbox((0, 0), title, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((img_w - tw) / 2, (pad - 40) // 2 - th // 2 + 10),
              title, fill=(0, 0, 0), font=font)

    img.save(filepath, format="PNG")
