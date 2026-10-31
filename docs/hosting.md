# Hosting

What the site needs from its host, and how to set it up with each provider used so far. How releases reach the server
is in [deployment.md](deployment.md). The server details the scripts use (SSH target, web root, rsync flags, cron
folder) live only in `scripts/deploy.sh`: moving to another host means changing them there and adding the provider
below.

## What the host must offer

- **SSH with rsync**, for `scripts/deploy.sh` (releases, uploads, the cron scripts).
- **A web server serving static files** from the web root, honouring `.htaccess` (the 404 page, caching, redirects).
- **PHP 8 with the curl extension**: `public/biblicky-citat.php` on the web, and the cron scripts.
- **IMAP mailboxes** for the content workflows that read e-mail ([content-pipelines.md](content-pipelines.md#service-sheet-by-e-mail)):
  the service sheet mailbox and the events mailbox.
- **Crons that each run the scripts of their own folder on a schedule**, outside the web root, with outbound HTTPS
  to api.github.com.

## Starting the workflows on time

GitHub creates scheduled runs hours late (4 to 8 hours seen), while a run started through the API
(`workflow_dispatch`) gets a runner within seconds. So crons on the server start the scheduled workflows:
`service-sheet.php` the service sheet, `events.php` the events mailbox, `deploy.php` the refresh with `refresh=due`.
Their schedules are set only in the hosting's administration and may change; nothing in the repository depends on
them. The workflows have no GitHub schedule: when a cron fails (see the log below), its workflows do not run until its
next run or until started by hand.

`cron-scripts/` holds one folder per cron, named after it: `cron-scripts/<name>/` holds the scripts the cron named
`<name>` runs. They share `cron-scripts/github.inc.php`, which sends the dispatch, tries a network error or a 5xx
again and logs. `pnpm release` syncs each folder with a copy of `github.inc.php` (`scripts/deploy.sh cron`,
permissions 700, no `--delete`) to that cron's folder on the server, `CRON_PREFIX<name>` (`CRON_PREFIX` in
`scripts/deploy.sh`), shown in its preview and done after the yes. A cron that runs every script of its folder runs
`github.inc.php` too, which only defines functions. Next to the scripts live, only on the server,
`github-dispatch.token` and `github-dispatch.log`, in each cron folder: the sync never sends nor touches them. A
script removed from a folder of `cron-scripts/`, or moved to another, stays on the server until the maintainer
deletes it, so a moved script runs from both crons until then. The scripts write their own log, so it does not depend
on what the host logs; a PHP error that stops a script before it logs leaves the log without that line.

Setup, by the maintainer (an agent never connects to the server):

1. **Cron**: a cron that runs the scripts of its folder on the schedule you choose (how: the provider below), and a
   folder of the same name in `cron-scripts/` with its scripts.
2. **Token**: GitHub → Settings → Developer settings → Fine-grained tokens, only the repository named by
   `GITHUB_REPOSITORY` in `cron-scripts/github.inc.php` (for this site `oplaner4/farakurim`),
   repository permission **Actions: Read and write** and nothing else. It can start and cancel workflow runs, not
   push code or read secrets. Note its expiry date: an expired token logs `HTTP 401`, and no workflow runs
   until it is renewed (in every cron folder).
3. **Token file**: over SFTP, `github-dispatch.token` in each cron folder holding the token alone, permissions 600
   (not executable, so a cron that runs the folder's executable files skips it).
4. **Scripts**: `pnpm release` uploads them.
5. **Test**: move the cron a few minutes ahead and wait. `github-dispatch.log` in its folder gets one line per
   workflow and run, `started (HTTP 204 …)` or `FAILED, …` with the reason (a network error when PHP cannot reach
   api.github.com; 401 a wrong or expired token; 403 or 404 a token without access), and the Actions tab shows a
   `workflow_dispatch` run of each workflow the folder's scripts start (Deploy ends after a few seconds unless a
   refresh is due). Then set the cron's schedule back.

## Providers

### Český hosting (cesky-hosting.cz, current)

- **SSH**: the hosting space's root holds one folder per domain; the web root is `/farakurim.cz/` and the backup of
  the old PHP site `/stary.farakurim.cz/`.
- **Cron**: a _directory cron_ (administration → CRON) runs the PHP scripts of its own folder at the root of the
  hosting space, one after another in alphabetical order. Each cron has a name of your choice and a schedule in the
  usual cron syntax (`* * * * *`: hourly, daily, weekly, …); creating one named `04-50` creates `/CRON.04-50/`
  (`CRON_PREFIX` is `/CRON.`), where `cron-scripts/04-50/` would go. Changing the schedule keeps the folder;
  renaming a cron means renaming its folder in `cron-scripts/` to match: the sync would create a missing folder, but
  the hosting runs only its crons' folders. It runs only scripts with execute permission for the owner (500 at
  least, usually 700), from the root of the hosting space as the working directory; scripts cannot write there,
  only next to themselves. Shared hosting allows 5 directory crons, at most every 15 minutes. Its help documents no
  log of directory cron.
- **Mailboxes**: created in the administration; their IMAP host (e.g. `mail.cesky-hosting.cz`) is the variable
  `IMAP_HOST` of each mail workflow's environment.
- **Help**: [CRON](https://www.cesky-hosting.cz/napoveda/skripty-na-serveru/cron/); support at
  podpora@cesky-hosting.cz.
