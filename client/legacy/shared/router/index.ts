export { createLink } from './createLink';
export { paths } from './paths';

export type Route = {
  matcher: (pathname: string) => boolean;
  page: (element: HTMLElement) => () => void;
  title: string;
  showFilters: boolean;
  showSearchButton: boolean;
};

type RouterConfig = {
  element: HTMLElement;
  routes: Route[];
  onRender?: (route: Route | undefined) => void;
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
    document.title = route?.title ?? 'Page not found';
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

let router: Router | null = null;

export function startRouter(config: RouterConfig): void {
  if (router) return;
  router = new Router(config.element, config.routes, config.onRender);
  router.render(location.pathname);
}

export default function navigate(path: string): void {
  if (!router) throw new Error('Router is not started');
  router.navigate(path);
}
