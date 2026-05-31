import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard }  from './pages/Dashboard'
import { Corretoras } from './pages/Corretoras'
import { Posicoes }   from './pages/Posicoes'
import { Transacoes } from './pages/Transacoes'
import { Importar }   from './pages/Importar'

export function App() {
  return (
    <BrowserRouter basename="/carteira-digital">

      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="corretoras" element={<Corretoras />} />
          <Route path="posicoes"   element={<Posicoes />} />
          <Route path="transacoes" element={<Transacoes />} />
          <Route path="importar"   element={<Importar />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
