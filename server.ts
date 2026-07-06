import http from 'http';
import { URL } from 'url';
import Handlebars from 'handlebars';
import fs from 'fs';
import { getFavorites, addFavorite, removeFavorite, isFavorite } from './db';

Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
Handlebars.registerHelper('add', (a: number, b: number) => a + b);
Handlebars.registerHelper('subtract', (a: number, b: number) => a - b);

Handlebars.registerPartial('layout', fs.readFileSync('./templates/layout.hbs', 'utf-8'));

const gamesListTemplate = Handlebars.compile(fs.readFileSync('./templates/games-list.hbs', 'utf-8'));
const gameDetailsTemplate = Handlebars.compile(fs.readFileSync('./templates/game-details.hbs', 'utf-8'));
const favoritesTemplate = Handlebars.compile(fs.readFileSync('./templates/favorites.hbs', 'utf-8'));

const API_KEY = process.env.RAWG_API_KEY;

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (url.pathname === '/styles.css') {
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(fs.readFileSync('./styles.css', 'utf-8'));
    return;
  }

  if (url.pathname === '/') {
    const page = url.searchParams.get('page') || '1';
    const apiUrl = `https://api.rawg.io/api/games?key=${API_KEY}&page=${page}`;
    const apiRes = await fetch(apiUrl);
    const data = await apiRes.json();
    const html = gamesListTemplate({ games: data.results, page: Number(page), hasNext: !!data.next });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (url.pathname === '/search') {
    const query = url.searchParams.get('q') || '';
    const apiUrl = `https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(query)}`;
    const apiRes = await fetch(apiUrl);
    const data = await apiRes.json();
    const html = gamesListTemplate({ games: data.results, page: 1, hasNext: false });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (url.pathname === '/favorites') {
    const favorites = getFavorites();
    const html = favoritesTemplate({ favorites });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (url.pathname === '/favorites/add' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      addFavorite({
        id: Number(params.get('game_id')),
        slug: params.get('game_slug'),
        name: params.get('game_name') ?? '',
        background_image: params.get('game_background_image'),
        rating: params.get('game_rating') ? Number(params.get('game_rating')) : null,
        released: params.get('game_released'),
        playtime: params.get('game_playtime') ? Number(params.get('game_playtime')) : null,
      });
      res.writeHead(302, { 'Location': `/games/${params.get('game_id')}?toast=added` });
      res.end();
    });
    return;
  }

  if (url.pathname === '/favorites/remove' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const gameId = params.get('game_id') ?? '';
      removeFavorite(gameId);
      res.writeHead(302, { 'Location': `/games/${gameId}?toast=removed` });
      res.end();
    });
    return;
  }

  if (url.pathname.startsWith('/games/')) {
    const id = url.pathname.split('/')[2];
    const apiUrl = `https://api.rawg.io/api/games/${id}?key=${API_KEY}`;
    const apiRes = await fetch(apiUrl);
    const game = await apiRes.json();
    const favorited = isFavorite(id);
    const toastParam = url.searchParams.get('toast');
    const toastMessage = toastParam === 'added'
      ? 'Game successfully added to Favorites!'
      : toastParam === 'removed'
        ? 'Game successfully removed from Favorites!'
        : null;
    const html = gameDetailsTemplate({ game, favorited, toastMessage });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
