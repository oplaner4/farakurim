import * as z from "zod";

// Files uploaded to the server, never committed: the content links each one root-relative under /uploads/ (CLAUDE.md
// "Content and data"), and the scripts map that path to the repo's uploads/ folder (scripts/lib/uploads.ts). The
// content schemas, the content tests and `pnpm stage` check the links with these rules.

/** Where the uploaded files are served: uploads/<path> in the repo is /uploads/<path> on the site. */
export const UPLOADS_PATH = "/uploads/";

/** The file types the content links: images, PDFs and MP3 recordings. */
export const UPLOAD_EXTENSIONS = [".pdf", ".png", ".jpg", ".webp", ".mp3"];

const UPLOAD = new RegExp(`^${UPLOADS_PATH}\\S+\\.(${UPLOAD_EXTENSIONS.map((e) => e.slice(1)).join("|")})$`);

/** Whether `href` links an uploaded file: "/uploads/aktuality/x-plakat.pdf". */
export const isUpload = (href: string) => UPLOAD.test(href);

/** A content field linking an uploaded file. */
export const uploadSchema = z.string().regex(UPLOAD, "must be a /uploads/… file");
