import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const register = (data: { name: string; phone: string; email?: string; password: string; telegram_nick?: string }) =>
  api.post('/auth/register', data).then((r) => r.data);

export const login = (data: { phone: string; password: string }) =>
  api.post('/auth/login', data).then((r) => r.data);

export const getMe = () => api.get('/auth/me').then((r) => r.data);

// Services
export const getServices = () => api.get('/services').then((r) => r.data);

// Pets
export const getPets = () => api.get('/pets').then((r) => r.data);
export const createPet = (data: object) => api.post('/pets', data).then((r) => r.data);
export const updatePet = (id: number, data: object) => api.put(`/pets/${id}`, data).then((r) => r.data);
export const deletePet = (id: number) => api.delete(`/pets/${id}`).then((r) => r.data);

// Orders
export const getOrders = () => api.get('/orders').then((r) => r.data);
export const getOrder = (id: number) => api.get(`/orders/${id}`).then((r) => r.data);
export const createOrder = (data: object) => api.post('/orders', data).then((r) => r.data);
export const updateOrderStatus = (id: number, status: string, comment?: string) =>
  api.patch(`/orders/${id}/status`, { status, comment }).then((r) => r.data);

// Vets
export const getVets = () => api.get('/vets').then((r) => r.data);

// Suggestions
export const createSuggestion = (data: { name?: string; telegram?: string; comment: string }) =>
  api.post('/suggestions', data).then((r) => r.data);
