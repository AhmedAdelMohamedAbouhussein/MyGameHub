import axios from 'axios';

const BACKEND_BASE = import.meta.env.VITE_REACT_APP_BACKEND_URL;

const apiClient = axios.create({
    baseURL: `${BACKEND_BASE}/api`,
    withCredentials: true,
    headers: {
        'ngrok-skip-browser-warning': 'true'
    }
});

let csrfToken = null;

// Interceptor to add CSRF token to state-changing requests
apiClient.interceptors.request.use(async (config) => {
    const isStateChanging = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase());

    // Don't intercept the csrf-token endpoint itself to prevent infinite loops
    if (isStateChanging && !config.url?.includes('/csrf-token')) {
        if (!csrfToken) {
            try {
                // Use a separate axios call to avoid interceptor recursion
                const res = await axios.get(`${BACKEND_BASE}/api/csrf-token`, { 
                    withCredentials: true,
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                csrfToken = res.data.token;
            } catch (err) {
                console.error('Failed to fetch CSRF token:', err);
            }
        }
        if (csrfToken) {
            config.headers['x-csrf-token'] = csrfToken;
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response interceptor to handle CSRF token expiration/invalid errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If the error is a CSRF error (often 403), clear token and retry once
        if (error.response?.status === 403 && error.response?.data?.message?.toLowerCase().includes('csrf')) {
            if (!originalRequest._retry) {
                originalRequest._retry = true;
                csrfToken = null; // Clear invalid token

                // Fetch a new one
                try {
                    const res = await axios.get(`${BACKEND_BASE}/api/csrf-token`, { 
                        withCredentials: true,
                        headers: { 'ngrok-skip-browser-warning': 'true' }
                    });
                    csrfToken = res.data.token;
                    originalRequest.headers['x-csrf-token'] = csrfToken;
                    return apiClient(originalRequest); // Retry the original request
                } catch (retryErr) {
                    return Promise.reject(retryErr);
                }
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
