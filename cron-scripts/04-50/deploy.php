<?php
// From the hosting's cron of this folder (cron-scripts/<name>/ runs in /CRON.<name>/, github.inc.php copied next to
// it by scripts/deploy.sh cron): refreshes the latest release once the last deploy is 7 days old
// (.github/workflows/deploy.yml, docs/deployment.md "Weekly refresh"); `due` keeps that check, which a dispatch by
// hand skips.

declare(strict_types=1);

require_once __DIR__ . '/github.inc.php';

exit(dispatchWorkflow('deploy.yml', ['refresh' => 'due']));
