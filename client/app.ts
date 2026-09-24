import { favoritesPage } from './pages/favorites';
import { gameDetailsPage } from './pages/gameDetails';
import { gamesListPage } from './pages/gamesList';

type Route = {
  matcher: (pathname: string) => boolean;
  page: (element: HTMLElement) => void | Promise<void>;
};

const routes: Route[] = [
  { matcher: (pathname) => pathname === '/', page: gamesListPage },
  { matcher: (pathname) => /^\/games\/[^/]+\/?$/i.test(pathname), page: gameDetailsPage },
  { matcher: (pathname) => /^\/favorites\/?$/i.test(pathname), page: favoritesPage },
];

const root = document.querySelector<HTMLElement>('#app');
const currentRoute = routes.find((route) => route.matcher(location.pathname));

if (root) {
  if (currentRoute) {
    Promise.resolve().then(() => currentRoute.page(root)).catch((error: unknown) => {
      console.error('Не удалось открыть страницу:', error);
      root.textContent = 'Не удалось открыть страницу';
    });
  } else {
    root.textContent = 'Page not found';
  }
}
