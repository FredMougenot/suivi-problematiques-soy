import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s — données planning/inventaire changent souvent mais pas en continu
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
