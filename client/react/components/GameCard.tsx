import { useState } from 'react';

type Game = {
  name: string;
  rating: number | null;
};

export default function GameCard({ game }: { game: Game }) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <li className="game-card">
      <div className="game-card__info">
        <span className="game-card__name">{game.name}</span>
        <span className="game-card__rating">⭐ {game.rating ?? '—'}</span>
        <button
          type="button"
          className="favorite-button"
          aria-pressed={isFavorite}
          onClick={() => setIsFavorite((value) => !value)}
        >
          {isFavorite ? 'Убрать из избранного' : 'В избранное'}
        </button>
      </div>
    </li>
  );
}
