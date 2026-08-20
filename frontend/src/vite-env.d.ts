/// <reference types="vite/client" />

// Khai báo biến môi trường Vite để TypeScript không báo lỗi
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
