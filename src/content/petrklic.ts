import type { PetrklicIssue } from "./types";

// The issues of the old site's archive (farakurim.cz/petrklic/archiv), plus new ones added with the
// farnost-create-petrklic skill. The PDF is uploaded to /uploads/petrklic/<id>.pdf; the cover (and the current
// issue's pages) are WebP images rendered from it (`pnpm petrklic`, scripts/petrklic-images.py).

const IMG = "/assets/img/petrklic";
const PDF = "/uploads/petrklic";

function issue(id: string, year: number, number: number, pageCount: number, extra: Partial<PetrklicIssue> = {}) {
  return {
    id,
    year,
    number,
    pageCount,
    pdfUrl: `${PDF}/${id}.pdf`,
    cover: `${IMG}/${id}.webp`,
    ...extra,
  } satisfies PetrklicIssue;
}

/** Newest first; the first one is the current issue (aktuální číslo). */
export const petrklicIssues: PetrklicIssue[] = [
  issue("69c644a4d07bf", 2026, 1, 36),
  issue("693c68d1aff4f", 2025, 4, 36),
  issue("68fa9b8ec3650", 2025, 3, 36),
  issue("68572c7f478a4", 2025, 2, 36),
  issue("67f948ab2118a", 2025, 1, 32),
  issue("67671b3646abc", 2024, 4, 28),
  issue("6714ccd71909b", 2024, 3, 28),
  issue("66781a36579b3", 2024, 2, 28),
  issue("6600190326666", 2024, 1, 24),
  issue("657b5dbd0d90d", 2023, 4, 32),
  issue("652a7ac564920", 2023, 3, 24),
  issue("64986930066ac", 2023, 2, 28),
  issue("6426f47dbd2a3", 2023, 1, 20),
  issue("639de424eaa2a", 2022, 4, 24),
  issue("634297d23a0cb", 2022, 3, 24),
  issue("62aef1df9279c", 2022, 2, 24),
  issue("62509d2807397", 2022, 1, 16),
  issue("61bf0c61148e0", 2021, 2, 20),
  issue("61883ce5a9c51", 2021, 1, 20),
  issue("5fde438d8c733", 2020, 2, 20),
  issue("5e8adc822c349", 2020, 1, 10),
  issue("5e6e7d3c5e2cf", 2019, 4, 20),
  issue("5e6e7d2c4e0c2", 2019, 3, 12),
  issue("5e6e7d1fa546a", 2019, 2, 20),
  issue("5e6e7d04c2067", 2019, 1, 16),
  issue("5e6e7cd421898", 2018, 4, 12),
  issue("5e6e7cc5ceda8", 2018, 3, 20),
  issue("5e6e7cb4af987", 2018, 2, 20),
  issue("5e6e7c9f926f8", 2018, 1, 16),
  issue("5e6e7c8855ada", 2017, 4, 12),
  issue("5e6e7c774bcd9", 2017, 3, 20),
  issue("5e6e7c692b05f", 2017, 2, 12),
  issue("5e6e7c57dc63c", 2017, 1, 16),
  issue("5e6e7c3057f7d", 2016, 4, 16),
  issue("5e6e7c1bbb914", 2016, 3, 16),
  issue("5e6e7c05b2157", 2016, 2, 16),
  issue("5e6e7bf5cf551", 2016, 1, 12),
  issue("5e6e7be0979e4", 2015, 4, 16),
  issue("5e6e7bcc4e9d3", 2015, 3, 12),
  issue("5e6e7bb558841", 2015, 2, 12),
  issue("5e6e7ba50b07a", 2015, 1, 12),
  issue("5e6e7b8e2b2fc", 2014, 4, 8),
  issue("5e6e7b7768329", 2014, 3, 8),
  issue("5e6e7b4c9f6c1", 2014, 2, 8),
  issue("5e6e7b2918a60", 2014, 1, 12),
  issue("5e6e7affaf1d3", 2013, 4, 20),
  issue("5e6e7adb3bd4d", 2013, 3, 20),
  issue("5e6e7a9b531c9", 2013, 2, 16),
  issue("5e6e7a5c98745", 2013, 1, 12),
  issue("5e6e7a1e68a14", 2012, 6, 16),
  issue("5e6e79e50d66d", 2012, 5, 12),
  issue("5e6e7910b9dc7", 2012, 4, 4, { note: "mimořádné" }),
  issue("5e6e79001302d", 2012, 3, 16),
  issue("5e6e78efd237a", 2012, 2, 16),
  issue("5e6e78c229725", 2012, 1, 8, { note: "2. část" }),
  issue("5e6e78a659622", 2012, 1, 8, { note: "1. část" }),
  issue("5e6e787b7b7d5", 2011, 4, 16),
  issue("5e6e786d71b9f", 2011, 3, 20),
  issue("5e6e785caf8de", 2011, 2, 8),
  issue("5e6e78463f76c", 2011, 1, 12),
  issue("5e6e78316b213", 2010, 6, 16),
  issue("5e6e7822ebd29", 2010, 5, 16),
  issue("5e6e781132360", 2010, 4, 20),
  issue("5e6e76b00aa82", 2010, 3, 12),
  issue("5e6e76a2a7de5", 2010, 2, 12),
  issue("5e6e768ecc91c", 2010, 1, 16),
  issue("5e6e731a71d24", 2009, 4, 16),
  issue("5e6e744a3b169", 2009, 3, 16),
  issue("5e6e730715262", 2009, 2, 16),
  issue("5e6e72ee1e387", 2009, 1, 20),
  issue("5e6e72cb477b1", 2008, 5, 12),
  issue("5e6e72b040f3d", 2008, 4, 16),
  issue("5e6e70e4c1bf0", 2008, 3, 20),
  issue("5e6e70be96d0d", 2008, 2, 20),
  issue("5e6e70a8748a4", 2008, 1, 12),
  issue("5e6e708f085ed", 2007, 6, 20),
  issue("5e6e71b885ee6", 2007, 5, 16),
  issue("5e6e5acd2a193", 2007, 4, 20),
  issue("5e6e5ab189787", 2007, 3, 12),
  issue("5e6e5aa116a8a", 2007, 2, 20),
  issue("5e6e5a7535283", 2007, 1, 16),
  issue("5e6e5a6298900", 2006, 5, 24),
  issue("5e6e5a53e5878", 2006, 4, 17),
  issue("5e6e5a4071855", 2006, 3, 20),
  issue("5e6e59bf2a8eb", 2006, 2, 21),
  issue("5e6e558b9e3a2", 2006, 1, 13),
];

// The current issue's pages, for the viewer.
const [current] = petrklicIssues;
current.pageImages = Array.from({ length: current.pageCount }, (_, i) => `${IMG}/${current.id}/${i + 1}.webp`);

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
