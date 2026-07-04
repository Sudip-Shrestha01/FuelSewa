import io, base64
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def generate_heatmap(cm, labels, title="Confusion Matrix - Random Forest"):
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

    # Labels
    for i, label in enumerate(labels):
        bbox = draw.textbbox((0, 0), label, font=font_small)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((pad - tw - 10, pad + i * cell_h + 40 + (cell_h - th) / 2),
                  label, fill=(50, 50, 50), font=font_small)
        draw.text((pad + i * cell_w + (cell_w - tw) / 2, pad + 40 + rows * cell_h + 5),
                  label, fill=(50, 50, 50), font=font_small)

    # Axis labels
    draw.text((pad, pad + 40 + rows * cell_h + 30), "Predicted", fill=(50, 50, 50), font=font_small)
    draw.text((10, pad + 40 + rows * cell_h // 2), "Actual", fill=(50, 50, 50), font=font_small)

    # Title
    bbox = draw.textbbox((0, 0), title, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((img_w - tw) / 2, (pad - 40) // 2 - th // 2 + 10),
              title, fill=(0, 0, 0), font=font)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


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


def generate_feature_importance(feature_names, importances, title="Feature Importance"):
    sorted_data = sorted(zip(feature_names, importances), key=lambda x: x[1])
    names, vals = zip(*sorted_data) if sorted_data else ([], [])

    bar_h = 28
    label_w = 140
    pad = 40
    chart_w = 300
    total_w = label_w + chart_w + pad * 2
    total_h = len(names) * bar_h + pad * 2 + 40

    if total_h < 200:
        total_h = 200

    img = Image.new("RGB", (max(total_w, 500), total_h), "white")
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 11)
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
    except Exception:
        font = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_title = ImageFont.load_default()

    max_val = max(vals) if vals else 1
    colors_list = [
        (30, 100, 200), (40, 130, 210), (55, 155, 220),
        (70, 175, 230), (95, 195, 240), (130, 210, 250),
    ]

    for idx, (name, val) in enumerate(reversed(sorted_data)):
        y = pad + idx * bar_h + 40
        bar_len = int((val / max_val) * chart_w) if max_val > 0 else 0
        color = colors_list[idx % len(colors_list)]

        draw.text((pad, y + 2), name.replace("_", " "), fill=(50, 50, 50), font=font_small)
        if bar_len > 0:
            draw.rectangle([pad + label_w, y, pad + label_w + max(bar_len, 3), y + bar_h - 4],
                           fill=color, outline=(color[0] // 2, color[1] // 2, color[2] // 2))

        pct_text = f"{val * 100:.1f}%"
        bbox = draw.textbbox((0, 0), pct_text, font=font_small)
        draw.text((pad + label_w + bar_len + 5, y + 2),
                  pct_text, fill=(80, 80, 80), font=font_small)

    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((total_w - tw) / 2, (pad - 10) // 2),
              title, fill=(0, 0, 0), font=font_title)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")
