import GameCard from './components/GameCard';

const game = {
  name: 'Тестовая игра',
  rating: 4.5,
};

export default function App() {
  return (
    <>
      <div className="game-detail__header">
        <h1 className="game-detail__title">RAWG Games</h1>
      </div>
      <ul className="games-list">
        <GameCard game={game} />
      </ul>
    </>
  );
}
