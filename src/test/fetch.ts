// Answers of a stubbed `fetch` in the tests.

/** A JSON answer with `status`. */
export const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** A result page of Google Calendar's events list: its `items`. */
export const googlePage = (items: unknown[], status = 200) => jsonResponse({ items }, status);
