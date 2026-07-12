import axios, { AxiosError } from 'axios';
import type { ApiError } from '../types';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

/** Extract the typed error envelope from an axios failure. */
export function apiError(err: unknown): ApiError {
  if (err instanceof AxiosError && err.response?.data) {
    return err.response.data as ApiError;
  }
  return {
    statusCode: 0,
    errorCode: 'NETWORK_ERROR',
    message: 'Could not reach the server',
  };
}
