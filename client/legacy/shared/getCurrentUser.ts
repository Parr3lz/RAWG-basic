import { requestJson } from './api';
import type { User } from './types';

export async function getCurrentUser(): Promise<User | null> {
  const { user } = await requestJson<{ user: User | null }>('/api/me');
  return user;
}
