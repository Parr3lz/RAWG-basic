import { ApiError, requestJson } from '../shared/api';
import { createGameCard } from '../shared/createGameCard';
import type { Game } from '../shared/types';

export function favoritesPage(element: HTMLElement): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const root = document.createElement('div');
  const list = document.createElement('ul');
  list.className = 'favorites-list';
  root.append(list);
  element.replaceChildren(root);

  async function loadFavorites() {
    try {
      const games = await requestJson<Game[]>('/api/favorites', { signal });
      if (signal.aborted) return;
      list.replaceChildren(...games.map((game) => createGameCard(game, 'favorite-card')));
    } catch (error) {
      if (signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) {
        location.assign('/auth/discord/login');
        return;
      }
      console.error('Не удалось загрузить Favorites:', error);
      root.textContent = 'Не удалось загрузить Favorites';
    }
  }

  loadFavorites();

  return () => {
    if (signal.aborted) return;
    controller.abort();
    root.remove();
  };
}
