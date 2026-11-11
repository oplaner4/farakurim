// pnpm venue: the venue list (src/content/venues.json) and the events' venues (parish-create-event and
// parish-correct-event skills).
//   find    matches a place exactly (case, accents and dots aside) with a venue's name or alias in the stated village;
//           prints the known venue, or asks with the village's venues to choose from. No network.
//   lookup  looks a place up on Mapy.com inside the village: by name, by --address, or the position of a shared
//           --link (exact for a point, approximate for a named place); prints each result's address and pin link.
//   add     adds a venue from a JSON file: its municipality taken from its position (refused when another is
//           stated), its id <municipality>-<name> as slug() makes it; warns when the address lands > 150 m away.
//   alias   adds a confirmed text of a place to a venue, refused when another venue of the village has it.
//   assign  gives every record without a venue the one its place names exactly, dropping its mapQuery.
// --check prints what add, alias and assign would do without writing. lookup and add need MAPY_API_KEY (.env.local).
//
// Usage: pnpm venue find --village "<village>" "<place>"
//        pnpm venue lookup --village "<village>" ("<query>" | --link <Mapy.com link> | --address "<address>")
//        pnpm venue add <venue.json | -> [--check]
//        pnpm venue alias <id> "<text>" [--check]
//        pnpm venue assign [--check]
import { runCommand } from "./lib/command";
import { withContentRestore } from "./lib/content-files";
import { execute, parseCommand } from "./lib/venues/command";

runCommand("venue", import.meta.url, parseCommand, withContentRestore(execute));
