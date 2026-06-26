import os
import glob
import shutil

src_dir = r"C:\Users\etipa\.gemini\antigravity\brain\c4e0d273-1f10-4c43-ad02-d1d0b66b3d91"
dest_dir = r"public\chapters\1tim"

os.makedirs(dest_dir, exist_ok=True)

files = glob.glob(os.path.join(src_dir, "1tim_ch*.png"))
for f in files:
    filename = os.path.basename(f)
    # Extract "chX" from "1tim_chX_name_id.png"
    parts = filename.split('_')
    for part in parts:
        if part.startswith("ch"):
            ch_num = part[2:]
            new_name = f"ch{ch_num}.png"
            dest_path = os.path.join(dest_dir, new_name)
            shutil.copy2(f, dest_path)
            print(f"Copied {filename} to {dest_path}")
            break
