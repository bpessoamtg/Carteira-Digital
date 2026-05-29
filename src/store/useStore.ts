import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Corretora, Posicao, Transacao } from '../types'

interface Store {
  corretoras: Corretora[]
  posicoes: Posicao[]
  transacoes: Transacao[]

  adicionarCorretora: (dados: Omit<Corretora, 'id' | 'criadaEm'>) => void
  editarCorretora: (id: string, dados: Partial<Omit<Corretora, 'id' | 'criadaEm'>>) => void
  removerCorretora: (id: string) => void

  adicionarPosicao: (dados: Omit<Posicao, 'id' | 'criadaEm' | 'atualizadaEm'>) => void
  editarPosicao: (id: string, dados: Partial<Omit<Posicao, 'id' | 'criadaEm'>>) => void
  removerPosicao: (id: string) => void

  adicionarTransacao: (dados: Omit<Transacao, 'id' | 'criadaEm'>) => void
  editarTransacao: (id: string, dados: Partial<Omit<Transacao, 'id' | 'criadaEm'>>) => void
  removerTransacao: (id: string) => void
}

function gerarId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      corretoras: [],
      posicoes: [],
      transacoes: [],

      adicionarCorretora: (dados) =>
        set((s) => ({
          corretoras: [
            ...s.corretoras,
            { ...dados, id: gerarId(), criadaEm: new Date().toISOString() },
          ],
        })),

      editarCorretora: (id, dados) =>
        set((s) => ({
          corretoras: s.corretoras.map((c) => (c.id === id ? { ...c, ...dados } : c)),
        })),

      removerCorretora: (id) =>
        set((s) => ({
          corretoras: s.corretoras.filter((c) => c.id !== id),
          posicoes:   s.posicoes.filter((p) => p.corretoraId !== id),
          transacoes: s.transacoes.filter((t) => t.corretoraId !== id),
        })),

      adicionarPosicao: (dados) =>
        set((s) => ({
          posicoes: [
            ...s.posicoes,
            {
              ...dados,
              id: gerarId(),
              criadaEm:     new Date().toISOString(),
              atualizadaEm: new Date().toISOString(),
            },
          ],
        })),

      editarPosicao: (id, dados) =>
        set((s) => ({
          posicoes: s.posicoes.map((p) =>
            p.id === id ? { ...p, ...dados, atualizadaEm: new Date().toISOString() } : p
          ),
        })),

      removerPosicao: (id) =>
        set((s) => ({
          posicoes:   s.posicoes.filter((p) => p.id !== id),
          transacoes: s.transacoes.filter((t) => t.posicaoId !== id),
        })),

      adicionarTransacao: (dados) =>
        set((s) => ({
          transacoes: [
            ...s.transacoes,
            { ...dados, id: gerarId(), criadaEm: new Date().toISOString() },
          ],
        })),

      editarTransacao: (id, dados) =>
        set((s) => ({
          transacoes: s.transacoes.map((t) => (t.id === id ? { ...t, ...dados } : t)),
        })),

      removerTransacao: (id) =>
        set((s) => ({
          transacoes: s.transacoes.filter((t) => t.id !== id),
        })),
    }),
    { name: 'carteira-digital-v1' }
  )
)
