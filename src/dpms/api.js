import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Attach JWT token to every request
api.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// On 401 — clear token and redirect to login automatically
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('access_token')
      window.location.href = '/admin'
    }
    return Promise.reject(err)
  }
)

export default api
