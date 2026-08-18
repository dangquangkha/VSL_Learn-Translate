# Data Model: Label Schema & Artifact Types

## 1. Source Schema (`shared/labels.json`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "version": "1.0.0",
  "sha256": "auto-computed-sha256-hex",
  "md5": "auto-computed-md5-hex",
  "total_classes": 51,
  "labels": [
    {
      "id": 0,
      "code": "idle",
      "display_name_vi": "Không thực hiện ký hiệu",
      "dictionary_source": "QIPEDC"
    }
  ]
}
```

## 2. Generated TypeScript Interface (`frontend/src/generated/labels.ts`)

```typescript
export interface LabelItem {
  readonly id: number;
  readonly code: string;
  readonly displayNameVi: string;
  readonly dictionarySource: string;
}

export const LABEL_HASH_SHA256 = "...";
export const LABEL_HASH_MD5 = "...";
export const TOTAL_CLASSES = 51;
export const LABELS: ReadonlyArray<LabelItem> = [...];
```

## 3. Generated Python Artifact (`ai_pipeline/generated/labels.py`)

```python
LABEL_HASH_SHA256 = "..."
LABEL_HASH_MD5 = "..."
TOTAL_CLASSES = 51
LABELS = [...]
LABEL_TO_ID = {...}
ID_TO_LABEL = {...}
```
