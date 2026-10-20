// pnpm add-album: adds a Zonerama album of the parish to the Fotogalerie (parish-create-album skill), its photos taken
// from the album's zip: downloaded from Zonerama (without videos, kept in the temp folder until --write adds the
// album), or the zip the parish gives with --photos when the download fails (Zonerama serves scripts a bot image
// instead of a single photo, so photos are never downloaded one by one).
// Without --write it prints the proposal as JSON to confirm with the user: the title, the date, the id, the chosen
// aspect ratio and the photo counts. --write stages the chosen photos in fotogalerie/<id>/ (four widths each,
// refused when the folder is already on the server), adds the album to src/content/gallery.json, removes the oldest
// beyond the albums the site keeps, formats the file and runs the gallery test; --check does the same without
// writing and prints what --write would do. The title and the date come from the album page, or from the zip's name
// when the page does not answer. --title, --date and --id override the proposal (an empty value counts as not given).
//
// Usage: pnpm add-album https://eu.zonerama.com/FarnostKurim/Album/<n> [--photos <zip of the originals>]
//          [--write | --check] [--title "<title>"] [--date YYYY-MM-DD] [--id <kebab-id>]
import { runCommand } from "./lib/command";
import { execute, parseCommand } from "./lib/gallery/add-album";

runCommand("add-album", import.meta.url, parseCommand, execute);
