import json
import re
import os

with open('src/data/guides.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Instead of parsing everything, let's just find the books and anchors blocks.
books = re.findall(r'id:\s*["\']([^"\']+)["\'][\s\S]*?anchors:\s*\[([\s\S]*?)\]\s*,?\s*(?:memorySentence|keyVerses)', content)

missing = []

for book_id, anchors_block in books:
    # Each anchor is like { ch: 1, word: "LAMB", scene: "..." }
    # Let's extract ch, word, scene
    anchors = re.findall(r'\{\s*ch:\s*(\d+),\s*word:\s*["\']([^"\']+)["\'],\s*scene:\s*["\']([^"\']+)["\']\s*\}', anchors_block)
    for ch, word, scene in anchors:
        dir_path = os.path.join('public', 'chapters', book_id)
        image_path = os.path.join(dir_path, f"ch{ch}.png")
        if not os.path.exists(image_path):
            missing.append({
                "guideId": book_id,
                "ch": ch,
                "word": word,
                "scene": scene,
                "imagePath": image_path,
                "dirPath": dir_path
            })

with open('missing_images.json', 'w', encoding='utf-8') as f:
    json.dump(missing, f, indent=2)
