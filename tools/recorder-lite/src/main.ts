/**
 * recorder-lite - diem vao chinh (P1-1).
 * Luong trang thai: init -> live -> countdown -> recording -> review -> live...
 * Xem specs/010-p1-foundation/spec.md muc 4 (R-01..R-10) va plan.md.
 */
import "./style.css";
// Module dung chung @shared/landmarks co y KHONG import runtime tu
// @mediapipe/tasks-vision (neu import thi `vite build` hong - xem comment dau
// file shared/landmarks/mediapipe.ts). App nao dung thi app do import roi
// truyen vao createLandmarkers().
//
// Dung named import roi tu gom thanh object, KHONG dung `import * as`:
// namespace import keo ca module vao bundle (FaceLandmarker, ImageSegmenter...)
// lam mat tree-shaking, do len ~11 KB.
import { FilesetResolver, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { CaptureLoop, startWebcam } from "@shared/landmarks";
import { assembleFrame, detectPresence } from "@shared/landmarks";
import { allLabels, defaultDemoLabels } from "./labels";
import { createLandmarkers, type Landmarkers } from "@shared/landmarks";
import {
  incrementCount,
  loadCounts,
  loadParticipantCode,
  saveCounts,
  saveParticipantCode,
  type SignCounts,
} from "./session";
import { computeSummary } from "./summary";
import { RECORDER_VERSION, type FrameSample, type LabelEntry, type RecordingSummary } from "./types";
import { formatPercent, renderApp, renderCounters, renderSignOptions, type AppElements } from "./ui";
import { buildVslmFile, downloadVslmFile } from "@shared/landmarks";

const RECORDING_DURATION_MS = 3000;
const COUNTDOWN_STEPS = [3, 2, 1];
const FPS_WINDOW_SIZE = 30;

type Phase = "init" | "live" | "countdown" | "recording" | "review";

interface AppState {
  phase: Phase;
  participantCode: string;
  labelsShown: LabelEntry[];
  selectedCode: string;
  counts: SignCounts;
  videoWidth: number;
  videoHeight: number;
  frames: FrameSample[];
  recordingStartMs: number;
  recordingStartIso: string;
  summary: RecordingSummary | null;
  fpsTimestamps: number[];
  /** Ghi song song mot doan video CHI DE XEM LAI o man Review — doi chieu voi
   *  video mau QIPEDC. Khong ghi vao file .vslm, khong roi khoi may. */
  previewRecorder: MediaRecorder | null;
  previewChunks: Blob[];
  /** objectURL cua doan vua quay; phai revoke truoc khi tao cai moi, neu khong
   *  quay 135 clip mot phien se giu lai 135 blob trong bo nho. */
  previewUrl: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizedParticipantCode(state: AppState): string {
  return state.participantCode.trim();
}

function main(): void {
  const root = document.getElementById("app");
  if (!root) throw new Error("Khong tim thay #app");
  const el = renderApp(root);

  const initialParticipant = loadParticipantCode();
  const state: AppState = {
    phase: "init",
    participantCode: initialParticipant,
    labelsShown: defaultDemoLabels,
    selectedCode: defaultDemoLabels[0]?.code ?? "idle",
    counts: loadCounts(initialParticipant.trim()),
    videoWidth: 0,
    videoHeight: 0,
    frames: [],
    recordingStartMs: 0,
    recordingStartIso: "",
    summary: null,
    fpsTimestamps: [],
    previewRecorder: null,
    previewChunks: [],
    previewUrl: null,
  };

  el.participantInput.value = initialParticipant;
  renderSignOptions(el.signSelect, state.labelsShown, state.selectedCode);
  renderCounters(el.countersBody, state.counts, allLabels);
  setStatus(el, "Đang khởi tạo webcam và model MediaPipe...", false);
  updateRecordButtonEnabled(el, state);

  wireStaticEvents(el, state);

  let landmarkers: Landmarkers | null = null;
  let captureLoop: CaptureLoop | null = null;

  void (async () => {
    try {
      const [videoSize, loaded] = await Promise.all([
        startWebcam(el.video),
        createLandmarkers(
          { FilesetResolver, HandLandmarker, PoseLandmarker },
          (msg) => setStatus(el, msg, false),
        ),
      ]);
      state.videoWidth = videoSize.width;
      state.videoHeight = videoSize.height;
      landmarkers = loaded;

      captureLoop = new CaptureLoop(el.video, landmarkers.handLandmarker, landmarkers.poseLandmarker);
      captureLoop.start((frame) => {
        const presence = detectPresence(frame.handResult, frame.poseResult);
        updateLiveStats(el, state, frame.capturedAtMs, presence);

        if (state.phase === "recording") {
          const timestampSec = (frame.capturedAtMs - state.recordingStartMs) / 1000;
          state.frames.push(assembleFrame(frame.handResult, frame.poseResult, timestampSec));
          el.recordingElapsed.textContent = `${timestampSec.toFixed(1)}s`;
        }
      });

      state.phase = "live";
      setStatus(el, `Sẵn sàng - độ phân giải ${videoSize.width}x${videoSize.height}.`, false);
      updateRecordButtonEnabled(el, state);
    } catch (err) {
      console.error("[recorder-lite] Khoi tao that bai", err);
      const message =
        err instanceof Error ? err.message : "Lỗi không xác định khi khởi tạo webcam/model.";
      setStatus(
        el,
        `Không khởi tạo được webcam/MediaPipe: ${message}. Hãy cấp quyền camera rồi tải lại trang.`,
        true,
      );
    }
  })();

  el.recordBtn.addEventListener("click", () => {
    void handleRecordClick(el, state);
  });

  el.keepBtn.addEventListener("click", () => {
    handleKeep(el, state);
  });

  el.retakeBtn.addEventListener("click", () => {
    handleRetake(el, state);
  });
}

function wireStaticEvents(el: AppElements, state: AppState): void {
  el.participantInput.addEventListener("input", () => {
    state.participantCode = el.participantInput.value;
    saveParticipantCode(state.participantCode);
    state.counts = loadCounts(normalizedParticipantCode(state));
    renderCounters(el.countersBody, state.counts, allLabels);
    updateRecordButtonEnabled(el, state);
  });

  el.signSelect.addEventListener("change", () => {
    state.selectedCode = el.signSelect.value;
  });

  el.showAllLabels.addEventListener("change", () => {
    state.labelsShown = el.showAllLabels.checked ? allLabels : defaultDemoLabels;
    renderSignOptions(el.signSelect, state.labelsShown, state.selectedCode);
    state.selectedCode = el.signSelect.value;
  });
}

function setStatus(el: AppElements, message: string, isError: boolean): void {
  el.statusMsg.textContent = message;
  el.statusMsg.classList.toggle("error", isError);
}

function updateRecordButtonEnabled(el: AppElements, state: AppState): void {
  const canRecord = state.phase === "live" && normalizedParticipantCode(state).length > 0;
  const locked = state.phase === "countdown" || state.phase === "recording";
  el.recordBtn.disabled = !canRecord;
  el.participantInput.disabled = locked;
  el.signSelect.disabled = locked;
  el.showAllLabels.disabled = locked;
}

function updateLiveStats(
  el: AppElements,
  state: AppState,
  capturedAtMs: number,
  presence: { pose: boolean; leftHand: boolean; rightHand: boolean },
): void {
  state.fpsTimestamps.push(capturedAtMs);
  if (state.fpsTimestamps.length > FPS_WINDOW_SIZE) {
    state.fpsTimestamps.shift();
  }
  const fps = computeRollingFps(state.fpsTimestamps);

  el.statFps.textContent = fps > 0 ? fps.toFixed(1) : "-";
  el.statPose.textContent = presence.pose ? "Có" : "Không";
  el.statLeft.textContent = presence.leftHand ? "Có" : "Không";
  el.statRight.textContent = presence.rightHand ? "Có" : "Không";
}

function computeRollingFps(timestamps: number[]): number {
  if (timestamps.length < 2) return 0;
  const first = timestamps[0]!;
  const last = timestamps[timestamps.length - 1]!;
  const elapsedSec = (last - first) / 1000;
  if (elapsedSec <= 0) return 0;
  return (timestamps.length - 1) / elapsedSec;
}

async function handleRecordClick(el: AppElements, state: AppState): Promise<void> {
  if (state.phase !== "live") return;
  if (normalizedParticipantCode(state).length === 0) return;

  state.phase = "countdown";
  updateRecordButtonEnabled(el, state);
  el.reviewPanel.classList.add("hidden");
  el.countdownOverlay.classList.remove("hidden");

  for (const step of COUNTDOWN_STEPS) {
    el.countdownNumber.textContent = String(step);
    await sleep(1000);
  }
  el.countdownOverlay.classList.add("hidden");

  startRecording(el, state);
}

/**
 * Chon mimeType video ma trinh duyet ho tro. Chrome uu tien VP9, nhung mot so
 * may/driver chi co VP8 — thu lan luot roi lui ve mac dinh cua trinh duyet.
 */
function pickPreviewMimeType(): string | undefined {
  const ungVien = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const mime of ungVien) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined;
}

/**
 * Bat dau ghi doan xem lai. Chay SONG SONG voi vong lap MediaPipe tren cung
 * stream webcam — khong doc them khung hinh nao, chi encode.
 *
 * That bai o day KHONG duoc lam hong lan ghi: landmark moi la thu that su can.
 * Doan video chi de nguoi quay doi chieu voi video mau, nen moi loi deu nuot va
 * chi ghi console.
 */
function startPreviewRecording(el: AppElements, state: AppState): void {
  state.previewChunks = [];
  state.previewRecorder = null;

  const stream = el.video.srcObject as MediaStream | null;
  if (!stream || typeof MediaRecorder === "undefined") return;

  try {
    const mimeType = pickPreviewMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      // Du de nhin ro hinh tay, khong can chat luong cao vi khong luu lai.
      videoBitsPerSecond: 2_000_000,
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) state.previewChunks.push(event.data);
    };
    recorder.start();
    state.previewRecorder = recorder;
  } catch (err) {
    console.warn("[recorder-lite] Khong ghi duoc doan xem lai:", err);
    state.previewRecorder = null;
  }
}

/** Dung ghi va gan doan vua quay vao the <video> o man Review. */
function finishPreviewRecording(el: AppElements, state: AppState): void {
  const recorder = state.previewRecorder;
  state.previewRecorder = null;

  if (!recorder || recorder.state === "inactive") {
    el.reviewVideo.classList.add("hidden");
    return;
  }

  recorder.onstop = () => {
    if (state.previewChunks.length === 0) {
      el.reviewVideo.classList.add("hidden");
      return;
    }
    const blob = new Blob(state.previewChunks, {
      type: state.previewChunks[0]?.type || "video/webm",
    });
    revokePreviewUrl(state);
    state.previewUrl = URL.createObjectURL(blob);
    el.reviewVideo.src = state.previewUrl;
    el.reviewVideo.classList.remove("hidden");
    void el.reviewVideo.play().catch(() => {
      /* autoplay bi chan thi nguoi dung tu bam play */
    });
  };

  try {
    recorder.stop();
  } catch (err) {
    console.warn("[recorder-lite] Loi khi dung ghi doan xem lai:", err);
    el.reviewVideo.classList.add("hidden");
  }
}

/** Giai phong objectURL cu — quay 135 clip mot phien ma khong revoke la giu lai
 *  135 blob video trong bo nho. */
function revokePreviewUrl(state: AppState): void {
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
  }
}

function startRecording(el: AppElements, state: AppState): void {
  state.phase = "recording";
  state.frames = [];
  state.recordingStartMs = performance.now();
  state.recordingStartIso = new Date().toISOString();
  el.recordingBadge.classList.remove("hidden");
  el.recordingElapsed.textContent = "0.0s";

  startPreviewRecording(el, state);

  setTimeout(() => stopRecording(el, state), RECORDING_DURATION_MS);
}

function stopRecording(el: AppElements, state: AppState): void {
  const durationMs = performance.now() - state.recordingStartMs;
  el.recordingBadge.classList.add("hidden");

  finishPreviewRecording(el, state);

  const summary = computeSummary(state.frames, durationMs);
  state.summary = summary;
  state.phase = "review";
  updateRecordButtonEnabled(el, state);

  renderReview(el, summary);
}

function renderReview(el: AppElements, summary: RecordingSummary): void {
  el.reviewFrameCount.textContent = String(summary.frameCount);
  el.reviewFpsAvg.textContent = summary.fpsAvg.toFixed(1);
  el.reviewLeftRatio.textContent = formatPercent(summary.leftHandRatio);
  el.reviewRightRatio.textContent = formatPercent(summary.rightHandRatio);
  el.reviewBothMissingRatio.textContent = formatPercent(summary.bothHandsMissingRatio);

  const warnings: string[] = [];
  if (summary.lowFps) {
    warnings.push(
      `Cảnh báo: fps trung bình ${summary.fpsAvg.toFixed(1)} < 15 - máy có thể đang quá tải, cân nhắc quay lại.`,
    );
  }
  if (summary.tooManyMissingHands) {
    warnings.push(
      `Cảnh báo: đoạn liên tục thấy tay chỉ dài ${summary.longestHandRunSec.toFixed(1)}s ` +
        `(cần ≥ 1s) - có thể tay bị mất dấu giữa động tác. Mất tay ở đầu/cuối clip ` +
        `là bình thường, không cần quay lại.`,
    );
  }
  el.reviewWarnings.innerHTML = warnings.map((w) => `<div class="warning">${w}</div>`).join("");

  el.reviewPanel.classList.remove("hidden");
}

function handleKeep(el: AppElements, state: AppState): void {
  if (state.phase !== "review") return;
  const participantCode = normalizedParticipantCode(state);
  const label = allLabels.find((l) => l.code === state.selectedCode);
  if (!label) {
    setStatus(el, `Không tìm thấy ký hiệu "${state.selectedCode}" trong shared/labels.json.`, true);
    return;
  }

  const durationMs = state.summary?.durationMs ?? RECORDING_DURATION_MS;
  const fpsAvg = state.summary?.fpsAvg ?? 0;

  const file = buildVslmFile({
    participantCode,
    signCode: label.code,
    labelIndex: label.id,
    frames: state.frames,
    durationMs,
    fpsAvg,
    videoWidth: state.videoWidth,
    videoHeight: state.videoHeight,
    recordedAt: state.recordingStartIso,
    recorderVersion: RECORDER_VERSION,
  });

  downloadVslmFile(file);

  state.counts = incrementCount(state.counts, label.code);
  saveCounts(participantCode, state.counts);
  renderCounters(el.countersBody, state.counts, allLabels);

  backToLive(el, state);
  setStatus(el, `Đã lưu ${file.fileName}`, false);
}

function handleRetake(el: AppElements, state: AppState): void {
  if (state.phase !== "review") return;
  backToLive(el, state);
}

function backToLive(el: AppElements, state: AppState): void {
  state.frames = [];
  state.summary = null;
  state.phase = "live";
  el.reviewPanel.classList.add("hidden");

  // Ngung phat va tra lai bo nho truoc khi sang lan ghi tiep theo.
  el.reviewVideo.pause();
  el.reviewVideo.removeAttribute("src");
  el.reviewVideo.load();
  revokePreviewUrl(state);
  state.previewChunks = [];

  updateRecordButtonEnabled(el, state);
}

main();
