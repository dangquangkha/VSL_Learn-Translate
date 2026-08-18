# -*- coding: utf-8 -*-
import unittest
import json
import hashlib

from ai_pipeline.generated.labels import LABELS, TOTAL_CLASSES, LABEL_HASH_SHA256, LABEL_HASH_MD5, LABEL_TO_ID, ID_TO_LABEL

class TestLabelIntegrityPipeline(unittest.TestCase):

    def test_total_classes_is_51(self):
        self.assertEqual(TOTAL_CLASSES, 51)
        self.assertEqual(len(LABELS), 51)

    def test_idle_is_at_index_0(self):
        self.assertEqual(LABELS[0]['id'], 0)
        self.assertEqual(LABELS[0]['code'], 'idle')

    def test_sequential_ids(self):
        for idx, item in enumerate(LABELS):
            self.assertEqual(item['id'], idx)

    def test_hash_format(self):
        self.assertEqual(len(LABEL_HASH_SHA256), 64)
        self.assertEqual(len(LABEL_HASH_MD5), 32)

    def test_label_to_id_mapping(self):
        self.assertEqual(LABEL_TO_ID['idle'], 0)
        self.assertEqual(ID_TO_LABEL[0], 'idle')
        self.assertEqual(len(LABEL_TO_ID), 51)
        self.assertEqual(len(ID_TO_LABEL), 51)

if __name__ == '__main__':
    unittest.main()
