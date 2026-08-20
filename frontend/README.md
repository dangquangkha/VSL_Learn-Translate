# Frontend — VSL Learn & Translate

## Cài đặt và chạy

```bash
# 1. Cài dependencies
cd frontend
npm install

# 2. Tạo file .env.local
cp .env.example .env.local
# Sửa VITE_API_URL nếu backend không chạy ở localhost:8080

# 3. Đặt file ONNX model vào public/models/
# P1 (Tài) export ONNX giả và giao file. Xem public/models/README.md.

# 4. Chạy dev server
npm run dev
# → http://localhost:5173

# 5. Build production
npm run build
```

## Cấu trúc thư mục

```
src/
├── App.tsx                    # Router + AuthProvider
├── main.tsx                   # Entry point
├── types/
│   └── landmarks.ts           # LandmarkFrame types, Worker message protocol
├── generated/
│   └── labels.ts              # ← AUTO-GENERATED, không sửa tay
├── services/
│   ├── apiClient.ts           # Axios với JWT interceptor
│   ├── authService.ts         # Login / register / logout
│   ├── decoder.ts             # Sequence decoder (pure functions)
│   └── labelVerifier.ts       # Xác minh label hash (có sẵn từ trước)
├── contexts/
│   └── AuthContext.tsx        # JWT context
├── hooks/
│   ├── useAuth.ts             # Shorthand for useAuthContext
│   ├── useLocalStorage.ts     # localStorage sync
│   ├── useVslWorker.ts        # Web Worker lifecycle
│   ├── useRingBuffer.ts       # Ring buffer 2s
│   ├── useSlidingWindow.ts    # Sliding window 6 frames
│   └── useDecoder.ts          # Decoder hook
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx       # Navbar + main + footer
│   │   ├── Navbar.tsx         # Top navigation
│   │   └── ProtectedRoute.tsx # Auth guard
│   └── ui/
│       ├── Button.tsx         # Button component
│       ├── Badge.tsx          # Status badges
│       └── Spinner.tsx        # Loading indicator
├── pages/
│   ├── HomePage.tsx           # Landing: 3 lối vào
│   ├── LoginPage.tsx          # Đăng nhập
│   ├── RegisterPage.tsx       # Đăng ký
│   ├── TranslatePage.tsx      # Chế độ Dịch (đầy đủ)
│   ├── LearnPage.tsx          # STUB — P4 implement
│   ├── RecorderPage.tsx       # STUB — P3 implement
│   └── AdminPage.tsx          # STUB — P5 implement
└── workers/
    └── vslWorker.ts           # Web Worker + ONNX inference
```

## Hướng dẫn cho P3, P4, P5

**FE Shell đã xong** — bạn có thể:

### P3 (An) — Recorder
- Thay nội dung `RecorderPage.tsx` với UI recorder của bạn
- Dùng `apiClient` từ `services/apiClient.ts` để gọi BE collection
- Dùng `LandmarkFrame` từ `types/landmarks.ts` khi P1-4 giao `useLandmarks`

### P4 (Hùng) — Học
- Thay nội dung `LearnPage.tsx` với UI từ vựng + luyện tập
- Dùng `apiClient` để gọi `/api/vocabulary`, `/api/learning`
- Dùng `useVslWorker` + `useDecoder` cho phần chấm điểm

### P5 (Đức) — Admin
- Thay nội dung `AdminPage.tsx` với dashboard
- Dùng `apiClient` gọi `/api/modelregistry`, `/api/stats`, `/api/quality`
- Route `/admin` đã có guard: chỉ role ADMIN vào được

## Contract ONNX (để tích hợp với P1)

File model đặt tại: `public/models/vsl_model.onnx`

```
Input:  "input"  → float32 [1, 32, 55, 3]
Output: "output" → float32 [1, 51]
Metadata: label_hash = SHA256(codes từ shared/labels.json)
```

## Routes

| Path         | Component        | Auth  |
|--------------|------------------|-------|
| `/`          | HomePage         | No    |
| `/login`     | LoginPage        | No    |
| `/register`  | RegisterPage     | No    |
| `/translate` | TranslatePage    | No    |
| `/learn`     | LearnPage        | Yes   |
| `/recorder`  | RecorderPage     | Yes   |
| `/admin`     | AdminPage        | Admin |
