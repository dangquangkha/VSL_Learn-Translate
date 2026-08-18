# Research: Core Labels & Generator Pipeline Hash & Serialization Strategy

## Decision 1: Deterministic Hash Calculation
- **Decision**: Hash calculation (SHA256 and MD5) MUST be performed on a deterministically formatted JSON string with normalized LF line endings (`\n`).
- **Rationale**: Ensures hash consistency across operating systems (Windows CRLF vs Linux/macOS LF).
- **Alternatives Considered**: Raw byte hashing without normalization (rejected due to git CRLF conversion issues across OSs).

## Decision 2: Artifact Code Generation Format
- **TypeScript (`labels.ts`)**: Exports a frozen `LABELS` array, type `LabelItem`, `LABEL_HASH_SHA256`, and `LABEL_HASH_MD5`.
- **Python (`labels.py`)**: Exports a tuple/list `LABELS`, dict `LABEL_TO_ID`, `ID_TO_LABEL`, `LABEL_HASH_SHA256`, and `LABEL_HASH_MD5`.
- **Rationale**: Provides native autocomplete and zero-overhead indexing for both client-side JS and PyTorch training graph.
