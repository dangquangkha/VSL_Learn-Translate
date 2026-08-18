// Client-side Label Hash Verifier Service (EARS §FR-006)

import { LABEL_HASH_SHA256 } from '../generated/labels';

export class LabelMismatchError extends Error {
  constructor(public modelHash: string, public clientHash: string) {
    super(`[CRITICAL] Label Hash Mismatch: Model (${modelHash}) vs Client (${clientHash}). Model initialization rejected.`);
    this.name = 'LabelMismatchError';
  }
}

export function verifyModelLabelHash(onnxMetadataHash: string): boolean {
  if (!onnxMetadataHash || typeof onnxMetadataHash !== 'string') {
    throw new Error('[ERROR] Invalid model hash metadata: ' + String(onnxMetadataHash));
  }

  const normalizedModelHash = onnxMetadataHash.trim().toLowerCase();
  const normalizedClientHash = LABEL_HASH_SHA256.trim().toLowerCase();

  if (normalizedModelHash !== normalizedClientHash) {
    throw new LabelMismatchError(normalizedModelHash, normalizedClientHash);
  }

  return true;
}