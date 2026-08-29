import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwtoken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
