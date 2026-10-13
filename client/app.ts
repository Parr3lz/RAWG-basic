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
  page: (element: HTMLElement) => () => void;
  title: string;
  showFilters: boolean;
  showSearchButton: boolean;
};

class Page {
  constructor(
    private element: HTMLElement,
    private route: Route,
  ) {}

  render(): () => void {
    return this.route.page(this.element);
  }
}

class Router {
  private currentPage: Page | null = null;
  private cleanup: (() => void) | null = null;
  private currentPath = '';

  constructor(
    private element: HTMLElement,
    private routes: Route[],
    private onRender: (route: Route | undefined) => void = () => {},
  ) {
    window.addEventListener('popstate', () => this.handlePopState());
    document.addEventListener('click', (event) => this.handleLinkClick(event));
  }

  navigate(path: string): void {
    const url = new URL(path, location.href);
    if (url.href !== location.href) history.pushState(null, '', url);
    this.render(location.pathname);
  }

  render(pathname: string): void {
    this.cleanup?.();
    this.cleanup = null;
    this.currentPage = null;
    this.currentPath = location.pathname + location.search;

    const route = this.routes.find((route) => route.matcher(pathname));
    this.onRender(route);

    if (!route) {
      this.element.textContent = 'Page not found';
      return;
    }

    this.currentPage = new Page(this.element, route);
    this.cleanup = this.currentPage.render();
  }

  private handlePopState(): void {
    if (location.pathname + location.search !== this.currentPath) {
      this.render(location.pathname);
    }
  }

  private handleLinkClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest<HTMLAnchorElement>('a[href]');
    if (!link || link.hasAttribute('download') || link.relList.contains('external')) return;
    if (link.target && link.target.toLowerCase() !== '_self') return;

    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    if (!this.routes.some((route) => route.matcher(url.pathname))) return;
    if (link.getAttribute('href')?.startsWith('#') ||
        (url.pathname === location.pathname && url.search === location.search && url.hash)) return;

    event.preventDefault();
    this.navigate(url.href);
  }
}

const root = document.querySelector<HTMLElement>('#app');
const headerRoot = document.querySelector<HTMLElement>('#header-root');

if (root && headerRoot) {
  const params = new URLSearchParams(location.search);
  const header = createHeader({
    query: params.get('q') ?? '',
    ordering: params.get('ordering') ?? '',
    genres: params.get('genres') ?? '',
    showFilters: true,
    showSearchButton: true,
  }, { getCurrentUser });
  headerRoot.replaceChildren(header.element);

  const searchInput = header.searchForm.querySelector<HTMLInputElement>('input[name="q"]');
  const searchButton = header.searchForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  const orderingSelect = header.filtersForm?.querySelector<HTMLSelectElement>('select[name="ordering"]');
  const genresSelect = header.filtersForm?.querySelector<HTMLSelectElement>('select[name="genres"]');
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  function syncPage(route: Route | undefined): void {
    clearTimeout(searchTimer);
    const params = new URLSearchParams(location.search);

    for (const form of [header.searchForm, header.filtersForm]) {
      for (const name of ['q', 'ordering', 'genres']) {
        const control = form?.elements.namedItem(name);
        if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
          control.value = params.get(name) ?? '';
          if (control instanceof HTMLSelectElement && control.selectedIndex === -1) {
            control.selectedIndex = 0;
          }
        }
      }
    }

    if (header.filtersForm) header.filtersForm.style.display = route?.showFilters ? '' : 'none';
    if (searchButton) searchButton.hidden = !route?.showSearchButton;
    document.title = route?.title ?? 'Page not found';
  }

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
  const router = new Router(root, routes, syncPage);

  function navigateToGames(): void {
    const params = new URLSearchParams();
    if (searchInput?.value) params.set('q', searchInput.value);
    if (orderingSelect?.value) params.set('ordering', orderingSelect.value);
    if (genresSelect?.value) params.set('genres', genresSelect.value);
    const query = params.toString();
    router.navigate(query ? `/?${query}` : '/');
  }

  header.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    navigateToGames();
  });

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    if (location.pathname === '/') {
      searchTimer = setTimeout(navigateToGames, 300);
    }
  });

  header.filtersForm?.addEventListener('change', navigateToGames);
  header.filtersForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    navigateToGames();
  });

  Promise.resolve().then(() => router.render(location.pathname)).catch((error: unknown) => {
    console.error('Не удалось открыть страницу:', error);
    root.textContent = 'Не удалось открыть страницу';
  });
}
