import type { PetrklicIssue } from "./types";

// The issues of the old site's archive (farakurim.cz/petrklic/archiv), plus new ones added with the
// farnost-create-petrklic skill. Each issue is a folder /uploads/petrklic/<id>/ with the PDF petrklic-<id>.pdf
// (its name is the downloaded file's name), cover.webp and, for the current issue, pages/<n>.webp, rendered from
// the PDF (`pnpm petrklic`, scripts/petrklic-images.py).

const dir = (id: string) => `/uploads/petrklic/${id}`;

function issue(id: string, year: number, number: number, pageCount: number, extra: Partial<PetrklicIssue> = {}) {
  return {
    id,
    year,
    number,
    pageCount,
    pdfUrl: `${dir(id)}/petrklic-${id}.pdf`,
    cover: `${dir(id)}/cover.webp`,
    ...extra,
  } satisfies PetrklicIssue;
}

/** Newest first; the first one is the current issue (aktuální číslo). */
export const petrklicIssues: PetrklicIssue[] = [
  issue("2026-1", 2026, 1, 36),
  issue("2025-4", 2025, 4, 36),
  issue("2025-3", 2025, 3, 36),
  issue("2025-2", 2025, 2, 36),
  issue("2025-1", 2025, 1, 32),
  issue("2024-4", 2024, 4, 28),
  issue("2024-3", 2024, 3, 28),
  issue("2024-2", 2024, 2, 28),
  issue("2024-1", 2024, 1, 24),
  issue("2023-4", 2023, 4, 32),
  issue("2023-3", 2023, 3, 24),
  issue("2023-2", 2023, 2, 28),
  issue("2023-1", 2023, 1, 20),
  issue("2022-4", 2022, 4, 24),
  issue("2022-3", 2022, 3, 24),
  issue("2022-2", 2022, 2, 24),
  issue("2022-1", 2022, 1, 16),
  issue("2021-2", 2021, 2, 20),
  issue("2021-1", 2021, 1, 20),
  issue("2020-2", 2020, 2, 20),
  issue("2020-1", 2020, 1, 10),
  issue("2019-4", 2019, 4, 20),
  issue("2019-3", 2019, 3, 12),
  issue("2019-2", 2019, 2, 20),
  issue("2019-1", 2019, 1, 16),
  issue("2018-4", 2018, 4, 12),
  issue("2018-3", 2018, 3, 20),
  issue("2018-2", 2018, 2, 20),
  issue("2018-1", 2018, 1, 16),
  issue("2017-4", 2017, 4, 12),
  issue("2017-3", 2017, 3, 20),
  issue("2017-2", 2017, 2, 12),
  issue("2017-1", 2017, 1, 16),
  issue("2016-4", 2016, 4, 16),
  issue("2016-3", 2016, 3, 16),
  issue("2016-2", 2016, 2, 16),
  issue("2016-1", 2016, 1, 12),
  issue("2015-4", 2015, 4, 16),
  issue("2015-3", 2015, 3, 12),
  issue("2015-2", 2015, 2, 12),
  issue("2015-1", 2015, 1, 12),
  issue("2014-4", 2014, 4, 8),
  issue("2014-3", 2014, 3, 8),
  issue("2014-2", 2014, 2, 8),
  issue("2014-1", 2014, 1, 12),
  issue("2013-4", 2013, 4, 20),
  issue("2013-3", 2013, 3, 20),
  issue("2013-2", 2013, 2, 16),
  issue("2013-1", 2013, 1, 12),
  issue("2012-6", 2012, 6, 16),
  issue("2012-5", 2012, 5, 12),
  issue("2012-4-mimoradne", 2012, 4, 4, { note: "mimořádné" }),
  issue("2012-3", 2012, 3, 16),
  issue("2012-2", 2012, 2, 16),
  issue("2012-1-2-cast", 2012, 1, 8, { note: "2. část" }),
  issue("2012-1-1-cast", 2012, 1, 8, { note: "1. část" }),
  issue("2011-4", 2011, 4, 16),
  issue("2011-3", 2011, 3, 20),
  issue("2011-2", 2011, 2, 8),
  issue("2011-1", 2011, 1, 12),
  issue("2010-6", 2010, 6, 16),
  issue("2010-5", 2010, 5, 16),
  issue("2010-4", 2010, 4, 20),
  issue("2010-3", 2010, 3, 12),
  issue("2010-2", 2010, 2, 12),
  issue("2010-1", 2010, 1, 16),
  issue("2009-4", 2009, 4, 16),
  issue("2009-3", 2009, 3, 16),
  issue("2009-2", 2009, 2, 16),
  issue("2009-1", 2009, 1, 20),
  issue("2008-5", 2008, 5, 12),
  issue("2008-4", 2008, 4, 16),
  issue("2008-3", 2008, 3, 20),
  issue("2008-2", 2008, 2, 20),
  issue("2008-1", 2008, 1, 12),
  issue("2007-6", 2007, 6, 20),
  issue("2007-5", 2007, 5, 16),
  issue("2007-4", 2007, 4, 20),
  issue("2007-3", 2007, 3, 12),
  issue("2007-2", 2007, 2, 20),
  issue("2007-1", 2007, 1, 16),
  issue("2006-5", 2006, 5, 24),
  issue("2006-4", 2006, 4, 17),
  issue("2006-3", 2006, 3, 20),
  issue("2006-2", 2006, 2, 21),
  issue("2006-1", 2006, 1, 13),
];

// The current issue's pages, for the viewer.
const [current] = petrklicIssues;
current.pageImages = Array.from({ length: current.pageCount }, (_, i) => `${dir(current.id)}/pages/${i + 1}.webp`);

/** Copy of the Petrklíč pages and the homepage card. */
export const petrklicTexts = {
  lead: "Zpravodaj Římskokatolické farnosti Kuřim. Vychází čtyřikrát ročně.",
  current: "Nejnovější číslo zpravodaje k prohlédnutí a ke stažení.",
  home: "Nové číslo zpravodaje naší farnosti. Čtěte online nebo si ho stáhněte.",
};

/** §17.1 (5)–(6). */
export const petrklicEditorial = {
  email: "petrklic.kurim@gmail.com",
  editors: ["Jana Kolaříková", "Dáša Montagová", "Eva Ryšavá", "Jaroslav Filka", "Martin Strašák"],
  coverDesign: "Pája Polášková",
};
