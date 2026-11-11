// pnpm venue: the venue list (src/content/venues.json) and the events' venues (parish-create-event and
// parish-correct-event skills).
//   find    lists the stated municipality's venues, with keywords only those whose name or an alias holds one of them
//           (case, accents and dots aside; all of them when none does). No network.
//   lookup  looks a place up on Mapy.com inside the municipality: by name, by --address, or the position of a shared
//           --link (exact for a point, approximate for a named place), or a place card's --position GPS line;
//           prints each result's address and pin link,
//           numbered. --out writes them as venue candidates for add: a place's own name (none for an address or a
//           point), address and position; none for an approximate position.
//   add     adds a venue from a JSON file, or candidate --pick <n> of lookup's file, named --name and with --alias
//           texts: its municipality taken from its position (refused when another is stated), its id
//           <municipality>-<name> as slug() makes it; warns when the address lands > 150 m away.
//   alias   adds a confirmed text of a place to a venue, refused when another venue of the municipality has it.
//   assign  gives every record without a venue the one its place names exactly.
// --check prints what add, alias and assign would do without writing. lookup and add need MAPY_API_KEY (.env.local).
//
// Usage: pnpm venue find --municipality "<municipality>" [<keyword>…]
//        pnpm venue lookup --municipality "<municipality>" ("<query>" | --link <Mapy.com link> | --address "<address>"
//                          | --position "<GPS line>") [--out <candidates.json>]
//        pnpm venue add <venue.json | candidates.json | -> [--pick <n>] [--name "<building>"] [--alias "<text>"…]
//                       [--check]
//        pnpm venue alias <id> "<text>" [--check]
//        pnpm venue assign [--check]
import { runCommand } from "./lib/command";
import { withContentRestore } from "./lib/content-files";
import { execute, parseCommand } from "./lib/venues/command";

runCommand("venue", import.meta.url, parseCommand, withContentRestore(execute));
