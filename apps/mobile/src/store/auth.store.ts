import type { NewsCategory, UserProfile } from '@dailybrief/shared';
import { create } from 'zustand';
import { ApiError, setApiAuthToken } from '../services/api';
import {
  getStoredHiddenCategories,
  setStoredHiddenCategories,
} from '../services/preferencesStorage';
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  setStoredAuthToken,
} from '../services/tokenStorage';
import {
  fetchProfileApi,
  loginApi,
  registerApi,
  updateProfileApi,
  updateUserCategoriesApi,
} from '../services/user.service';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  guestCategories: NewsCategory[];
  hiddenCategories: NewsCategory[];
  isSubmitting: boolean;
  isHydrating: boolean;
  error: string | null;
  clearError: () => void;
  hydrateSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<boolean>;
  logout: () => void;
  toggleCategory: (slug: NewsCategory) => Promise<void>;
  toggleHiddenCategory: (slug: NewsCategory) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  guestCategories: ['geral', 'tecnologia', 'economia'],
  hiddenCategories: [],
  isSubmitting: false,
  isHydrating: false,
  error: null,

  clearError: () => set({ error: null }),

  hydrateSession: async () => {
    const hiddenPromise = getStoredHiddenCategories();
    if (get().isHydrating || get().token) {
      const hiddenCategories = await hiddenPromise;
      set({ hiddenCategories });
      return;
    }
    set({ isHydrating: true });

    try {
      const [storedToken, hiddenCategories] = await Promise.all([
        getStoredAuthToken(),
        hiddenPromise,
      ]);
      set({ hiddenCategories });

      if (!storedToken) {
        set({ isHydrating: false });
        return;
      }

      setApiAuthToken(storedToken);
      const user = await fetchProfileApi();
      set({ token: storedToken, user, isHydrating: false });
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await clearStoredAuthToken();
      }
      setApiAuthToken(null);
      set({ token: null, user: null, isHydrating: false });
    }
  },

  login: async (email, password) => {
    set({ isSubmitting: true, error: null });
    try {
      const session = await loginApi(email, password);
      setApiAuthToken(session.accessToken);
      await setStoredAuthToken(session.accessToken);
      set({
        token: session.accessToken,
        user: session.user,
        isSubmitting: false,
      });
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível entrar na conta.';
      set({ error: msg, isSubmitting: false });
      return false;
    }
  },

  register: async (email, password, displayName) => {
    set({ isSubmitting: true, error: null });
    try {
      const session = await registerApi(email, password, displayName);
      setApiAuthToken(session.accessToken);
      await setStoredAuthToken(session.accessToken);

      const { guestCategories } = get();
      let categories = session.user.categories;
      if (guestCategories.length > 0 && categories.length === 0) {
        try {
          const synced = await updateUserCategoriesApi(guestCategories);
          categories = synced.map((c) => c.slug);
        } catch {
          categories = guestCategories;
        }
      }

      set({
        token: session.accessToken,
        user: { ...session.user, categories },
        isSubmitting: false,
      });
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Não foi possível criar a conta.';
      set({ error: msg, isSubmitting: false });
      return false;
    }
  },

  logout: () => {
    setApiAuthToken(null);
    void clearStoredAuthToken();
    set({ token: null, user: null, error: null });
  },

  toggleCategory: async (slug) => {
    const { user, guestCategories, hiddenCategories } = get();
    if (hiddenCategories.includes(slug)) {
      const nextHidden = hiddenCategories.filter((c) => c !== slug);
      set({ hiddenCategories: nextHidden });
      void setStoredHiddenCategories(nextHidden);
    }

    if (!user) {
      const exists = guestCategories.includes(slug);
      const next = exists
        ? guestCategories.filter((c) => c !== slug)
        : [...guestCategories, slug];
      set({ guestCategories: next });
      return;
    }

    const previous = user.categories;
    const exists = previous.includes(slug);
    const next = exists
      ? previous.filter((c) => c !== slug)
      : [...previous, slug];

    set({ user: { ...user, categories: next }, error: null });

    try {
      const updated = await updateUserCategoriesApi(next);
      set({
        user: {
          ...user,
          categories: updated.map((c) => c.slug),
        },
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao salvar preferências de categorias.';
      set({ user: { ...user, categories: previous }, error: msg });
    }
  },

  toggleHiddenCategory: async (slug) => {
    const { user, guestCategories, hiddenCategories } = get();
    const isHidden = hiddenCategories.includes(slug);
    const nextHidden = isHidden
      ? hiddenCategories.filter((c) => c !== slug)
      : [...hiddenCategories, slug];

    set({ hiddenCategories: nextHidden });
    await setStoredHiddenCategories(nextHidden);

    if (!isHidden) {
      if (!user && guestCategories.includes(slug)) {
        set({ guestCategories: guestCategories.filter((c) => c !== slug) });
      } else if (user && user.categories.includes(slug)) {
        const previous = user.categories;
        const nextFollowed = previous.filter((c) => c !== slug);
        set({ user: { ...user, categories: nextFollowed } });
        try {
          const updated = await updateUserCategoriesApi(nextFollowed);
          set({
            user: {
              ...user,
              categories: updated.map((c) => c.slug),
            },
          });
        } catch {
          set({ user: { ...user, categories: previous } });
        }
      }
    }
  },

  updateDisplayName: async (displayName) => {
    const { user } = get();
    if (!user) return false;

    set({ isSubmitting: true, error: null });
    try {
      const updated = await updateProfileApi(displayName);
      set({ user: updated, isSubmitting: false });
      return true;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao atualizar nome de exibição.';
      set({ error: msg, isSubmitting: false });
      return false;
    }
  },
}));

