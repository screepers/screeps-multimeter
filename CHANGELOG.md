# Changelog

## [Unreleased]

- Fixed missing '>>>' prefix for result messages
- Added shard name to multimeter.log output
- Moved prettier to devDependencies where it belongs
- Align continuation lines correctly accounting for shard name prefix

## [2.1.0] - 2021-11-22

- New feature: Allow passing the token via `SCREEPS_TOKEN` environment variable (thanks @matheusvellone)

## [2.0.4] - 2021-06-20

- Bugfix: Change HTML plugin to parse command results as well as log lines (thanks @HoPGoldy)

## [2.0.3] - 2021-06-19

- Bugfix: Align tabs properly to match screeps web console

## [2.0.2] - 2021-05-26

- Bugfix: Fix secure config option

## [2.0.1] - 2021-05-20

- Bugfix: Fix output line-wrapping

## [2.0.0] - 2021-05-16

- Bugfix: Improve performance and avoid hanging when there is too much console output
- Bugfix: Fix private server login
- Bugfix: Watch plugin now works with private servers
- Bugfix: Prevent html plugin stripping leading whitespace
- New feature: Horizontal scrolling for command input
- New feature: Automatically detects available shards (using `auth.me`)
  - The default command shard will be the shard with the most CPU allocated
  - `shard` and `watchShards` config properties are no longer required
- New feature: Support for [screeps unified config](https://github.com/screepers/screepers-standards/blob/master/SS3-Unified_Credentials_File.md) (`.screeps.yaml`)
  - Old `screeps-multimeter.json` config is now deprecated (will attempt to migrate automatically)
  - Use `--server` or `-s` arguments to select which server to connect to initially (defaults to "main")
  - Use `/server` to switch between servers

## [1.11.1] - 2020-10-26

- Bugfix: Updated HTML plugin to parse5 to fix crash when logging output like "<=="
- Bugfix: Updated screeps-api to fix build errors on Node 12

## [1.11.0] - 2020-09-28

- New feature: You can now use /shard0, /shard1, etc. to switch between shards
- New feature: Added shard indicator for console commands

## [1.10.0] - 2020-08-10

- Bugfix: Fixed /help and /alias not working after lodash update
- New feature: Watch plugin now supports multiple shards (thanks @InValidFire)
- New feature: https support for private servers (thanks @KagurazakaNyaa)
- New feature: /pause and /unpause commands (also F9 to toggle)
- New feature: /filter command
- New feature: Multiline paste support (also shift-enter for manual input)

## [1.9.0] - 2020-05-29

- Bugfix: Fixed error message when watch-client.js is not installed
- New feature: Show shard name next to log messages
- New feature: Added /clear command to clear the console output
- New feature: Added /shard command to switch between shards

## [1.8.3] - 2020-03-12

- New plugin (plugin-logging): log all your messages to a file (by @jordansafer and @RvstFyth)

## [1.8.2] - 2019-11-03

- Bugfix: require newer screeps-api to fix watch plugin without reinstalling
- Bugfix: support for utf-8 characters (by @pyrodogg)

## [1.8.1] - 2019-10-20

- Bugfix: The status bar watch plugin should be working again thanks to @pyrodogg

## [1.8.0] - 2018-09-20

- New plugin (plugin-html): supports HTML style attributes (by @jd0yle)

## [1.7.0] - 2018-08-04

- New feature: Better NUX for public/private servers, including token support (by @osum4est)

## [1.6.0] - 2018-07-04

- Bugfix: restore private server support (by @topjor)

## [1.5.0] - 2018-04-16

- New feature: API tokens are now supported, replace the email and password in your config with a token from Screeps (by SystemParadox)
- New feature: Shards are now supported, setshard in your config to the shard name (by SystemParadox)

## [1.4.0] - 2017-07-15

- New feature: use `$*N` instead of `$N` to put raw javascript expressions in aliases (by Dessix)
- New feature: support for private servers (use config.serverUrl; by Dessix)
- New feature: screeps_console.compat plugin (HTML parsing and minor format changes by ags131)

## [1.3.0] - 2017-02-02

- New feature: /alias can now take parameters
- Bugfix: output no longer gets garbled after a reconnection
- Bugfix: /watch will properly update after a reconnection

## [1.2.0] - 2016-12-27

- New feature: /watch status, create a status bar at the bottom of the screen
- New feature: auto-updating nags
- Bugfix: window can be resized properly now

## [1.1.0] - 2016-12-27

- New plugin: Alias, allows you to store long commands as short names
