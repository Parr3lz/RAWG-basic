import { requestJson } from '../shared/api';
import { rawgImage } from '../shared/rawgImage';
import { showToast } from '../shared/showToast';
import type { GameDetail, GameDetailResponse } from '../shared/types';

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

export function gameDetailsPage(element: HTMLElement): void {
  const root = document.createElement('div');
  root.className = 'game-detail';
  element.replaceChildren(root);
  const authenticated = element.dataset.authenticated === 'true';

  function setFavoriteState(button: HTMLButtonElement, favorited: boolean) {
    button.dataset.favorited = String(favorited);
    button.setAttribute('aria-pressed', String(favorited));
    button.textContent = favorited ? 'Remove from Favorites' : 'Add to Favorites';
  }

  async function toggleFavorite(button: HTMLButtonElement, gameId: number) {
    const favorited = button.dataset.favorited === 'true';
    button.disabled = true;
    try {
      const data = await requestJson<{ favorited: boolean }>(`/api/favorites/${encodeURIComponent(String(gameId))}`, {
        method: favorited ? 'DELETE' : 'POST',
      });
      setFavoriteState(button, data.favorited);
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
    const match = location.pathname.match(/^\/games\/([^/]+)\/?$/i);
    if (!match) return;
    try {
      const data = await requestJson<GameDetailResponse>(`/api/games/${encodeURIComponent(match[1])}`);
      renderGame(data);
    } catch (err) {
      console.error('Не удалось загрузить игру:', err);
      root.textContent = err instanceof Error ? err.message : 'Не удалось загрузить игру';
    }
  }

  loadGame();
}

