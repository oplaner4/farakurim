<?php
// Starts a GitHub Actions workflow through the API (workflow_dispatch), for the scripts of each cron folder
// (cron-scripts/<name>/): `pnpm release` copies this file into every one of them on the server (scripts/deploy.sh
// cron), as they require it from next to themselves. GitHub starts scheduled runs hours late, a dispatched one right
// away. A cron that runs every script of its folder runs this one too: it only defines functions, so that does
// nothing. The token (fine-grained, this repository only, Actions: read and write) and the log live next to it in each
// cron folder, only on the server: the sync sends the PHP scripts alone.

declare(strict_types=1);

const GITHUB_REPOSITORY = 'oplaner4/farakurim';
const GITHUB_REF = 'main';
const GITHUB_TOKEN_FILE = __DIR__ . '/github-dispatch.token';
const GITHUB_LOG_FILE = __DIR__ . '/github-dispatch.log';
/** A network error, a 5xx or a 429 is tried again, at most this many times in all, this many seconds apart. */
const GITHUB_ATTEMPTS = 3;
const GITHUB_RETRY_DELAY = 30;

date_default_timezone_set('Europe/Prague');

/** Prints $message and appends it to the log, as the hosting's help documents no log of directory cron. */
function logLine(string $message): void
{
    $line = date('Y-m-d H:i:s') . ' ' . $message . "\n";
    echo $line;
    @file_put_contents(GITHUB_LOG_FILE, $line, FILE_APPEND | LOCK_EX);
}

/** [HTTP status or 0 on a network error, response body or curl's error]. */
function postDispatch(string $workflow, array $inputs, string $token): array
{
    $body = ['ref' => GITHUB_REF];
    if ($inputs !== []) {
        $body['inputs'] = $inputs;
    }
    $curl = curl_init('https://api.github.com/repos/' . GITHUB_REPOSITORY . "/actions/workflows/$workflow/dispatches");
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_HTTPHEADER => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'X-GitHub-Api-Version: 2022-11-28',
            'User-Agent: farakurim-cron',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
    ]);
    $response = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    return $response === false ? [0, curl_error($curl)] : [$status, (string) $response];
}

/** Starts .github/workflows/$workflow on main with $inputs and logs the outcome; the exit code (0 when started). */
function dispatchWorkflow(string $workflow, array $inputs = []): int
{
    if (!function_exists('curl_init')) {
        logLine("$workflow: FAILED, PHP has no curl extension");
        return 1;
    }
    $token = is_readable(GITHUB_TOKEN_FILE) ? trim((string) file_get_contents(GITHUB_TOKEN_FILE)) : '';
    if ($token === '') {
        logLine("$workflow: FAILED, no token in " . GITHUB_TOKEN_FILE);
        return 1;
    }
    for ($attempt = 1; ; $attempt++) {
        [$status, $response] = postDispatch($workflow, $inputs, $token);
        if ($status >= 200 && $status < 300) {
            logLine("$workflow: started (HTTP $status, attempt $attempt)");
            return 0;
        }
        // 401: a wrong or expired token; 403: no Actions write; 404: wrong repository or workflow, or a token without
        // this repository; 422: an input the workflow does not declare.
        $reason = $status === 0
            ? "network error: $response"
            : "HTTP $status: " . substr((string) preg_replace('~\s+~', ' ', $response), 0, 300);
        $retry = $attempt < GITHUB_ATTEMPTS && ($status === 0 || $status === 429 || $status >= 500);
        logLine("$workflow: FAILED, $reason" . ($retry ? ', trying again' : ''));
        if (!$retry) {
            return 1;
        }
        sleep(GITHUB_RETRY_DELAY);
    }
}
