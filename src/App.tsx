import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout }      from './components/Layout'
import { Consolidado } from './pages/Consolidado'
import { PessoaPage }  from './pages/PessoaPage'
import { Importar }    from './pages/Importar'

export function App() {
  return (
    <BrowserRouter basename="/Carteira-Digital">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Consolidado />} />
          <Route path=":id" element={<PessoaPage />} />
          <Route path="importar" element={<Importar />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
