import { createLink } from './createLink';
import type { User } from './types';

export function createAccount(getCurrentUser: () => Promise<User | null>): HTMLElement {
  const account = Object.assign(document.createElement('div'), {
    className: 'account', textContent: 'Загрузка профиля...',
  });

  function renderUser(user: User | null): void {
    account.replaceChildren();
    if (!user) {
      account.append(createLink('/auth/discord/login', 'Login'));
      return;
    }
    if (user.avatar) {
      account.append(Object.assign(document.createElement('img'), {
        className: 'account__avatar', alt: '',
        src: `https://cdn.discordapp.com/avatars/${encodeURIComponent(user.id)}/${encodeURIComponent(user.avatar)}.png`,
      }));
    }
    account.append(
      Object.assign(document.createElement('span'), { className: 'account__username', textContent: user.username }),
      createLink('/auth/logout', 'Logout'),
    );
  }

  function renderUserError(error: unknown): void {
    console.error('Не удалось загрузить профиль:', error);
    account.textContent = 'Не удалось загрузить профиль';
  }

  getCurrentUser()
    .then(renderUser)
    .catch(renderUserError);

  return account;
}
