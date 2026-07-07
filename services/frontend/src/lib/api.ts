import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Education API
export const educationAPI = {
  getLessons: async (level?: string) => {
    const params = level ? { level } : {};
    const response = await api.get('/education/lessons', { params });
    return response.data;
  },
  
  getLesson: async (lessonId: string) => {
    const response = await api.get(`/education/lessons/${lessonId}`);
    return response.data;
  },
  
  getProgress: async () => {
    const response = await api.get('/education/progress');
    return response.data;
  },
  
  updateProgress: async (lessonId: string, quizScore: number, timeSpent?: number, existingBadges?: string[]) => {
    const response = await api.post('/education/progress', {
      lessonId,
      quizScore,
      timeSpent,
      existingBadges
    });
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/education/stats');
    return response.data;
  }
};

export default api
