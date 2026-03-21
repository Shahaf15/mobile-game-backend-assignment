export interface LeaderboardEntry {
  playerId: string;
  username: string;
  displayName: string;
  totalScore: number;
  gamesPlayed: number;
  rank: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
