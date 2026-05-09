import { router } from "./trpc";
import { auto1Router } from "./auto1Router";

export const appRouter = router({
  auto1: auto1Router,
});

export type AppRouter = typeof appRouter;
