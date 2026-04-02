import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

if (import.meta.env.PROD) {
    if (!import.meta.env.VITE_API_URL) {
        console.warn('⚠️ Production Warning: VITE_API_URL is not defined in your .env. Using fallback: ' + baseURL);
    }
}

const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default client;