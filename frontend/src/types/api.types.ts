export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

export class ApiException extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiException'
  }
}
