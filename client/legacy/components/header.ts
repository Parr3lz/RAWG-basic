import type { User } from '../shared/types';
import { createAccount } from '../shared/createAccount';
import navigate, { createLink, paths, type Route } from '../shared/router';
import { getCurrentUser } from '../shared/getCurrentUser';
import { GENRE_OPTIONS, ORDERING_OPTIONS } from '../shared/gameFilters';

type HeaderOptions = {
  query: string;
  ordering: string;
  genres: string;
};

type HeaderDependencies = { getCurrentUser: () => Promise<User | null> };

export type Header = {
  element: HTMLElement;
  search: {
    form: HTMLFormElement;
    input: HTMLInputElement;
    button: HTMLButtonElement;
    ordering: HTMLInputElement;
    genres: HTMLInputElement;
  };
  filters: {
    form: HTMLFormElement;
    query: HTMLInputElement;
    ordering: HTMLSelectElement;
    genres: HTMLSelectElement;
  };
};

export function createHeader(options: HeaderOptions, dependencies: HeaderDependencies): Header {
  const element = Object.assign(document.createElement('header'), { className: 'header' });

  const navigation = Object.assign(document.createElement('div'), { className: 'header__right' });
  const account = createAccount(dependencies.getCurrentUser);
  navigation.append(createLink(paths.favorites, 'Favorites'), account);

  const search = createSearchForm(options);
  const filters = createFiltersForm(options);
  const searchControls = Object.assign(document.createElement('div'), { className: 'header__left' });
  searchControls.append(search.form, filters.form);

  element.append(createLink(paths.games(), 'RAWG Games'), navigation, searchControls);
  return { element, search, filters };
}

export function mountHeader(root: HTMLElement): (route: Route | undefined) => void {
  const params = new URLSearchParams(location.search);
  const header = createHeader({
    query: params.get('q') ?? '',
    ordering: params.get('ordering') ?? '',
    genres: params.get('genres') ?? '',
  }, { getCurrentUser });
  root.replaceChildren(header.element);

  const { search, filters } = header;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  function navigateToGames(): void {
    navigate(paths.games({
      query: search.input.value,
      ordering: filters.ordering.value,
      genres: filters.genres.value,
    }));
  }

  search.form.addEventListener('submit', (event) => {
    event.preventDefault();
    navigateToGames();
  });

  search.input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    if (location.pathname === paths.games()) {
      searchTimer = setTimeout(navigateToGames, 300);
    }
  });

  filters.form.addEventListener('change', navigateToGames);
  filters.form.addEventListener('submit', (event) => {
    event.preventDefault();
    navigateToGames();
  });

  return (route) => {
    clearTimeout(searchTimer);
    const params = new URLSearchParams(location.search);

    search.input.value = params.get('q') ?? '';
    filters.query.value = search.input.value;
    search.ordering.value = params.get('ordering') ?? '';
    search.genres.value = params.get('genres') ?? '';
    setSelectValue(filters.ordering, search.ordering.value);
    setSelectValue(filters.genres, search.genres.value);

    filters.form.style.display = route?.showFilters ? '' : 'none';
    search.button.hidden = !route?.showSearchButton;
  };
}

function createSearchForm(options: HeaderOptions): Header['search'] {
  const form = createForm('search-form');
  const input = createInput('q', options.query, 'text');
  input.className = 'search-form__input';
  input.placeholder = 'Search games...';
  const ordering = createInput('ordering', options.ordering);
  const genres = createInput('genres', options.genres);
  const button = Object.assign(document.createElement('button'), {
    type: 'submit', className: 'search-form__button', textContent: 'Search',
  });
  form.append(input, ordering, genres, button);
  return { form, input, button, ordering, genres };
}

function createFiltersForm(options: HeaderOptions): Header['filters'] {
  const form = createForm('filters-form');
  const query = createInput('q', options.query);
  const ordering = createSelect('ordering', options.ordering, ORDERING_OPTIONS);
  const genres = createSelect('genres', options.genres, GENRE_OPTIONS);
  form.append(query, ordering, genres);
  return { form, query, ordering, genres };
}

function createForm(className: string): HTMLFormElement {
  return Object.assign(document.createElement('form'), { className, action: paths.games(), method: 'GET' });
}

function createInput(name: string, value: string, type = 'hidden'): HTMLInputElement {
  return Object.assign(document.createElement('input'), { type, name, value });
}

function createSelect(name: string, value: string, choices: Record<string, string>): HTMLSelectElement {
  const select = Object.assign(document.createElement('select'), { name, className: 'filters-form__select' });
  for (const [optionValue, label] of Object.entries(choices)) {
    select.add(new Option(label, optionValue));
  }
  setSelectValue(select, value);
  return select;
}

function setSelectValue(select: HTMLSelectElement, value: string): void {
  select.value = value;
  if (select.selectedIndex === -1) select.selectedIndex = 0;
}
