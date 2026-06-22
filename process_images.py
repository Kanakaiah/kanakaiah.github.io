import os
import glob
import shutil

src_dir = r"C:\Users\etipa\.gemini\antigravity\brain\5de79edc-87ed-498c-8409-3a1259e17680"
dest_base = r"C:\Users\etipa\.gemini\antigravity\scratch\kanakaiah_git\public\chapters"

pngs = glob.glob(os.path.join(src_dir, "*.png"))

for png in pngs:
    filename = os.path.basename(png)
    parts = filename.split('_')
    if len(parts) >= 3:
        book = parts[0]
        ch = parts[1]
        
        book_dir = os.path.join(dest_base, book)
        os.makedirs(book_dir, exist_ok=True)
        
        dest_file = os.path.join(book_dir, f"ch{ch}.png")
        shutil.move(png, dest_file)
        print(f"Moved {filename} to {book}/ch{ch}.png")
