<?php
// From the hosting's cron of this folder (cron-scripts/<name>/ runs in /CRON.<name>/, github.inc.php copied next to
// it by scripts/deploy.sh cron): reads the events mailbox and opens a PR for each mailed event
// (.github/workflows/events.yml).

declare(strict_types=1);

require_once __DIR__ . '/github.inc.php';

exit(dispatchWorkflow('events.yml'));
