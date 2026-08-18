# Quickstart & Validation Guide: Core Labels Pipeline

## 1. Generate Labels Command
Run the generator script to update generated TypeScript and Python files:

```bash
python scripts/generate_labels.py
```

## 2. Verification Steps

1. **Check Structural Integrity**:
   Verify that `frontend/src/generated/labels.ts` and `ai_pipeline/generated/labels.py` exist and contain 51 labels.
2. **Verify Hash Match**:
   Inspect `LABEL_HASH_SHA256` in both generated files to ensure they match `shared/labels.json` hash.
3. **Validation Failure Test**:
   Temporarily change `total_classes` in `shared/labels.json` to 50, run `python scripts/generate_labels.py`, and confirm it exits with non-zero status and flags error.
