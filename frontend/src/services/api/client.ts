import axios, { type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Secure cookie-based authentication (HttpOnly)
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request interceptor: add timestamp or client metadata
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('som_access_token') : null
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401, 403, and standardized error extraction
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        // Expired session or unauthenticated
        const currentPath = window.location.pathname
        if (
          !currentPath.includes('/login') &&
          !currentPath.includes('/forgot-password') &&
          !currentPath.includes('/reset-password')
        ) {
          // Redirect to login only if not already on an auth screen
          window.location.href = `/login?expired=true&returnUrl=${encodeURIComponent(currentPath)}`
        }
      }
      const message = data?.message || (status === 403 ? 'Access forbidden. You lack necessary permissions.' : 'A server error occurred.')
      return Promise.reject(new Error(message))
    } else if (error.request) {
      // Network error or backend offline
      return Promise.reject(new Error('Backend server is unreachable. Please verify that the API server is running.'))
    }
    return Promise.reject(error)
  }
)

export default api
