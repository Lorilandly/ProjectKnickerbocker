// All IDs are numbers (i64 from the backend).
// role is "admin" | "member" — the backend DB CHECK does not allow "hall_admin".

export type AuthMe = {
  id: number
  email: string
  name: string
  avatar_url: string | null
  // Backend needs to add this field to GET /api/auth/me response.
  // Until then it will be undefined (falsy), which is fine — the badge just won't show.
  is_server_admin?: boolean
}

export type Hall = {
  id: number
  name: string
  description: string | null   // nullable until backend migration adds the column
  created_by_user_id: number
  created_at: string
}

export type HallMember = {
  id: number
  hall_id: number
  user_id: number
  role: 'admin' | 'member'
  points: number
  joined_at: string
}

// Unpacked from the backend's 3-tuple [HallMember, user_name, user_email]
export type HallMemberWithUser = {
  member: HallMember
  name: string
  email: string
}

// Unpacked from the backend's 3-tuple [user_id, name, points]
export type LeaderboardEntry = {
  user_id: number
  name: string
  points: number
}

export type HallInvite = {
  id: number
  hall_id: number
  user_id: number
  invited_by_user_id: number
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

// Unpacked from the backend's 2-tuple [HallInvite, hall_name]
export type InviteWithHall = {
  invite: HallInvite
  hallName: string
}

export type Game = {
  id: number
  hall_id: number
  name: string
  description: string | null
  point_conversion_rate: number
  played_at: string
  created_at: string
}

// Flat row from GET /api/halls/{id}/records — one row per (game × player)
export type HallRecordEntry = {
  game_id: number
  game_name: string
  played_at: string
  point_conversion_rate: number
  user_id: number
  user_name: string
  points: number
}

export type UserHistoryEntry = {
  entry_type: 'game' | 'chip'
  ref_id: number
  game_name: string | null
  hall_name: string
  points: number
  note: string | null
  created_at: string
}

export type UserStats = {
  total_points: number
  halls: UserHallStats[]
}

export type UserHallStats = {
  hall_id: number
  hall_name: string
  points: number
}

export type HallStats = {
  leaderboard: LeaderboardEntry[]
  recent_games: RecentGame[]
  points_by_game: PointsByGame[]
}

export type RecentGame = {
  id: number
  game_name: string
  played_at: string
}

export type PointsByGame = {
  game_id: number
  game_name: string
  total_points: number
}

export type UserSearchResult = {
  id: number
  name: string
  email: string
  avatar_url: string | null
}

export type CreateGameRequest = {
  name: string
  description?: string
  point_conversion_rate?: number
  played_at?: string
  results: Array<{ user_id: number; points: number }>
}
