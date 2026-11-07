<?php
// From the hosting's cron of this folder (cron-scripts/<name>/ runs in /CRON.<name>/, github.inc.php copied next to
// it by scripts/deploy.sh cron): reads the parish's mail and opens the sheet PR (.github/workflows/service-sheet.yml).

declare(strict_types=1);

require_once __DIR__ . '/github.inc.php';

exit(dispatchWorkflow('service-sheet.yml'));
