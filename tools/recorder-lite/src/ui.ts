/**
 * Dung DOM cho recorder-lite: dung mot template tinh + cac ham render nho,
 * khong dung framework (theo quyet dinh trong plan.md).
 */
import type { LabelEntry } from "./types";
import type { SignCounts } from "./session";

export interface AppElements {
  participantInput: HTMLInputElement;
  statusMsg: HTMLElement;
  video: HTMLVideoElement;
  countdownOverlay: HTMLElement;
  countdownNumber: HTMLElement;
  recordingBadge: HTMLElement;
  recordingElapsed: HTMLElement;
  statFps: HTMLElement;
  statPose: HTMLElement;
  statLeft: HTMLElement;
  statRight: HTMLElement;
  signSelect: HTMLSelectElement;
  showAllLabels: HTMLInputElement;
  recordBtn: HTMLButtonElement;
  reviewPanel: HTMLElement;
  reviewCanvas: HTMLCanvasElement;
  reviewVideo: HTMLVideoElement;
  reviewVideoCol: HTMLElement;
  recordVideoToggle: HTMLInputElement;
  reviewFpsBefore: HTMLElement;
  reviewFrameCount: HTMLElement;
  reviewFpsAvg: HTMLElement;
  reviewLeftRatio: HTMLElement;
  reviewRightRatio: HTMLElement;
  reviewBothMissingRatio: HTMLElement;
  reviewWarnings: HTMLElement;
  keepBtn: HTMLButtonElement;
  retakeBtn: HTMLButtonElement;
  countersBody: HTMLElement;
}

const TEMPLATE = `
  <div class="app">
    <header class="app-header">
      <div class="title-row">
        <h1>VSL Recorder Lite</h1>
        <span class="subtitle">P1-1 - công cụ quay tạm, không phải Recorder chính thức</span>
      </div>
      <div class="participant-row">
        <label for="participantCode">Mã người quay</label>
        <input id="participantCode" type="text" placeholder="VD: P01" autocomplete="off" />
        <span id="statusMsg" class="status-msg"></span>
      </div>
    </header>

    <main class="app-main">
      <section class="video-panel">
        <div class="video-wrap">
          <video id="video" autoplay playsinline muted></video>
          <div id="countdownOverlay" class="countdown-overlay hidden">
            <span id="countdownNumber">3</span>
          </div>
          <div id="recordingBadge" class="recording-badge hidden">
            ● ĐANG GHI <span id="recordingElapsed">0.0s</span>
          </div>
        </div>
        <div class="live-stats">
          <span class="stat">FPS <b id="statFps">-</b></span>
          <span class="stat">Pose <b id="statPose">-</b></span>
          <span class="stat">Tay trái <b id="statLeft">-</b></span>
          <span class="stat">Tay phải <b id="statRight">-</b></span>
        </div>
      </section>

      <section class="control-panel">
        <div class="sign-picker">
          <label for="signSelect">Ký hiệu đang quay</label>
          <select id="signSelect"></select>
          <label class="checkbox-row">
            <input type="checkbox" id="showAllLabels" />
            Hiện tất cả 51 ký hiệu (thay vì 10 ký hiệu demo)
          </label>
          <label class="checkbox-row">
            <input type="checkbox" id="recordVideoToggle" checked />
            Ghi video xem lại <span class="hint">(tắt nếu fps tụt)</span>
          </label>
        </div>

        <button id="recordBtn" class="record-btn" disabled>Ghi (3 giây)</button>

        <div id="reviewPanel" class="review-panel hidden">
          <h2>Kết quả lần ghi</h2>
          <div class="review-media">
            <div class="review-media-col">
              <span class="review-media-label">Model nhìn thấy</span>
              <canvas id="reviewCanvas" class="review-canvas" width="320" height="180"></canvas>
            </div>
            <div class="review-media-col" id="reviewVideoCol">
              <span class="review-media-label">Video thật</span>
              <video id="reviewVideo" class="review-video" playsinline autoplay loop muted></video>
            </div>
          </div>
          <p class="review-video-note">
            Đây là <b>đúng thứ model nhìn thấy</b> — không phải video. Tay bị mất dấu
            sẽ biến mất khỏi khung xương. Đối chiếu hình tay và hướng chuyển động với
            video mẫu QIPEDC.
          </p>
          <ul class="review-list">
            <li>Số khung hình: <b id="reviewFrameCount"></b></li>
            <li>FPS trong lúc ghi: <b id="reviewFpsAvg"></b></li>
            <li>FPS ngay trước khi ghi: <b id="reviewFpsBefore"></b> <span class="hint">(chênh lệch = chi phí ghi video)</span></li>
            <li>Tỉ lệ thấy tay trái: <b id="reviewLeftRatio"></b></li>
            <li>Tỉ lệ thấy tay phải: <b id="reviewRightRatio"></b></li>
            <li>Tỉ lệ mất cả hai tay: <b id="reviewBothMissingRatio"></b></li>
          </ul>
          <div id="reviewWarnings" class="warnings"></div>
          <div class="review-actions">
            <button id="keepBtn" class="keep-btn">Giữ (tải về .vslm)</button>
            <button id="retakeBtn" class="retake-btn">Quay lại</button>
          </div>
        </div>

        <div class="counters">
          <h2>Đã quay trong phiên này</h2>
          <table class="counters-table">
            <thead>
              <tr><th>Ký hiệu</th><th>Số lần</th></tr>
            </thead>
            <tbody id="countersBody">
              <tr><td colspan="2" class="empty-row">Chưa quay ký hiệu nào</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
`;

export function renderApp(root: HTMLElement): AppElements {
  root.innerHTML = TEMPLATE;
  return {
    participantInput: mustGet<HTMLInputElement>("participantCode"),
    statusMsg: mustGet("statusMsg"),
    video: mustGet<HTMLVideoElement>("video"),
    countdownOverlay: mustGet("countdownOverlay"),
    countdownNumber: mustGet("countdownNumber"),
    recordingBadge: mustGet("recordingBadge"),
    recordingElapsed: mustGet("recordingElapsed"),
    statFps: mustGet("statFps"),
    statPose: mustGet("statPose"),
    statLeft: mustGet("statLeft"),
    statRight: mustGet("statRight"),
    signSelect: mustGet<HTMLSelectElement>("signSelect"),
    showAllLabels: mustGet<HTMLInputElement>("showAllLabels"),
    recordBtn: mustGet<HTMLButtonElement>("recordBtn"),
    reviewPanel: mustGet("reviewPanel"),
    reviewCanvas: mustGet("reviewCanvas") as HTMLCanvasElement,
    reviewVideo: mustGet("reviewVideo") as HTMLVideoElement,
    reviewVideoCol: mustGet("reviewVideoCol"),
    recordVideoToggle: mustGet("recordVideoToggle") as HTMLInputElement,
    reviewFpsBefore: mustGet("reviewFpsBefore"),
    reviewFrameCount: mustGet("reviewFrameCount"),
    reviewFpsAvg: mustGet("reviewFpsAvg"),
    reviewLeftRatio: mustGet("reviewLeftRatio"),
    reviewRightRatio: mustGet("reviewRightRatio"),
    reviewBothMissingRatio: mustGet("reviewBothMissingRatio"),
    reviewWarnings: mustGet("reviewWarnings"),
    keepBtn: mustGet<HTMLButtonElement>("keepBtn"),
    retakeBtn: mustGet<HTMLButtonElement>("retakeBtn"),
    countersBody: mustGet("countersBody"),
  };
}

function mustGet<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Khong tim thay element #${id}`);
  return el as T;
}

export function renderSignOptions(
  select: HTMLSelectElement,
  labels: LabelEntry[],
  selectedCode: string | null,
): void {
  const previous = selectedCode ?? select.value;
  select.innerHTML = "";
  for (const label of labels) {
    const option = document.createElement("option");
    option.value = label.code;
    option.textContent = `${label.display_name_vi} (${label.code})`;
    select.appendChild(option);
  }
  const stillPresent = labels.some((l) => l.code === previous);
  if (stillPresent) {
    select.value = previous;
  } else if (labels.length > 0) {
    select.value = labels[0]!.code;
  }
}

export function renderCounters(
  tbody: HTMLElement,
  counts: SignCounts,
  labels: LabelEntry[],
): void {
  const codeToName = new Map(labels.map((l) => [l.code, l.display_name_vi]));
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" class="empty-row">Chưa quay ký hiệu nào</td></tr>`;
    return;
  }

  tbody.innerHTML = entries
    .map(([code, count]) => {
      const name = codeToName.get(code) ?? code;
      return `<tr><td>${escapeHtml(name)} <span class="code">(${escapeHtml(code)})</span></td><td>${count}</td></tr>`;
    })
    .join("");
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
