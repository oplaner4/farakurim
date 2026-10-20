<?php
// From the hosting's cron (CRON_DIR in scripts/deploy.sh): reads the parish's mail and opens the sheet PR
// (.github/workflows/service-sheet.yml).

declare(strict_types=1);

require_once __DIR__ . '/github.inc.php';

exit(dispatchWorkflow('service-sheet.yml'));
