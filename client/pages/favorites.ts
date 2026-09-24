import { ApiError, requestJson } from '../shared/api';
import { createGameCard } from '../shared/createGameCard';
import type { Game } from '../shared/types';

export async function favoritesPage(element: HTMLElement): Promise<void> {
  const list = document.createElement('ul');
  list.className = 'favorites-list';
  element.replaceChildren(list);

  try {
    const games = await requestJson<Game[]>('/api/favorites');
    list.replaceChildren(...games.map((game) => createGameCard(game, 'favorite-card')));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      location.assign('/auth/discord/login');
      return;
    }
    console.error('Не удалось загрузить Favorites:', error);
    element.textContent = 'Не удалось загрузить Favorites';
  }
}
