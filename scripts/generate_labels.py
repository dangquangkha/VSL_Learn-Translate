# -*- coding: utf-8 -*-
import json
import hashlib
import sys
import pathlib

def normalize_json_string(data_dict):
    json_str = json.dumps(data_dict, indent=2, sort_keys=True, ensure_ascii=False)
    return json_str.replace('\r\n', '\n').replace('\r', '\n')

def calculate_hashes(text_content):
    utf8_bytes = text_content.encode('utf-8')
    return hashlib.sha256(utf8_bytes).hexdigest(), hashlib.md5(utf8_bytes).hexdigest()

def validate_label_schema(data):
    errors = []
    if data.get('total_classes') != 51:
        errors.append('total_classes != 51')
    labels = data.get('labels', [])
    if len(labels) != 51:
        errors.append('labels length != 51')
    if len(labels) > 0 and labels[0].get('code') != 'idle':
        errors.append('index 0 != idle')
    seen = set()
    for idx, item in enumerate(labels):
        if item.get('id') != idx:
            errors.append(f'id mismatch at {idx}')
        code = item.get('code')
        if not code or code in seen:
            errors.append(f'invalid or dup code at {idx}')
        else:
            seen.add(code)
    if errors:
        print('ERRORS:', errors, file=sys.stderr)
        return False
    return True

def generate_ts(data, sha256, md5, path):
    labels = data['labels']
    q = chr(34)
    lines = [
        '// AUTO-GENERATED CODE - DO NOT EDIT MANUALLY',
        '// Generated from shared/labels.json by scripts/generate_labels.py',
        '',
        'export interface LabelItem {',
        '  readonly id: number;',
        '  readonly code: string;',
        '  readonly displayNameVi: string;',
        '  readonly dictionarySource: string;',
        '}',
        '',
        'export const LABEL_HASH_SHA256 = ' + q + sha256 + q + ';',
        'export const LABEL_HASH_MD5 = ' + q + md5 + q + ';',
        'export const TOTAL_CLASSES = ' + str(len(labels)) + ';',
        '',
        'export const LABELS: ReadonlyArray<LabelItem> = Object.freeze(['
    ]
    for item in labels:
        c = item['code']
        n = item['display_name_vi']
        s = item['dictionary_source']
        item_json = json.dumps({'id': item['id'], 'code': c, 'displayNameVi': n, 'dictionarySource': s}, ensure_ascii=False)
        lines.append('  ' + item_json + ',')
    lines.append(']);')
    lines.append('')
    pathlib.Path(path).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(path).write_text('\n'.join(lines) + '\n', encoding='utf-8')

def generate_py(data, sha256, md5, path):
    labels = data['labels']
    q = chr(34)
    lines = [
        '# AUTO-GENERATED CODE - DO NOT EDIT MANUALLY',
        '# Generated from shared/labels.json by scripts/generate_labels.py',
        '',
        'LABEL_HASH_SHA256 = ' + q + sha256 + q,
        'LABEL_HASH_MD5 = ' + q + md5 + q,
        'TOTAL_CLASSES = ' + str(len(labels)),
        '',
        'LABELS = ('
    ]
    for item in labels:
        c = item['code']
        n = item['display_name_vi']
        s = item['dictionary_source']
        item_json = json.dumps({'id': item['id'], 'code': c, 'display_name_vi': n, 'dictionary_source': s}, ensure_ascii=False)
        lines.append('    ' + item_json + ',')
    lines.append(')')
    lines.append('')
    lines.append('LABEL_TO_ID = {item[' + q + 'code' + q + ']: item[' + q + 'id' + q + '] for item in LABELS}')
    lines.append('ID_TO_LABEL = {item[' + q + 'id' + q + ']: item[' + q + 'code' + q + '] for item in LABELS}')
    lines.append('')
    pathlib.Path(path).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(path).write_text('\n'.join(lines) + '\n', encoding='utf-8')

def main():
    p = pathlib.Path('shared/labels.json')
    if not p.exists():
        print('ERROR: shared/labels.json missing', file=sys.stderr)
        sys.exit(1)
    data = json.loads(p.read_text(encoding='utf-8'))
    if not validate_label_schema(data):
        sys.exit(1)
    sha256, md5 = calculate_hashes(normalize_json_string(data))
    generate_ts(data, sha256, md5, 'frontend/src/generated/labels.ts')
    generate_py(data, sha256, md5, 'ai_pipeline/generated/labels.py')
    print('GENERATE_SUCCESS', sha256, md5)

if __name__ == '__main__':
    main()
