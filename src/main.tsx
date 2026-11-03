import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { ProveedorAvisos } from '@/components/Avisos'
import { modoDemo } from '@/demo/cliente'
import { PantallaDemo } from '@/demo/PantallaDemo'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { queryClient } from '@/lib/consulta'
import '@/styles/index.css'

const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProveedorAvisos>
          <RouterProvider router={router} />
        </ProveedorAvisos>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)

// La demostración prepara primero su base en memoria (unos segundos) y recién entonces arranca la app.
createRoot(document.getElementById('root')!).render(modoDemo ? <PantallaDemo>{app}</PantallaDemo> : app)
