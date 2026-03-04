import { useEffect, useMemo, useRef, useState } from 'react'
import { api, computeTrendData, groupRecordsByGame } from '@/api'
import type {
  Game, Hall, HallMemberWithUser, HallRecordEntry,
  HallStats, InviteWithHall, LeaderboardEntry,
  UserHistoryEntry, UserStats,
} from '@/types'

// ── Generic fetch hook ────────────────────────────────────────────────────────

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; error: Error }

/**
 * Fires `fn` on mount and whenever `key` changes (JSON-serialized comparison).
 */
export function useApi<T>(fn: () => Promise<T>, key: unknown = null): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const keyRef = useRef<string>('')
  const serialized = JSON.stringify(key)

  useEffect(() => {
    if (keyRef.current === serialized) return
    keyRef.current = serialized
    let cancelled = false
    setState({ status: 'loading' })
    fn()
      .then(data => { if (!cancelled) setState({ status: 'ok', data }) })
      .catch(err => {
        if (!cancelled) {
          setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) })
        }
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized])

  return state
}

// ── Resource hooks ────────────────────────────────────────────────────────────

export function useHalls(): AsyncState<Hall[]> {
  return useApi(() => api.listHalls())
}

export function useHall(hallId: number): AsyncState<Hall> {
  return useApi(() => api.getHall(hallId), hallId)
}

export function useHallStats(hallId: number): AsyncState<HallStats> {
  return useApi(() => api.hallStats(hallId), hallId)
}

export function useHallMembers(hallId: number): AsyncState<HallMemberWithUser[]> {
  return useApi(() => api.listMembers(hallId), hallId)
}

export function useLeaderboard(hallId: number): AsyncState<LeaderboardEntry[]> {
  return useApi(() => api.leaderboard(hallId), hallId)
}

export function useHallRecords(hallId: number): AsyncState<HallRecordEntry[]> {
  return useApi(() => api.hallRecords(hallId), hallId)
}

export function useHallGames(hallId: number): AsyncState<Game[]> {
  return useApi(() => api.listGames(hallId), hallId)
}

export function useGame(gameId: number): AsyncState<Game> {
  return useApi(() => api.getGame(gameId), gameId)
}

export function useMyInvites(): AsyncState<InviteWithHall[]> {
  return useApi(() => api.myInvites())
}

export function useMyHistory(): AsyncState<UserHistoryEntry[]> {
  return useApi(() => api.myHistory())
}

export function useMyStats(): AsyncState<UserStats> {
  return useApi(() => api.myStats())
}

// ── Derived data hooks ────────────────────────────────────────────────────────

/**
 * Returns records for a single game derived from the hall's flat records.
 * Avoids the not-yet-implemented GET /api/games/{id}/results endpoint.
 */
export function useGameResults(hallId: number, gameId: number) {
  const recordsState = useHallRecords(hallId)
  return useMemo(() => {
    if (recordsState.status !== 'ok') return recordsState
    const grouped = groupRecordsByGame(recordsState.data)
    return { status: 'ok' as const, data: grouped.get(gameId) ?? [] }
  }, [recordsState, gameId])
}

/**
 * Trend data derived from hall records – per-user cumulative hall points over games.
 * Each row: `{ date: string, [user_name]: number, … }`
 */
export function useTrendData(hallId: number) {
  const recordsState = useHallRecords(hallId)
  return useMemo(() => {
    if (recordsState.status !== 'ok') return recordsState
    return { status: 'ok' as const, data: computeTrendData(recordsState.data) }
  }, [recordsState])
}
