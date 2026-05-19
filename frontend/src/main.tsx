import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './shared/config/queryClient'
import App from './App.tsx'
import './globals.css'
import './i18n'
import './shared/config/chartjs.config'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )} */}
    </QueryClientProvider>
  </React.StrictMode>,
)
