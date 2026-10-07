import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { ProveedorAvisos } from '@/components/Avisos'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { queryClient } from '@/lib/consulta'
import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProveedorAvisos>
          <RouterProvider router={router} />
        </ProveedorAvisos>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
