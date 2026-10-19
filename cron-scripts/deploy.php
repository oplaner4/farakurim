<?php
// Daily from the hosting's cron (CRON_DIR in scripts/deploy.sh): refreshes the latest release once the last deploy
// is 7 days old (.github/workflows/deploy.yml, docs/deployment.md "Weekly refresh"); `due` keeps that check, which a
// dispatch by hand skips.

declare(strict_types=1);

require __DIR__ . '/github.inc.php';

exit(dispatchWorkflow('deploy.yml', ['refresh' => 'due']));
