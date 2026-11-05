import { rawgImage } from './rawgImage';
import { createLink, paths } from './router';
import type { Game } from './types';

export function createGameCard(game: Game, className = 'game-card') {
  const card = document.createElement('li');
  card.className = className;

  const link = createLink(paths.game(game.id), '');

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
  rating.textContent = `⭐ ${game.rating ?? ''}`;

  info.append(name, rating);
  link.append(info);
  card.append(link);

  return card;
}

