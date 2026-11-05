import { startApp } from './bootstrap';
import { favoritesPage } from './pages/favorites';
import { gameDetailsPage } from './pages/gameDetails';
import { gamesListPage } from './pages/gamesList';
import type { Route } from './shared/router';

const routes: Route[] = [
  {
    matcher: (pathname) => pathname === '/',
    page: gamesListPage,
    title: 'Games',
    showFilters: true,
    showSearchButton: false,
  },
  {
    matcher: (pathname) => /^\/games\/[^/]+\/?$/i.test(pathname),
    page: gameDetailsPage,
    title: 'Game',
    showFilters: false,
    showSearchButton: true,
  },
  {
    matcher: (pathname) => /^\/favorites\/?$/i.test(pathname),
    page: favoritesPage,
    title: 'Favorites',
    showFilters: false,
    showSearchButton: false,
  },
];

startApp(routes);
