import { AxiosError } from "axios";

// Porta 1:1 de src/shared/api/errors.ts (web) — mesma lógica, sem dependência de DOM.

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: { field: string; message: string }[];
  timestamp: string;
  path: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: { field: string; message: string }[];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.statusCode = body.statusCode;
    this.code = body.code;
    this.details = body.details;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as Partial<ApiErrorBody>;
    if (data.code && data.message) {
      return new ApiError({
        statusCode: error.response.status,
        code: data.code,
        message: data.message,
        details: data.details,
        timestamp: data.timestamp ?? new Date().toISOString(),
        path: data.path ?? "",
      });
    }
  }

  return new ApiError({
    statusCode: 0,
    code: "NETWORK_ERROR",
    message: "Não foi possível conectar ao servidor. Verifique sua conexão.",
    timestamp: new Date().toISOString(),
    path: "",
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiErrorCode(error: unknown): string | undefined {
  return isApiError(error) ? error.code : undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}
