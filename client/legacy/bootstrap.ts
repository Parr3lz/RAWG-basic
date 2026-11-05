import { mountHeader } from './components/header';
import { startRouter, type Route } from './shared/router';

export function startApp(routes: Route[]): void {
  const root = document.querySelector<HTMLElement>('#app')!;
  const headerRoot = document.querySelector<HTMLElement>('#header-root')!;

  const syncHeader = mountHeader(headerRoot);

  Promise.resolve().then(() => startRouter({
    element: root,
    routes,
    onRender: syncHeader,
  })).catch((error: unknown) => {
    console.error('Не удалось открыть страницу:', error);
    root.textContent = 'Не удалось открыть страницу';
  });
}
