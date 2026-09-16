import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { ErrorState, NotFoundState, PendingState } from "./components/RouteStates.tsx";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Set once here rather than per route: a missing state is invisible until
    // someone hits it, and the router otherwise falls back to a bare
    // "Not Found" paragraph.
    defaultNotFoundComponent: NotFoundState,
    defaultErrorComponent: ErrorState,
    defaultPendingComponent: PendingState,
    // Loaders read a local database, so most navigations never reach this.
    // Showing a skeleton for a 40ms load would flash worse than waiting.
    defaultPendingMs: 300,
    defaultPendingMinMs: 400,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
