import { pragueDate } from "./prague";

/** Moment the static HTML was generated (`next build`). Client components switch to the visitor's time. */
export const BUILD_TIME = Date.now();

/** Year of the build in Prague: the current Farní tábor and the footer copyright. */
export const BUILD_YEAR = Number(pragueDate(BUILD_TIME).slice(0, 4));
