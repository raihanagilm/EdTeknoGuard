import json

lines = open(r'C:\Users\r\.gemini\antigravity-ide\brain\ef0fa336-24ab-41e3-9d83-e336224caa48\.system_generated\logs\transcript.jsonl', encoding='utf-8').readlines()
for i, l in enumerate(lines):
    if 'tanggal' in l.lower():
        obj = json.loads(l)
        t = obj.get('type')
        if t in ('USER_INPUT', 'PLANNER_RESPONSE'):
            c = str(obj.get('content'))[:180].replace('\n', ' ')
            print(f"{t} [{i}]: {c}")
