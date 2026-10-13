import { requestJson } from '../shared/api';
import { createGameCard } from '../shared/createGameCard';
import { createLink } from '../shared/createLink';
import { showToast } from '../shared/showToast';
import type { Game, GamesPage } from '../shared/types';

export function gamesListPage(element: HTMLElement): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const gamesList = document.createElement('ul');
  gamesList.className = 'games-list';
  const pagination = document.createElement('nav');
  pagination.className = 'pagination';
  element.replaceChildren(gamesList, pagination);

  const params = new URLSearchParams(location.search);
  const initialQuery = params.get('q') || '';
  const initialOrdering = params.get('ordering') || '';
  const initialGenres = params.get('genres') || '';
  const initialPage = Number(params.get('page')) || 1;

  function renderGames(games: Game[]) {
    const fragment = document.createDocumentFragment();
    games.forEach((game) => fragment.append(createGameCard(game)));
    gamesList.replaceChildren(fragment);
  }

  function buildListUrl(page: number, query: string, ordering: string, genres: string) {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (ordering) next.set('ordering', ordering);
    if (genres) next.set('genres', genres);
    if (page > 1) next.set('page', String(page));
    const qs = next.toString();
    return qs ? `/?${qs}` : '/';
  }

  function createPaginationLink(label: string, page: number, data: GamesPage) {
    return createLink(buildListUrl(page, data.query, data.ordering, data.genres), label);
  }

  function renderPagination(data: GamesPage) {
    const fragment = document.createDocumentFragment();

    if (data.hasPrev) {
      fragment.append(createPaginationLink('← Prev', data.page - 1, data));
    }

    const currentPage = document.createElement('span');
    currentPage.textContent = `Page ${data.page}`;
    fragment.append(currentPage);

    if (data.hasNext) {
      fragment.append(createPaginationLink('Next →', data.page + 1, data));
    }

    pagination.replaceChildren(fragment);
  }

  async function loadPage(page: number, query: string, ordering: string, genres: string) {
    pagination.classList.add('pagination--loading');
    try {
      const params = new URLSearchParams({ page: String(page), q: query });
      if (ordering) params.set('ordering', ordering);
      if (genres) params.set('genres', genres);
      const data = await requestJson<GamesPage>(`/api/games?${params}`, { signal });
      if (signal.aborted) return;
      renderGames(data.games);
      renderPagination(data);
    } catch (err) {
      if (signal.aborted) return;
      console.error('Не удалось загрузить игры:', err);
      showToast('Не удалось загрузить игры');
    } finally {
      if (!signal.aborted) pagination.classList.remove('pagination--loading');
    }
  }

  loadPage(initialPage, initialQuery, initialOrdering, initialGenres);

  return () => {
    if (signal.aborted) return;
    controller.abort();
    gamesList.remove();
    pagination.remove();
  };
}
