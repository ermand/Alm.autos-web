import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { negotiateLocale } from "~/i18n/negotiate.ts";
import { localePath } from "~/i18n/paths.ts";

const detectLocale = createServerFn({ method: "GET" }).handler(async () =>
  negotiateLocale(getRequestHeader("accept-language")),
);

/** `/` never renders; it only decides which prefixed URL you belong on. */
export const Route = createFileRoute("/")({
  loader: async () => {
    throw redirect({ to: localePath(await detectLocale()), statusCode: 307 });
  },
});
