import { requestJson } from '../shared/api';
import { createGameCard } from '../shared/createGameCard';
import { showToast } from '../shared/showToast';
import type { Game, GamesPage } from '../shared/types';

export function gamesListPage(element: HTMLElement): void {
  const gamesList = document.createElement('ul');
  gamesList.className = 'games-list';
  const pagination = document.createElement('nav');
  pagination.className = 'pagination';
  element.replaceChildren(gamesList, pagination);

  const form = document.querySelector('.search-form');
  const filtersForm = document.querySelector('.filters-form');
  const params = new URLSearchParams(location.search);
  let currentQuery = params.get('q') || '';
  let currentOrdering = params.get('ordering') || '';
  let currentGenres = params.get('genres') || '';
  const initialPage = Number(params.get('page')) || 1;
  let loading = false;

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

  function syncUrl(page: number, query: string, ordering: string, genres: string) {
    history.replaceState(null, '', buildListUrl(page, query, ordering, genres));
  }

  function createPaginationLink(label: string, page: number, data: GamesPage) {
    const link = document.createElement('a');
    link.href = buildListUrl(page, data.query, data.ordering, data.genres);
    link.dataset.page = String(page);
    link.textContent = label;
    return link;
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
    if (loading) return;
    loading = true;
    pagination.classList.add('pagination--loading');
    try {
      const params = new URLSearchParams({ page: String(page), q: query });
      if (ordering) params.set('ordering', ordering);
      if (genres) params.set('genres', genres);
      const data = await requestJson<GamesPage>(`/api/games?${params}`);
      currentQuery = data.query;
      currentOrdering = data.ordering || '';
      currentGenres = data.genres || '';
      renderGames(data.games);
      renderPagination(data);
      syncUrl(data.page, data.query, data.ordering, data.genres);
    } catch (err) {
      console.error('Не удалось загрузить игры:', err);
      showToast('Не удалось загрузить игры');
    } finally {
      loading = false;
      pagination.classList.remove('pagination--loading');
    }
  }

  pagination.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('[data-page]');
    if (!link) return;
    event.preventDefault();
    loadPage(Number(link.dataset.page), currentQuery, currentOrdering, currentGenres);
  });

  if (form) {
    const input = form.querySelector<HTMLInputElement>('input[name="q"]');
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    if (input) {
      input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentQuery = input.value;
          loadPage(1, currentQuery, currentOrdering, currentGenres);
        }, 300);
      });
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearTimeout(debounceTimer);
      currentQuery = input ? input.value : '';
      loadPage(1, currentQuery, currentOrdering, currentGenres);
    });
  }

  if (filtersForm) {
    const orderingSelect = filtersForm.querySelector<HTMLSelectElement>('select[name="ordering"]');
    const genresSelect = filtersForm.querySelector<HTMLSelectElement>('select[name="genres"]');

    const applyFilters = () => {
      currentOrdering = orderingSelect ? orderingSelect.value : '';
      currentGenres = genresSelect ? genresSelect.value : '';
      loadPage(1, currentQuery, currentOrdering, currentGenres);
    };

    filtersForm.addEventListener('change', applyFilters);
    filtersForm.addEventListener('submit', (event) => {
      event.preventDefault();
      applyFilters();
    });
  }

  loadPage(initialPage, currentQuery, currentOrdering, currentGenres);
}

