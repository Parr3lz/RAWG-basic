import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import { getCurrentUser, getDiscordAuthorizeUrl } from './auth';
import { exchangeCodeForToken } from './auth';
import { fetchDiscordUser } from './auth';
import { signSession } from './auth';
import { parseCookies } from './auth';
import Handlebars from 'handlebars';
import fs from 'fs';
import { getFavorites, addFavorite, removeFavorite, isFavorite } from './db';
import { rawgImage } from './utils';

declare global {
  namespace Express {
    interface Request {
      user: ReturnType<typeof getCurrentUser>;
    }
  }
}

Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
Handlebars.registerHelper('add', (a: number, b: number) => a + b);
Handlebars.registerHelper('subtract', (a: number, b: number) => a - b);
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper('rawgImage', rawgImage);

Handlebars.registerPartial('layout', fs.readFileSync('./templates/layout.hbs', 'utf-8'));

const gamesListTemplate = Handlebars.compile(fs.readFileSync('./templates/games-list.hbs', 'utf-8'));
const gameDetailsTemplate = Handlebars.compile(fs.readFileSync('./templates/game-details.hbs', 'utf-8'));
const favoritesTemplate = Handlebars.compile(fs.readFileSync('./templates/favorites.hbs', 'utf-8'));

const API_KEY = process.env.RAWG_API_KEY;
const PORT = 3000;

function isStatusError(error: unknown, status: number): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && (error as { status: unknown }).status === status;
}

async function fetchGame(id: string) {
  const apiRes = await fetch(`https://api.rawg.io/api/games/${id}?key=${API_KEY}`);
  if (apiRes.status === 400) {
    throw Object.assign(new Error('Bad request'), { status: 400 });
  }
  if (apiRes.status === 404) {
    throw Object.assign(new Error('Not found'), { status: 404 });
  }
  if (!apiRes.ok) {
    throw Object.assign(new Error('Internal server error'), { status: 500 });
  }
  return apiRes.json();
}

async function fetchGames(page: string, query: string, ordering: string, genres: string) {
  const empty = {
    games: [],
    page: Number(page),
    hasNext: false,
    hasPrev: Number(page) > 1,
    query,
    ordering,
    genres,
  };
  const params = new URLSearchParams({ key: API_KEY!, page });
  if (query) params.set('search', query);
  if (ordering) params.set('ordering', ordering);
  if (genres) params.set('genres', genres);
  try {
    const apiRes = await fetch(`https://api.rawg.io/api/games?${params}`);
    if (apiRes.status === 400) {
      throw Object.assign(new Error('Bad request'), { status: 400 });
    }
    if (!apiRes.ok) {
      return empty;
    }
    const data = await apiRes.json();
    return {
      games: data.results ?? [],
      page: Number(page),
      hasNext: !!data.next,
      hasPrev: Number(page) > 1,
      query,
      ordering,
      genres,
    };
  } catch (error) {
    if (isStatusError(error, 400)) {
      throw error;
    }
    return empty;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.redirect('/auth/discord/login');
    return;
  }
  next();
}

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use((req, res, next) => {
  req.user = getCurrentUser(req);
  next();
});

app.get('/api/games', async (req, res) => {
  const page = (req.query.page as string) || '1';
  const query = (req.query.q as string) || '';
  const ordering = (req.query.ordering as string) || '';
  const genres = (req.query.genres as string) || '';
  try {
    const result = await fetchGames(page, query, ordering, genres);
    res.json(result);
  } catch (error) {
    if (isStatusError(error, 400)) {
      res.status(400).send({ message: 'Invalid request' });
      return;
    }
    res.json({
      games: [],
      page: Number(page),
      hasNext: false,
      hasPrev: Number(page) > 1,
      query,
      ordering,
      genres,
    });
  }
});

app.get('/api/games/:id', async (req, res) => {
  const id = String(req.params.id);
  try {
    const game = await fetchGame(id);
    const favorited = req.user ? isFavorite(id, req.user.id) : false;
    res.json({ game, favorited });
  } catch (error) {
    if (isStatusError(error, 400)) {
      res.status(400).send({ message: 'Invalid request' });
      return;
    }
    if (isStatusError(error, 404)) {
      res.status(404).send({ message: 'Not found' });
      return;
    }
    console.error(error);
    res.status(500).send({ message: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  const page = (req.query.page as string) || '1';
  const query = (req.query.q as string) || '';
  const ordering = (req.query.ordering as string) || '';
  const genres = (req.query.genres as string) || '';
  const html = gamesListTemplate({
    games: [],
    page: Number(page),
    hasNext: false,
    hasPrev: false,
    query,
    ordering,
    genres,
    user: req.user,
    showFilters: true,
  });
  res.send(html);
});

app.get('/search', (req, res) => {
  const params = new URLSearchParams();
  const query = req.query.q as string | undefined;
  const page = req.query.page as string | undefined;
  if (query) params.set('q', query);
  if (page && page !== '1') params.set('page', page);
  const qs = params.toString();
  res.redirect(qs ? `/?${qs}` : '/');
});

app.get('/favorites', requireAuth, (req, res) => {
  const favorites = getFavorites(req.user.id);
  const html = favoritesTemplate({ favorites, user: req.user });
  res.send(html);
});

app.post('/favorites/add', requireAuth, (req, res) => {
  const body = req.body;
  addFavorite({
    id: Number(body.game_id),
    slug: body.game_slug,
    name: body.game_name ?? '',
    background_image: body.game_background_image,
    rating: body.game_rating ? Number(body.game_rating) : null,
    released: body.game_released,
    playtime: body.game_playtime ? Number(body.game_playtime) : null,
  }, req.user.id);
  res.redirect(`/games/${body.game_id}?toast=added`);
});

app.post('/favorites/remove', requireAuth, (req, res) => {
  const gameId = req.body.game_id ?? '';
  removeFavorite(gameId, req.user.id);
  res.redirect(`/games/${gameId}?toast=removed`);
});

app.get('/auth/discord/login', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  const authorizeUrl = getDiscordAuthorizeUrl(state);
  res.writeHead(302, {
    'Location': authorizeUrl,
    'Set-Cookie': `oauth_state=${state}; HttpOnly; Max-Age=300; Path=/`,
  });
  res.end();
});

app.get('/auth/discord/callback', async (req, res) => {
  const state = req.query.state as string | undefined;
  const code = req.query.code as string | undefined;
  const cookies = parseCookies(req.headers.cookie);
  if (state !== cookies.oauth_state || !state || !code) {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end('Invalid request');
    return;
  }
  try {
    const { access_token } = await exchangeCodeForToken(code);
    const user = await fetchDiscordUser(access_token);
    const session = signSession({ id: user.id, username: user.username, avatar: user.avatar });
    res.writeHead(302, {
      'Location': '/',
      'Set-Cookie': [
        `session=${session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
        `oauth_state=; HttpOnly; Max-Age=0; Path=/`,
      ],
    });
    res.end();
  } catch (error) {
    console.error(error);
    res.status(400).type('html').send('Invalid request');
  }
});

app.get('/auth/logout', (req, res) => {
  res.writeHead(302, {
    'Location': '/',
    'Set-Cookie': `session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
  });
  res.end();
});

app.get('/games/:id', (req, res) => {
  const toastParam = req.query.toast;
  const toastMessage = toastParam === 'added'
    ? 'Game successfully added to Favorites!'
    : toastParam === 'removed'
      ? 'Game successfully removed from Favorites!'
      : null;
  const html = gameDetailsTemplate({ toastMessage, user: req.user, showSearchButton: true });
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
