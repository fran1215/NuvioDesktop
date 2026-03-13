export interface MalToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Seconds
  createdAt: number; // Timestamp
}

export interface MalUser {
  id: number;
  name: string;
  picture?: string;
  gender?: string;
  birthday?: string;
  location?: string;
  joined_at?: string;
  time_zone?: string;
  anime_statistics?: {
    num_items_watching: number;
    num_items_completed: number;
    num_items_on_hold: number;
    num_items_dropped: number;
    num_items_plan_to_watch: number;
    num_items: number;
    num_days_watched: number;
    num_days_watching: number;
    num_days_completed: number;
    num_days_on_hold: number;
    num_days_dropped: number;
    num_days: number;
    num_episodes: number;
    num_times_rewatched: number;
    mean_score: number;
  };
}

export interface MalAnime {
  id: number;
  title: string;
  main_picture?: {
    medium: string;
    large: string;
  };
  num_episodes: number;
  media_type?: 'tv' | 'movie' | 'ova' | 'special' | 'ona' | 'music';
  start_season?: {
    year: number;
    season: string;
  };
}

export type MalListStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

export interface MalMyListStatus {
  status: MalListStatus;
  score: number;
  num_episodes_watched: number;
  is_rewatching: boolean;
  updated_at: string;
}

export interface MalAnimeNode {
  node: MalAnime;
  list_status: MalMyListStatus;
}

export interface MalUserListResponse {
  data: MalAnimeNode[];
  paging: {
    next?: string;
    previous?: string;
  };
}

export interface MalSearchResult {
  data: MalAnimeNode[];
  paging: {
    next?: string;
    previous?: string;
  };
}
