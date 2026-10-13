// pnpm add-album: adds a Zonerama album of the parish to the Fotogalerie (parish-create-album skill).
// Without --write it prints the proposal as JSON to confirm with the user: the title, the date, the id, the chosen
// aspect ratio and the photo counts. --write adds the album to src/content/gallery.json, removes the oldest beyond
// the albums the site keeps, formats the file and runs the gallery test; --check does the same without writing and
// prints what --write would do. --title, --date and --id override the proposal (an empty value counts as not given).
//
// Usage: pnpm add-album https://eu.zonerama.com/FarnostKurim/Album/<n>
//          [--write | --check] [--title "<title>"] [--date YYYY-MM-DD] [--id <kebab-id>]
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/gallery/add-album";

runCommand("add-album", import.meta.url, parseCommand, execute);
