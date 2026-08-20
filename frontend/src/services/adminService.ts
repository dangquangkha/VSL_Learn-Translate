import axios, { type AxiosRequestConfig } from 'axios'
import apiClient from './apiClient'

// EARS[FR-015, FR-017] — Typed admin API boundary. Keep server contracts in one place.

const MODEL_UPLOAD_TIMEOUT_MS = 120_000

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface ClassCount {
  labelId: number
  code: string
  count: number
}

export interface DistributionCount {
  key: string
  count: number
}

export interface ContributorProgress {
  participantCode: string
  acceptedCount: number
  targetCount: number
  completionPercentage: number
}

export interface RejectionRateBySign {
  labelId: number
  code: string
  acceptedCount: number
  rejectedCount: number
  rejectionRate: number
}

export interface ModelMetricsHistory {
  id: string
  semver: string
  active: boolean
  releaseEligible: boolean
  metrics: Record<string, JsonValue>
  createdAt: string
}

export interface AdminStats {
  scope: string
  generatedAt: string
  totalClips: number
  acceptedClips: number
  rejectedClips: number
  needsReviewClips: number
  pendingClips: number
  totalContributors: number
  totalClasses: number
  averageClipsPerContributor: number
  rejectionRate: number
  clipsPerClass: ClassCount[]
  metadataDistribution: Record<string, DistributionCount[]>
  contributorProgress: ContributorProgress[]
  rejectionRateBySign: RejectionRateBySign[]
  modelMetricsHistory: ModelMetricsHistory[]
}

export interface ModelAdmin {
  id: string
  semver: string
  labelsHash: string
  artifactSha256: string
  inputSignature: Record<string, JsonValue>
  metrics: Record<string, JsonValue>
  releaseEligible: boolean
  validationResults: Record<string, JsonValue>
  active: boolean
  createdAt: string
}

export interface ModelHistoryPage {
  content: ModelAdmin[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface AdminApiError {
  code: string
  message: string
  correlationId?: string
}

interface RequestOptions {
  signal?: AbortSignal
}

function requestConfig({ signal }: RequestOptions = {}): AxiosRequestConfig {
  return signal ? { signal } : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Convert the stable backend error contract into an actionable UI message.
 * Raw Axios errors are deliberately not surfaced to avoid leaking internals.
 */
export function getAdminApiError(error: unknown, fallback: string): AdminApiError {
  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data
    if (isRecord(payload)) {
      const code = typeof payload.code === 'string' ? payload.code : undefined
      const message = typeof payload.message === 'string' ? payload.message : undefined
      const correlationId =
        typeof payload.correlationId === 'string' ? payload.correlationId : undefined
      if (code && message) return { code, message, correlationId }
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        code: 'REQUEST_TIMEOUT',
        message: 'Upload mất quá nhiều thời gian. Kiểm tra lịch sử model trước khi thử lại để tránh đăng ký trùng.',
      }
    }

    const status = error.response?.status
    return {
      code: status ? `HTTP_${status}` : 'NETWORK_ERROR',
      message: status
        ? 'Máy chủ từ chối yêu cầu. Kiểm tra dữ liệu và thử lại.'
        : 'Không thể kết nối máy chủ. Kiểm tra kết nối rồi thử lại.',
    }
  }

  return { code: 'CLIENT_ERROR', message: fallback }
}

export const adminService = {
  async getStats(options?: RequestOptions): Promise<AdminStats> {
    const response = await apiClient.get<AdminStats>('/api/admin/stats', requestConfig(options))
    return response.data
  },

  async getModelHistory(page = 0, size = 20, options?: RequestOptions): Promise<ModelHistoryPage> {
    const response = await apiClient.get<ModelHistoryPage>('/api/admin/models', {
      ...requestConfig(options),
      params: { page, size },
    })
    return response.data
  },

  async uploadModel(file: File, semver: string, metrics: string): Promise<ModelAdmin> {
    const body = new FormData()
    body.append('model', file, file.name)
    body.append('semver', semver)
    body.append('metrics', metrics)
    // apiClient defaults to application/json. Clear it before Axios transformRequest,
    // then let the browser add multipart/form-data with the required boundary.
    const response = await apiClient.post<ModelAdmin>('/api/admin/models', body, {
      headers: { 'Content-Type': undefined },
      // The backend validates the artifact and writes model metadata to R2 synchronously.
      // Give a 5 MiB upload enough time on slower connections instead of inheriting 10 s.
      timeout: MODEL_UPLOAD_TIMEOUT_MS,
    })
    return response.data
  },

  async activateModel(id: string): Promise<ModelAdmin> {
    const response = await apiClient.patch<ModelAdmin>(`/api/admin/models/${id}/activate`)
    return response.data
  },
}
