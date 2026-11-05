import { mountHeader } from './components/header';
import { startRouter, type Route } from './shared/router';

let started = false;

export function startApp(routes: Route[]): void {
  if (started) return;

  const root = document.querySelector<HTMLElement>('#app');
  const headerRoot = document.querySelector<HTMLElement>('#header-root');
  if (!root || !headerRoot) return;

  started = true;
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
