import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";

export const config = {
  runtime: "nodejs",
  // Snapshot-JSON in den Function-Bundle einschließen
  includeFiles: ["data/auto1-snapshot.json"],
};

export default async function handler(req: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
    onError({ error, path }) {
      console.error(`[tRPC error] ${path ?? "<no-path>"}:`, error);
    },
  });
}
