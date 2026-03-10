import type {
  AuthMe, CreateGameRequest, Game, Hall, HallInvite,
  HallMember, HallMemberWithUser, HallRecordEntry, HallStats,
  InviteWithHall, LeaderboardEntry, UserHistoryEntry, UserStats,
  UserSearchResult,
} from '@/types'

// ── Token storage ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'score-tracker-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Call once on app mount. If the URL hash contains `#token=<value>`,
 * save it to localStorage and strip the hash from the URL.
 */
export function captureTokenFromHash(): void {
  const hash = window.location.hash
  const match = hash.match(/[#&]token=([^&]+)/)
  if (match) {
    saveToken(decodeURIComponent(match[1]))
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? ': ' + text : ''}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function json(body: unknown): RequestInit {
  return { body: JSON.stringify(body) }
}

// ── API client ────────────────────────────────────────────────────────────────

export const api = {
  // Auth
  getMe: () => request<AuthMe>('/api/auth/me'),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  // Halls
  listHalls: () => request<Hall[]>('/api/halls'),
  getHall: (id: number) => request<Hall>(`/api/halls/${id}`),
  createHall: (body: { name: string; description?: string }) =>
    request<Hall>('/api/halls', { method: 'POST', ...json(body) }),

  // Members – backend returns flat objects {id,hall_id,user_id,role,points,joined_at,user_name,user_email}
  listMembers: async (hallId: number): Promise<HallMemberWithUser[]> => {
    const raw = await request<{
      id: number; hall_id: number; user_id: number; role: string;
      points: number; joined_at: string; user_name: string; user_email: string;
    }[]>(`/api/halls/${hallId}/members`)
    return raw.map(r => ({
      member: { id: r.id, hall_id: r.hall_id, user_id: r.user_id, role: r.role as 'admin' | 'member', points: r.points, joined_at: r.joined_at },
      name: r.user_name,
      email: r.user_email,
    }))
  },

  // Leaderboard – backend returns flat objects {user_id,name,points}
  leaderboard: async (hallId: number): Promise<LeaderboardEntry[]> => {
    return request<LeaderboardEntry[]>(`/api/halls/${hallId}/leaderboard`)
  },

  hallStats: (hallId: number) => request<HallStats>(`/api/halls/${hallId}/stats`),

  // Flat (game × player) rows, ordered by played_at DESC
  hallRecords: (hallId: number) =>
    request<HallRecordEntry[]>(`/api/halls/${hallId}/records`),

  // Admin actions
  assignUser: (hallId: number, userId: number) =>
    request<void>(`/api/halls/${hallId}/assign`, { method: 'POST', ...json({ user_id: userId }) }),
  inviteUser: (hallId: number, userId: number) =>
    request<void>(`/api/halls/${hallId}/invite`, { method: 'POST', ...json({ user_id: userId }) }),
  promoteUser: (hallId: number, userId: number) =>
    request<void>(`/api/halls/${hallId}/promote`, { method: 'POST', ...json({ user_id: userId }) }),
  demoteUser: (hallId: number, userId: number) =>
    request<void>(`/api/halls/${hallId}/demote`, { method: 'POST', ...json({ user_id: userId }) }),
  listHallInvites: (hallId: number) =>
    request<HallInvite[]>(`/api/halls/${hallId}/invites`),
  chip: (hallId: number, body: { user_id: number; amount: number; note?: string }) =>
    request<void>(`/api/halls/${hallId}/chip`, { method: 'POST', ...json(body) }),

  // Games
  listGames: (hallId: number) => request<Game[]>(`/api/halls/${hallId}/games`),
  getGame: (id: number) => request<Game>(`/api/games/${id}`),
  createGame: (hallId: number, body: CreateGameRequest) =>
    request<Game>(`/api/halls/${hallId}/games`, { method: 'POST', ...json(body) }),
  updateGame: (
    id: number,
    body: Partial<Pick<Game, 'name' | 'description' | 'point_conversion_rate' | 'played_at'>>,
  ) => request<Game>(`/api/games/${id}`, { method: 'PUT', ...json(body) }),
  deleteGame: (id: number) =>
    request<void>(`/api/games/${id}`, { method: 'DELETE' }),

  // Invites – backend returns flat objects {id,hall_id,user_id,invited_by_user_id,status,created_at,hall_name}
  myInvites: async (): Promise<InviteWithHall[]> => {
    const raw = await request<{
      id: number; hall_id: number; user_id: number; invited_by_user_id: number;
      status: string; created_at: string; hall_name: string;
    }[]>('/api/invites/me')
    return raw.map(r => ({
      invite: { id: r.id, hall_id: r.hall_id, user_id: r.user_id, invited_by_user_id: r.invited_by_user_id, status: r.status as 'pending' | 'accepted' | 'declined', created_at: r.created_at },
      hallName: r.hall_name,
    }))
  },
  acceptInvite: (id: number) =>
    request<void>(`/api/invites/${id}/accept`, { method: 'POST' }),
  declineInvite: (id: number) =>
    request<void>(`/api/invites/${id}/decline`, { method: 'POST' }),

  // Users
  searchUsers: (q: string): Promise<UserSearchResult[]> =>
    request<UserSearchResult[]>(`/api/users/search?q=${encodeURIComponent(q)}`),

  // Stats
  myHistory: () => request<UserHistoryEntry[]>('/api/users/me/history'),
  myStats: () => request<UserStats>('/api/users/me/stats'),
}

// ── Derived helpers ───────────────────────────────────────────────────────────

/**
 * Group flat HallRecordEntry rows by game_id.
 * Preserves the ordering of games from the source array.
 */
export function groupRecordsByGame(records: HallRecordEntry[]): Map<number, HallRecordEntry[]> {
  const map = new Map<number, HallRecordEntry[]>()
  for (const r of records) {
    const arr = map.get(r.game_id) ?? []
    arr.push(r)
    map.set(r.game_id, arr)
  }
  return map
}

type GameStub = { game_id: number; game_name: string; played_at: string }

function uniqueGamesAsc(records: HallRecordEntry[]): GameStub[] {
  const seen = new Set<number>()
  const games: GameStub[] = []
  const sorted = [...records].sort(
    (a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime(),
  )
  for (const r of sorted) {
    if (!seen.has(r.game_id)) {
      seen.add(r.game_id)
      games.push({ game_id: r.game_id, game_name: r.game_name, played_at: r.played_at })
    }
  }
  return games
}

/**
 * Compute per-user cumulative hall-point totals over games.
 * Returns rows keyed as `{ date: string, [user_name]: number, … }`
 * to match PointsTrendChart's XAxis dataKey="date".
 */
export function computeTrendData(
  records: HallRecordEntry[],
): Array<Record<string, number | string>> {
  if (records.length === 0) return []

  const games = uniqueGamesAsc(records)
  const byGame = groupRecordsByGame(records)

  const cumulative: Record<string, number> = {}
  return games.map(({ game_id, game_name }) => {
    for (const r of byGame.get(game_id) ?? []) {
      cumulative[r.user_name] =
        (cumulative[r.user_name] ?? 0) + r.points * r.point_conversion_rate
    }
    return { date: game_name.slice(0, 12), ...cumulative }
  })
}
