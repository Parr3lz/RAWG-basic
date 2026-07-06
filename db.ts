import Database from 'better-sqlite3';

const db = new Database('./favorites.db');

db.exec(`CREATE TABLE if not exists favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rawg_id INTEGER NOT NULL UNIQUE,
  slug TEXT,
  name TEXT NOT NULL,
  background_image TEXT,
  rating REAL,
  released TEXT,
  playtime INTEGER,
  added_at TEXT NOT NULL DEFAULT (datetime('now'))
);`);

export interface FavoriteGame {
  id: number;
  slug?: string | null;
  name: string;
  background_image?: string | null;
  rating?: number | null;
  released?: string | null;
  playtime?: number | null;
}

export interface FavoriteRow {
  id: number;
  rawg_id: number;
  slug: string | null;
  name: string;
  background_image: string | null;
  rating: number | null;
  released: string | null;
  playtime: number | null;
  added_at: string;
}

export function getFavorites(): FavoriteRow[] {
  return db.prepare('SELECT * FROM favorites ORDER BY added_at DESC').all() as FavoriteRow[];
}

export function addFavorite(game: FavoriteGame) {
  return db.prepare(`
    INSERT OR IGNORE INTO favorites (rawg_id, slug, name, background_image, rating, released, playtime)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    game.id,
    game.slug ?? null,
    game.name,
    game.background_image ?? null,
    game.rating ?? null,
    game.released ?? null,
    game.playtime ?? null
  );
}

export function removeFavorite(rawgId: number | string) {
  return db.prepare('DELETE FROM favorites WHERE rawg_id = ?').run(rawgId);
}

export function isFavorite(rawgId: number | string): boolean {
  const result = db.prepare('SELECT 1 FROM favorites WHERE rawg_id = ?').get(rawgId);
  return !!result;
}
