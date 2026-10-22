<?php
// From the hosting's cron (CRON_DIR in scripts/deploy.sh): reads the events mailbox and opens a PR for each mailed
// event (.github/workflows/events.yml).

declare(strict_types=1);

require_once __DIR__ . '/github.inc.php';

exit(dispatchWorkflow('events.yml'));
