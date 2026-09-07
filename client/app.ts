import Handlebars from 'handlebars';
import { rawgImage } from '../utils';
import gameDetailSource from '../templates/game-detail.hbs';

Handlebars.registerHelper('rawgImage', rawgImage);
const gameDetailTemplate = Handlebars.compile(gameDetailSource);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const list = document.querySelector('.games-list');
const nav = document.querySelector('.pagination');
const form = document.querySelector('.search-form');
const filtersForm = document.querySelector('.filters-form');
const detail = document.querySelector('.game-detail');

if (list && nav) {
  const params = new URLSearchParams(location.search);
  let currentQuery = params.get('q') || '';
  let currentOrdering = params.get('ordering') || '';
  let currentGenres = params.get('genres') || '';
  const initialPage = Number(params.get('page')) || 1;
  let loading = false;

  function renderGames(games) {
    list.innerHTML = games.map((game) => `
      <li class="game-card">
        <a href="/games/${encodeURIComponent(game.id)}">
          ${game.background_image
            ? `<img src="${escapeHtml(game.background_image)}" alt="${escapeHtml(game.name)}">`
            : ''}
          <div class="game-card__info">
            <span class="game-card__name">${escapeHtml(game.name)}</span>
            <span class="game-card__rating">⭐ ${escapeHtml(game.rating)}</span>
          </div>
        </a>
      </li>
    `).join('');
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

  function renderPagination(data) {
    const prev = data.hasPrev
      ? `<a href="${buildListUrl(data.page - 1, data.query, data.ordering, data.genres)}" data-page="${data.page - 1}">← Prev</a>`
      : '';
    const next = data.hasNext
      ? `<a href="${buildListUrl(data.page + 1, data.query, data.ordering, data.genres)}" data-page="${data.page + 1}">Next →</a>`
      : '';
    nav.innerHTML = `${prev}<span>Page ${data.page}</span>${next}`;
  }

  async function loadPage(page: number, query: string, ordering: string, genres: string) {
    if (loading) return;
    loading = true;
    nav.classList.add('pagination--loading');
    try {
      const params = new URLSearchParams({ page: String(page), q: query });
      if (ordering) params.set('ordering', ordering);
      if (genres) params.set('genres', genres);
      const res = await fetch(`/api/games?${params}`);
      const data = await res.json();
      currentQuery = data.query;
      currentOrdering = data.ordering || '';
      currentGenres = data.genres || '';
      renderGames(data.games);
      renderPagination(data);
      syncUrl(data.page, data.query, data.ordering, data.genres);
    } catch (err) {
      console.error('Не удалось загрузить игры:', err);
    } finally {
      loading = false;
      nav.classList.remove('pagination--loading');
    }
  }

  nav.addEventListener('click', (event) => {
    const link = event.target.closest('[data-page]');
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

if (detail instanceof HTMLElement) {
  const root = detail;
  const authenticated = root.dataset.authenticated === 'true';

  function renderGame(data) {
    root.innerHTML = gameDetailTemplate({
      game: data.game,
      favorited: data.favorited,
      user: authenticated,
    });
    document.title = data.game.name;
  }

  async function loadGame() {
    const match = location.pathname.match(/^\/games\/([^/]+)$/);
    if (!match) return;
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(match[1])}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        root.textContent = data?.message || 'Internal server error';
        return;
      }
      const data = await res.json();
      renderGame(data);
    } catch (err) {
      console.error('Не удалось загрузить игру:', err);
    }
  }

  loadGame();
}

