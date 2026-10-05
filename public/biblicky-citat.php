<?php
// "Slovo na dnešek" (design/DESIGN.md §20.5): the day's verse from the vira.cz widget as JSON
// ({"date", "text", "reference"}), for the footer card (src/components/layout/use-todays-quote.ts).
// vira.cz sends no CORS headers, so the browser cannot read the widget itself. This script fetches it once a
// day (Prague time), keeps it in cache/ (left alone by scripts/deploy.sh) and falls back to the last verse it got
// while vira.cz is down. The page links www.vira.cz, which is vira.cz's condition of use.

declare(strict_types=1);

const VIRA_URL = 'https://www.vira.cz/biblicky-citat.php';
const CACHE_FILE = __DIR__ . '/cache/biblicky-citat.json';
/** While vira.cz fails, try again at most this often (seconds), so visitors do not wait on its timeout. */
const RETRY_AFTER = 600;

date_default_timezone_set('Europe/Prague');
$today = date('Y-m-d');

/** Text of the widget's element $id, without tags, entities decoded, whitespace collapsed. */
function widgetField(string $html, string $id): string
{
    if (!preg_match('~id="' . $id . '"[^>]*>(.*?)</span>~su', $html, $match)) {
        return '';
    }
    $text = html_entity_decode(strip_tags($match[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return trim((string) preg_replace('~\s+~u', ' ', $text));
}

/** Today's verse from vira.cz, or null when it cannot be read. Same parsing as src/lib/bible-quote.ts. */
function fetchVerse(string $today): ?array
{
    $context = stream_context_create(['http' => ['timeout' => 5]]);
    $html = @file_get_contents(VIRA_URL, false, $context);
    if ($html === false) {
        return null;
    }
    $text = widgetField($html, 'biblicky-citat-text');
    $reference = trim((string) preg_replace('~^\((.*)\)$~su', '$1', widgetField($html, 'biblicky-citat-citace')));
    return $text !== '' && $reference !== '' ? ['date' => $today, 'text' => $text, 'reference' => $reference] : null;
}

$cache = is_file(CACHE_FILE) ? json_decode((string) file_get_contents(CACHE_FILE), true) : null;
$cache = is_array($cache) ? $cache : [];
$verse = $cache['verse'] ?? null;

if (($verse['date'] ?? '') !== $today && time() - (int) ($cache['checked'] ?? 0) >= RETRY_AFTER) {
    $verse = fetchVerse($today) ?? $verse;
    if (!is_dir(dirname(CACHE_FILE))) {
        @mkdir(dirname(CACHE_FILE), 0755);
    }
    @file_put_contents(CACHE_FILE, json_encode(['checked' => time(), 'verse' => $verse], JSON_UNESCAPED_UNICODE), LOCK_EX);
}

header('Content-Type: application/json; charset=utf-8');
if (!is_array($verse)) {
    http_response_code(503);
    header('Cache-Control: no-store');
    echo '{}';
    exit;
}
// Today's verse may be cached by the browser until midnight; an older one only briefly.
$maxAge = $verse['date'] === $today ? max(60, strtotime('tomorrow') - time()) : 300;
header('Cache-Control: public, max-age=' . $maxAge);
echo json_encode($verse, JSON_UNESCAPED_UNICODE);
