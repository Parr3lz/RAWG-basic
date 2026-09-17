import { rawgImage } from '../utils';

type Game = {
  id: number;
  name: string;
  background_image: string | null;
  rating: number;
};

type GameDetail = Game & {
  slug: string | null;
  released: string | null;
  playtime: number | null;
  description_raw?: string;
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
};

type GameDetailResponse = {
  game: GameDetail;
  favorited: boolean;
};

type GamesPage = {
  games: Game[];
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
  query: string;
  ordering: string;
  genres: string;
};

function createGameCard(game: Game) {
  const card = document.createElement('li');
  card.className = 'game-card';

  const link = document.createElement('a');
  link.href = `/games/${encodeURIComponent(String(game.id))}`;

  if (game.background_image) {
    const image = document.createElement('img');
    const imageUrl = rawgImage(game.background_image, 420);
    if (imageUrl) image.src = imageUrl;
    image.alt = game.name;
    link.append(image);
  }

  const info = document.createElement('div');
  info.className = 'game-card__info';

  const name = document.createElement('span');
  name.className = 'game-card__name';
  name.textContent = game.name;

  const rating = document.createElement('span');
  rating.className = 'game-card__rating';
  rating.textContent = `⭐ ${game.rating}`;

  info.append(name, rating);
  link.append(info);
  card.append(link);

  return card;
}

function createMetaItem(text: string) {
  const item = document.createElement('span');
  item.textContent = text;
  return item;
}

function createTag(label: string) {
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = label;
  return tag;
}

function createTagRow(className: string, caption: string, labels: string[]) {
  const row = document.createElement('div');
  row.className = className;

  const title = document.createElement('strong');
  title.textContent = caption;

  row.append(title, ...labels.map(createTag));
  return row;
}

function showToast(message: string) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.dataset.testid = 'toast';
  toast.textContent = message;
  document.body.append(toast);

  requestAnimationFrame(() => toast.classList.add('toast--show'));
  setTimeout(() => {
    toast.classList.remove('toast--show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}

const list = document.querySelector('.games-list');
const nav = document.querySelector('.pagination');
const form = document.querySelector('.search-form');
const filtersForm = document.querySelector('.filters-form');
const detail = document.querySelector('.game-detail');

if (list && nav) {
  const gamesList = list;
  const pagination = nav;
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
      const res = await fetch(`/api/games?${params}`);
      const data: GamesPage = await res.json();
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

if (detail instanceof HTMLElement) {
  const root = detail;
  const authenticated = root.dataset.authenticated === 'true';

  function setFavoriteState(button: HTMLButtonElement, favorited: boolean) {
    button.dataset.favorited = String(favorited);
    button.setAttribute('aria-pressed', String(favorited));
    button.textContent = favorited ? 'Remove from Favorites' : 'Add to Favorites';
  }

  async function toggleFavorite(button: HTMLButtonElement, gameId: number) {
    const favorited = button.dataset.favorited === 'true';
    button.disabled = true;
    try {
      const res = await fetch(`/api/favorites/${encodeURIComponent(String(gameId))}`, {
        method: favorited ? 'DELETE' : 'POST',
      });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      setFavoriteState(button, !favorited);
      showToast(favorited
        ? 'Game successfully removed from Favorites!'
        : 'Game successfully added to Favorites!');
    } catch (err) {
      console.error('Не удалось обновить Favorites:', err);
      showToast('Не удалось обновить Favorites');
    } finally {
      button.disabled = false;
    }
  }

  function createFavoriteControl(game: GameDetail, favorited: boolean) {
    if (!authenticated) {
      const link = document.createElement('a');
      link.href = '/auth/discord/login';
      link.textContent = 'Login to add to Favorites';
      return link;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'favorite-button';
    button.dataset.testid = 'favorite-toggle';
    setFavoriteState(button, favorited);
    button.addEventListener('click', () => toggleFavorite(button, game.id));
    return button;
  }

  function renderGame(data: GameDetailResponse) {
    const game = data.game;
    const fragment = document.createDocumentFragment();

    if (game.background_image) {
      const cover = document.createElement('img');
      cover.className = 'game-detail__cover';
      const coverUrl = rawgImage(game.background_image, 600);
      if (coverUrl) cover.src = coverUrl;
      cover.alt = game.name;
      fragment.append(cover);
    }

    const header = document.createElement('div');
    header.className = 'game-detail__header';

    const title = document.createElement('h1');
    title.className = 'game-detail__title';
    title.textContent = game.name;

    header.append(title, createFavoriteControl(game, data.favorited));

    const meta = document.createElement('div');
    meta.className = 'game-detail__meta';
    meta.append(
      createMetaItem(`⭐ ${game.rating} / 5`),
      createMetaItem(`Released: ${game.released ?? '—'}`),
      createMetaItem(`Playtime: ${game.playtime ?? 0}h`),
    );

    fragment.append(header, meta);

    if (game.genres?.length) {
      fragment.append(createTagRow(
        'game-detail__genres',
        'Genres:',
        game.genres.map((genre) => genre.name),
      ));
    }

    if (game.platforms?.length) {
      fragment.append(createTagRow(
        'game-detail__platforms',
        'Platforms:',
        game.platforms.map((entry) => entry.platform.name),
      ));
    }

    if (game.description_raw) {
      const description = document.createElement('div');
      description.className = 'game-detail__description';

      const heading = document.createElement('h2');
      heading.textContent = 'About';

      const text = document.createElement('p');
      text.textContent = game.description_raw;

      description.append(heading, text);
      fragment.append(description);
    }

    root.replaceChildren(fragment);
    document.title = game.name;
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
      const data: GameDetailResponse = await res.json();
      renderGame(data);
    } catch (err) {
      console.error('Не удалось загрузить игру:', err);
    }
  }

  loadGame();
}

