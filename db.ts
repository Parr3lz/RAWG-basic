import Database from 'better-sqlite3';

const db = new Database('./favorites.db');

db.exec(`CREATE TABLE if not exists favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  rawg_id INTEGER NOT NULL,
  slug TEXT,
  name TEXT NOT NULL,
  background_image TEXT,
  rating REAL,
  released TEXT,
  playtime INTEGER,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(discord_id, rawg_id)
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

export function getFavorites(discordId: string): FavoriteRow[] {
  return db.prepare('SELECT * FROM favorites WHERE discord_id = ? ORDER BY added_at DESC').all(discordId) as FavoriteRow[];
}

export function addFavorite(game: FavoriteGame, discordId: string) {
  return db.prepare(`
    INSERT OR IGNORE INTO favorites (discord_id, rawg_id, slug, name, background_image, rating, released, playtime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    discordId,
    game.id,
    game.slug ?? null,
    game.name,
    game.background_image ?? null,
    game.rating ?? null,
    game.released ?? null,
    game.playtime ?? null
  );
}

export function removeFavorite(rawgId: number | string, discordId: string) {
  return db.prepare('DELETE FROM favorites WHERE rawg_id = ? AND discord_id = ?').run(rawgId, discordId);
}

export function isFavorite(rawgId: number | string, discordId: string): boolean {
  const result = db.prepare('SELECT 1 FROM favorites WHERE rawg_id = ? AND discord_id = ?').get(rawgId, discordId);
  return !!result;
}
