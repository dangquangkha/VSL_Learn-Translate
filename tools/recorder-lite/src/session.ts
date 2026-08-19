/**
 * Luu tru phia client: participant_code (R-02) + bo dem so lan da quay moi
 * ky hieu trong phien (R-09). Dung localStorage de khong mat du lieu neu
 * lo tai lai trang (khong bat buoc trong spec nhung an toan hon cho nguoi quay).
 */
const PARTICIPANT_CODE_KEY = "vsl-recorder-lite:participant_code";
const countsKey = (participantCode: string): string =>
  `vsl-recorder-lite:counts:${participantCode}`;

export function loadParticipantCode(): string {
  return localStorage.getItem(PARTICIPANT_CODE_KEY) ?? "";
}

export function saveParticipantCode(code: string): void {
  localStorage.setItem(PARTICIPANT_CODE_KEY, code);
}

export type SignCounts = Record<string, number>;

export function loadCounts(participantCode: string): SignCounts {
  if (!participantCode) return {};
  const raw = localStorage.getItem(countsKey(participantCode));
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as SignCounts;
    }
  } catch (err) {
    console.warn("[recorder-lite] Khong doc duoc bo dem da luu, bat dau lai tu 0.", err);
  }
  return {};
}

export function saveCounts(participantCode: string, counts: SignCounts): void {
  if (!participantCode) return;
  localStorage.setItem(countsKey(participantCode), JSON.stringify(counts));
}

export function incrementCount(counts: SignCounts, signCode: string): SignCounts {
  const next = { ...counts };
  next[signCode] = (next[signCode] ?? 0) + 1;
  return next;
}
