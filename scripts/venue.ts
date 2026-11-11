// pnpm venue: the venue list (src/content/venues.json) and the events' venues (parish-create-event and
// parish-correct-event skills).
//   find    matches a place exactly (case, accents and dots aside) with a venue's name or alias in the stated
//           municipality; prints the known venue, or asks with the municipality's venues to choose from. No network.
//   lookup  looks a place up on Mapy.com inside the municipality: by name, by --address, or the position of a shared
//           --link (exact for a point, approximate for a named place); prints each result's address and pin link.
//   add     adds a venue from a JSON file: its municipality taken from its position (refused when another is
//           stated), its id <municipality>-<name> as slug() makes it; warns when the address lands > 150 m away.
//   alias   adds a confirmed text of a place to a venue, refused when another venue of the municipality has it.
//   assign  gives every record without a venue the one its place names exactly.
// --check prints what add, alias and assign would do without writing. lookup and add need MAPY_API_KEY (.env.local).
//
// Usage: pnpm venue find --municipality "<municipality>" "<place>"
//        pnpm venue lookup --municipality "<municipality>" ("<query>" | --link <Mapy.com link> | --address "<address>")
//        pnpm venue add <venue.json | -> [--check]
//        pnpm venue alias <id> "<text>" [--check]
//        pnpm venue assign [--check]
import { runCommand } from "./lib/command";
import { withContentRestore } from "./lib/content-files";
import { execute, parseCommand } from "./lib/venues/command";

runCommand("venue", import.meta.url, parseCommand, withContentRestore(execute));
