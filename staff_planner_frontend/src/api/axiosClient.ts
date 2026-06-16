import axios from "axios";

const baseURL =
  (import.meta as any).env?.VITE_API_URL || "/api";

export const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use((config) => {
  // Auto-add trailing slash if missing (Django requires it)
  if (config.url && !config.url.endsWith("/") && !config.url.includes("?")) {
    config.url = config.url + "/";
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (
      typeof window !== "undefined" &&
      error?.response?.status === 401 &&
      !window.location.pathname.startsWith("/login")
    ) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;