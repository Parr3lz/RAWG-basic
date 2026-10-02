import { favoritesPage } from './pages/favorites';
import { gameDetailsPage } from './pages/gameDetails';
import { gamesListPage } from './pages/gamesList';
import { createHeader } from './components/header';
import { requestJson } from './shared/api';
import type { User } from './shared/types';

async function getCurrentUser(): Promise<User | null> {
  const { user } = await requestJson<{ user: User | null }>('/api/me');
  return user;
}

type Route = {
  matcher: (pathname: string) => boolean;
  page: (element: HTMLElement) => void | Promise<void>;
};

const root = document.querySelector<HTMLElement>('#app');
const headerRoot = document.querySelector<HTMLElement>('#header-root');

if (root && headerRoot) {
  const params = new URLSearchParams(location.search);
  const header = createHeader({
    query: params.get('q') ?? '',
    ordering: params.get('ordering') ?? '',
    genres: params.get('genres') ?? '',
    showFilters: location.pathname === '/',
    showSearchButton: /^\/games\/[^/]+\/?$/i.test(location.pathname),
  }, { getCurrentUser });
  headerRoot.replaceChildren(header.element);

  const routes: Route[] = [
    {
      matcher: (pathname) => pathname === '/',
      page: (element) => gamesListPage(element, {
        searchForm: header.searchForm,
        filtersForm: header.filtersForm,
      }),
    },
    { matcher: (pathname) => /^\/games\/[^/]+\/?$/i.test(pathname), page: gameDetailsPage },
    { matcher: (pathname) => /^\/favorites\/?$/i.test(pathname), page: favoritesPage },
  ];
  const currentRoute = routes.find((route) => route.matcher(location.pathname));

  if (currentRoute) {
    Promise.resolve().then(() => currentRoute.page(root)).catch((error: unknown) => {
      console.error('Не удалось открыть страницу:', error);
      root.textContent = 'Не удалось открыть страницу';
    });
  } else {
    root.textContent = 'Page not found';
  }
}
