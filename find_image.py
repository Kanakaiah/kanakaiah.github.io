import json

log_path = r"C:\Users\etipa\.gemini\antigravity\brain\c4e0d273-1f10-4c43-ad02-d1d0b66b3d91\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'USER_INPUT' and 'image' in data.get('content', '').lower():
                print(data.get('content'))
        except:
            pass
