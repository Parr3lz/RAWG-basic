export type Game = {
  id: number;
  name: string;
  background_image: string | null;
  rating: number | null;
};

export type GameDetail = Game & {
  slug: string | null;
  released: string | null;
  playtime: number | null;
  description_raw?: string;
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
};

export type GameDetailResponse = {
  game: GameDetail;
  favorited: boolean;
};

export type GamesPage = {
  games: Game[];
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
  query: string;
  ordering: string;
  genres: string;
};

