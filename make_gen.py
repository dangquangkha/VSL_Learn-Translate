import json 
import hashlib 
import sys 
import pathlib 
data = json.loads(pathlib.Path('shared/labels.json').read_text(encoding='utf-8')) 
json_str = json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False).replace('\r\n', '\n').replace('\r', '\n') 
b = json_str.encode('utf-8') 
sha256 = hashlib.sha256(b).hexdigest() 
md5 = hashlib.md5(b).hexdigest() 
print('HASHES', sha256, md5) 
