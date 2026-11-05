type GamesParams = {
  query?: string;
  ordering?: string;
  genres?: string;
  page?: number;
};

export const paths = {
  games({ query, ordering, genres, page = 1 }: GamesParams = {}): string {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (ordering) params.set('ordering', ordering);
    if (genres) params.set('genres', genres);
    if (page > 1) params.set('page', String(page));
    const search = params.toString();
    return search ? `/?${search}` : '/';
  },
  game(id: string | number): string {
    return `/games/${encodeURIComponent(String(id))}`;
  },
  favorites: '/favorites',
  login: '/auth/discord/login',
  logout: '/auth/logout',
};
