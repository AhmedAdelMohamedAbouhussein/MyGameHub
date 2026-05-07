import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'sonner';

import AuthProvider from "./contexts/AuthProvider.jsx";
import App from './App.jsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.jsx';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')).render(
  <BrowserRouter >
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <AuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          <Toaster
            position="top-center"
            theme="dark"
            richColors
            toastOptions={{
              style: {
                background: '#23313f',
                border: '1px solid rgba(58, 79, 99, 0.5)',
                color: '#f1f5f9',
              },
            }}
          />
        </AuthProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);
