import type { User } from '../shared/types';
import { createAccount } from '../shared/createAccount';
import navigate, { createLink, paths, type Route } from '../shared/router';
import { getCurrentUser } from '../shared/getCurrentUser';
import { GENRE_OPTIONS, ORDERING_OPTIONS } from '../shared/gameFilters';

type HeaderOptions = {
  query: string;
  ordering: string;
  genres: string;
  showFilters: boolean;
  showSearchButton: boolean;
};

type HeaderDependencies = { getCurrentUser: () => Promise<User | null> };

export type Header = {
  element: HTMLElement;
  searchForm: HTMLFormElement;
  filtersForm: HTMLFormElement | null;
};

export function createHeader(options: HeaderOptions, dependencies: HeaderDependencies): Header {
  const element = Object.assign(document.createElement('header'), { className: 'header' });

  const navigation = Object.assign(document.createElement('div'), { className: 'header__right' });
  const account = createAccount(dependencies.getCurrentUser);
  navigation.append(createLink(paths.favorites, 'Favorites'), account);

  const searchForm = createSearchForm(options);
  const filtersForm = options.showFilters ? createFiltersForm(options) : null;
  const searchControls = Object.assign(document.createElement('div'), { className: 'header__left' });
  searchControls.append(searchForm);
  if (filtersForm) searchControls.append(filtersForm);

  element.append(createLink(paths.games(), 'RAWG Games'), navigation, searchControls);
  return { element, searchForm, filtersForm };
}

export function mountHeader(root: HTMLElement): (route: Route | undefined) => void {
  const params = new URLSearchParams(location.search);
  const header = createHeader({
    query: params.get('q') ?? '',
    ordering: params.get('ordering') ?? '',
    genres: params.get('genres') ?? '',
    showFilters: true,
    showSearchButton: true,
  }, { getCurrentUser });
  root.replaceChildren(header.element);

  const searchInput = header.searchForm.querySelector<HTMLInputElement>('input[name="q"]');
  const searchButton = header.searchForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  const orderingSelect = header.filtersForm?.querySelector<HTMLSelectElement>('select[name="ordering"]');
  const genresSelect = header.filtersForm?.querySelector<HTMLSelectElement>('select[name="genres"]');
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  function navigateToGames(): void {
    navigate(paths.games({
      query: searchInput?.value,
      ordering: orderingSelect?.value,
      genres: genresSelect?.value,
    }));
  }

  header.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    navigateToGames();
  });

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    if (location.pathname === paths.games()) {
      searchTimer = setTimeout(navigateToGames, 300);
    }
  });

  header.filtersForm?.addEventListener('change', navigateToGames);
  header.filtersForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    navigateToGames();
  });

  return (route) => {
    clearTimeout(searchTimer);
    const params = new URLSearchParams(location.search);

    for (const form of [header.searchForm, header.filtersForm]) {
      for (const name of ['q', 'ordering', 'genres']) {
        const control = form?.elements.namedItem(name);
        if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
          control.value = params.get(name) ?? '';
          if (control instanceof HTMLSelectElement && control.selectedIndex === -1) {
            control.selectedIndex = 0;
          }
        }
      }
    }

    if (header.filtersForm) header.filtersForm.style.display = route?.showFilters ? '' : 'none';
    if (searchButton) searchButton.hidden = !route?.showSearchButton;
  };
}

function createSearchForm(options: HeaderOptions): HTMLFormElement {
  const form = createForm('search-form');
  const input = createInput('q', options.query, 'text');
  input.className = 'search-form__input';
  input.placeholder = 'Search games...';
  form.append(input);

  for (const name of ['ordering', 'genres'] as const) {
    if (options[name]) form.append(createInput(name, options[name]));
  }
  if (options.showSearchButton) {
    const button = Object.assign(document.createElement('button'), {
      type: 'submit', className: 'search-form__button', textContent: 'Search',
    });
    form.append(button);
  }
  return form;
}

function createFiltersForm(options: HeaderOptions): HTMLFormElement {
  const form = createForm('filters-form');
  form.append(
    createInput('q', options.query),
    createSelect('ordering', options.ordering, ORDERING_OPTIONS),
    createSelect('genres', options.genres, GENRE_OPTIONS),
  );
  return form;
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
  select.value = value;
  if (select.selectedIndex === -1) select.selectedIndex = 0;
  return select;
}
