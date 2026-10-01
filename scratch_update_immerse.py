import os
import re

file_path = "src/components/practice/ImmersedReader.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add useApp import
content = content.replace(
    "import { useWakeLock } from '../../hooks/useWakeLock';",
    "import { useWakeLock } from '../../hooks/useWakeLock';\nimport { useApp } from '../../context/AppContext';"
)

# Remove old constants
content = re.sub(r'const MIN_ZOOM = 0\.6;\nconst MAX_ZOOM = 3;\nconst ZOOM_STEP = 0\.15;', '', content)
content = re.sub(r'const clampZoom = \(z: number\) => Math\.max\(MIN_ZOOM, Math\.min\(MAX_ZOOM, z\)\);', '', content)

# Add new constants and labels function
new_constants = """const FONT_SIZE_LABELS = (size: number): string => {
  if (size <= 0.90) return 'XS';
  if (size <= 1.05) return 'S';
  if (size <= 1.20) return 'M';
  if (size <= 1.35) return 'L';
  return 'XL';
};"""
content = content.replace('const IDLE_MS = 4000;', new_constants + '\n\nconst IDLE_MS = 4000;')

# Replace setZoom state with useApp
content = content.replace(
    "const [zoom, setZoom] = useState(1);",
    "const { state, dispatch } = useApp();\n  const fontSize = state.settings.fontSize || 1;\n  const setFontSize = (size: number) => dispatch({ type: 'UPDATE_SETTINGS', payload: { fontSize: Math.max(0.85, Math.min(1.45, size)) } });"
)

# Replace pinchStartZoom
content = content.replace("const pinchStartZoom = useRef(1);", "const pinchStartFontSize = useRef(1);")
content = content.replace("pinchStartZoom.current = zoom;", "pinchStartFontSize.current = fontSize;")
content = content.replace(
    "setZoom(clampZoom(pinchStartZoom.current * (distance(e.touches) / pinchStartDist.current)));",
    "setFontSize(parseFloat((pinchStartFontSize.current * (distance(e.touches) / pinchStartDist.current)).toFixed(2)));"
)
content = content.replace("}, [zoom]);", "}, [fontSize]);")

# Replace minus button
content = re.sub(
    r'onClick=\{\(\) => setZoom\(z => clampZoom\(z - ZOOM_STEP\)\)\}\s+disabled=\{zoom <= MIN_ZOOM\}',
    "onClick={() => setFontSize(parseFloat((fontSize - 0.15).toFixed(2)))}\n              disabled={fontSize <= 0.85}",
    content
)

# Replace reset button
content = re.sub(
    r'onClick=\{\(\) => setZoom\(1\)\}\s+className="px-1 py-2 text-\[0\.6875rem\] font-bold tabular-nums text-muted hover:text-primary transition-colors w-11 text-center"\s+aria-label="Reset text size"\s+title="Reset text size"\s+>\s+\{Math\.round\(zoom \* 100\)\}%',
    """onClick={() => setFontSize(1)}
              className="px-1 py-2 text-[0.6875rem] font-bold tabular-nums text-muted hover:text-primary transition-colors min-w-11 text-center"
              aria-label="Reset text size"
              title="Reset text size"
            >
              {FONT_SIZE_LABELS(fontSize)}""",
    content
)

# Replace plus button
content = re.sub(
    r'onClick=\{\(\) => setZoom\(z => clampZoom\(z \+ ZOOM_STEP\)\)\}\s+disabled=\{zoom >= MAX_ZOOM\}',
    "onClick={() => setFontSize(parseFloat((fontSize + 0.15).toFixed(2)))}\n              disabled={fontSize >= 1.45}",
    content
)

# Replace zoomLevel prop
content = content.replace("zoomLevel={zoom}", "")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
