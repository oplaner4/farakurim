// The feast cell of a pořad bohoslužeb as the website's feast: its lines split into names (a name wraps over lines,
// "5. NEDĚLE" + "POSTNÍ") and each name in sentence case, keeping the names of God, Mary and the saints capitalised.

// The names a feast keeps capitalised ("Panny Marie", "Ježíše Krista Krále", "Svaté rodiny"), and those that also
// capitalise the word before them ("Narození Páně", "Matky Boží", "Seslání Ducha svatého", "Nejsvětější Trojice").
const FEAST_NAMES = /^(páně|boží|božího|ducha|ježíše|krista|krále|p\.|panny|marie|svaté|těla|trojice)$/;
const FEAST_MYSTERY_OF = /^(páně|boží|ducha|svatých|trojice)$/;
// The small words inside a saint's name: "sv. Petra a Pavla", "sv. Terezie z Avily".
const SAINT_LINKS = /^(a|z|ze|od)$/;

/** All in capitals ("28. NEDĚLE V MEZIDOBÍ"), not a line without letters. */
const isUpper = (line: string) => line === line.toLocaleUpperCase("cs") && /\p{Lu}/u.test(line);

/**
 * Whether the feast cell's `line` starts another name than the line `before` it, rather than wrapping it ("5. NEDĚLE"
 * + "POSTNÍ", "Svátek" + "KŘTU PÁNĚ", "Středa" + "po 5. neděli postní"). A word alone in small letters ("Pondělí" +
 * "6. týdne v mezidobí"), "(…)", a comma and "slavnosti" ("Vigilie slavnosti" + "Zjevení Páně") go on. A new name is a
 * number ("29. NEDĚLE V MEZIDOBÍ"), "první pátek", a line in small letters after one in capitals ("UVEDENÍ PÁNĚ DO
 * CHRÁMU" + "Hromnice") or one starting with a capital after one in small letters ("6. neděle v mezidobí" + "P. Maria
 * Lurdská").
 */
function startsName(before: string, line: string) {
  if ((!isUpper(before) && !before.includes(" ")) || line.startsWith("(") || before.endsWith(",")) return false;
  if (/\b(slavnosti|svátku|památky)$/i.test(before)) return false;
  if (/^\d/.test(line) || /^první (pátek|sobota)/i.test(line)) return true;
  if (isUpper(before)) return !isUpper(line);
  return !isUpper(line) && /^\p{Lu}/u.test(line);
}

/** The feast cell's lines as its names, each one or more lines; a dash ("–", "– sv. Štěpána") also starts a name. */
function feastNames(lines: string[]): string[][] {
  const names: string[][] = [];
  let apart = true;
  for (const line of lines) {
    line.split(/\s*[–—]\s*/).forEach((piece, i) => {
      if (i > 0) apart = true;
      if (!piece) return;
      const name = names.at(-1);
      if (apart || !name || startsName(name.at(-1)!, piece)) names.push([piece]);
      else name.push(piece);
      apart = false;
    });
  }
  return names;
}

/** A name's lines in sentence case and joined: "1. NEDĚLE" + "ADVENTNÍ" → "1. neděle adventní". */
function nameCase(lines: string[]) {
  const capital = (word: string) => word.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("cs"));
  const words = lines.flatMap((line) => {
    const upper = isUpper(line);
    return line.split(" ").map((word) => ({ word: upper ? word.toLocaleLowerCase("cs") : word, upper }));
  });
  // A saint's name follows "sv." or "bl.", to a comma ("SV. MAŘÍ MAGDALENY", "SV. PETRA A PAVLA, APOŠTOLŮ").
  let saint = false;
  return words
    .map(({ word, upper }, i) => {
      const before = words[i - 1]?.word.toLocaleLowerCase("cs") ?? "";
      if (/^(sv|bl)\.$/.test(before)) saint = true;
      else if (before.endsWith(",")) saint = false;
      const named =
        (i === 0 && !/^(sv|bl)\.$/.test(word)) ||
        (saint && !SAINT_LINKS.test(word)) ||
        FEAST_NAMES.test(word) ||
        FEAST_MYSTERY_OF.test(words[i + 1]?.word.toLocaleLowerCase("cs") ?? "");
      return upper && named ? capital(word) : word;
    })
    .join(" ");
}

/**
 * The feast cell's names in sentence case, joined by a dash: "UVEDENÍ PÁNĚ DO CHRÁMU" + "Hromnice" → "Uvedení Páně do
 * chrámu – Hromnice", "32. NEDĚLE V MEZIDOBÍ" + "sv. Martin" → "32. neděle v mezidobí – sv. Martin". A line not in
 * capitals stays as it is.
 */
export const feastCase = (lines: string[]) => feastNames(lines).map(nameCase).join(" – ");
