# -*- coding: utf-8 -*-
import pathlib
import json
import hashlib
import tempfile
import unittest

from scripts.generate_labels import (
    normalize_json_string,
    calculate_hashes,
    validate_label_schema,
    generate_ts,
    generate_py
)
from ai_pipeline.generated.labels import (
    LABELS,
    TOTAL_CLASSES,
    LABEL_HASH_SHA256,
    LABEL_HASH_MD5,
    LABEL_TO_ID,
    ID_TO_LABEL
)

class TestLabelsPipelineFull(unittest.TestCase):

    def test_total_classes_and_idle_index(self):
        self.assertEqual(TOTAL_CLASSES, 51)
        self.assertEqual(len(LABELS), 51)
        self.assertEqual(LABELS[0]['id'], 0)
        self.assertEqual(LABELS[0]['code'], 'idle')

    def test_hashes_deterministic(self):
        source_data = json.loads(pathlib.Path('shared/labels.json').read_text(encoding='utf-8'))
        norm_str = normalize_json_string(source_data)
        sha256_val, md5_val = calculate_hashes(norm_str)
        self.assertEqual(sha256_val, LABEL_HASH_SHA256)
        self.assertEqual(md5_val, LABEL_HASH_MD5)

    def test_schema_validator_rejection_bad_count(self):
        bad_data = {
            'version': '1.0.0',
            'total_classes': 50,
            'labels': [{'id': i, 'code': f'sign_{i}', 'display_name_vi': 'test', 'dictionary_source': 'QIPEDC'} for i in range(50)]
        }
        self.assertFalse(validate_label_schema(bad_data))

    def test_schema_validator_rejection_missing_idle(self):
        bad_data = {
            'version': '1.0.0',
            'total_classes': 51,
            'labels': [{'id': i, 'code': f'sign_{i}', 'display_name_vi': 'test', 'dictionary_source': 'QIPEDC'} for i in range(51)]
        }
        self.assertFalse(validate_label_schema(bad_data))

    def test_generator_artifacts(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ts_tmp = pathlib.Path(tmpdir) / 'labels.ts'
            py_tmp = pathlib.Path(tmpdir) / 'labels.py'
            data = json.loads(pathlib.Path('shared/labels.json').read_text(encoding='utf-8'))
            norm = normalize_json_string(data)
            sha, md5 = calculate_hashes(norm)
            generate_ts(data, sha, md5, ts_tmp)
            generate_py(data, sha, md5, py_tmp)
            self.assertTrue(ts_tmp.exists())
            self.assertTrue(py_tmp.exists())

if __name__ == '__main__':
    unittest.main()
