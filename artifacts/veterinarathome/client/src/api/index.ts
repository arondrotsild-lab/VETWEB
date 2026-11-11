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
export const register = (data: { name: string; phone: string; email?: string; password: string; telegram_nick?: string; ref?: string }) =>
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

// Поиск питомца по ID ветпаспорта (VD-ГГ-NNNNNN)
export const getPetByPassport = (passportId: string) =>
  api.get(`/pets/passport/${encodeURIComponent(passportId)}`).then((r) => r.data);

// Программа лояльности и реферальная программа
export const getLoyalty = () => api.get('/loyalty').then((r) => r.data);

// ИИ-помощник: предварительная оценка по рассказу владельца
export const getTriage = (text: string, pet?: string) =>
  api.post('/triage', { text, pet }).then((r) => r.data);

// Благотворительность
export const getCharity = () => api.get('/charity').then((r) => r.data);
export const donate = (caseId: number, amount: number) =>
  api.post(`/charity/${caseId}/donate`, { amount }).then((r) => r.data);

// Магазин
export const getProducts = () => api.get('/shop').then((r) => r.data);
export const getProduct = (id: number) => api.get(`/shop/${id}`).then((r) => r.data);
export const buyProduct = (id: number, qty: number, pay: 'rub' | 'bonus', variant = 0) =>
  api.post(`/shop/${id}/buy`, { qty, pay, variant }).then((r) => r.data);

// Чат с ветеринаром
export const getChats = () => api.get('/chat').then((r) => r.data);
export const getChat = (orderId: number) => api.get(`/chat/${orderId}`).then((r) => r.data);
export const sendChat = (orderId: number, text: string) => api.post(`/chat/${orderId}`, { text }).then((r) => r.data);
export const sendVoice = (orderId: number, data: { audio: string; duration: number; waveform: number[]; transcript: string }) =>
  api.post(`/chat/${orderId}/voice`, data).then((r) => r.data);

// Голосовая запись при вызове врача: сохранить и расшифровать на сервере
export const uploadVoice = (audio: string) => api.post('/voice', { audio }).then((r) => r.data as { audio_url: string; transcript: string });
