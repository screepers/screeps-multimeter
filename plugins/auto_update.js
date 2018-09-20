const fs = require("mz/fs");
const rp = require("request-promise-native");
const _ = require("lodash");
const semver = require("semver");

const RELEASES_URI =
  "https://api.github.com/repos/CGamesPlay/screeps-multimeter/releases";
const USER_AGENT = "screeps-multiplayer auto-updater";
const VERSION = require("../package.json").version;

function checkForUpdates() {
  return rp({
    uri: RELEASES_URI,
    headers: { "User-Agent": USER_AGENT },
    json: true,
  }).then(releases => {
    releases = _.filter(releases, r => semver.gt(r.tag_name.slice(1), VERSION));
    if (releases.length > 0) {
      return {
        current: VERSION,
        latest: releases[0].tag_name.slice(1),
        notes: _.map(
          releases,
          r =>
            "Release notes for " +
            r.tag_name +
            ":\n" +
            r.body.replace(/\r/g, ""),
        ).join("\n\n"),
      };
    } else {
      return { current: VERSION, latest: VERSION };
    }
  });
}

module.exports = function(multimeter) {
  let release;

  function banner() {
    return (
      "There is a new version of Multimeter!{/} This is " +
      release.current +
      ", the latest is {bold}" +
      release.latest +
      "{/}."
    );
  }

  Promise.resolve(checkForUpdates())
    .then(res => {
      release = res;
      if (res.current != res.latest) {
        multimeter.log(banner() + " Use /version for more information.");
      }
    })
    .catch(err => {
      multimeter.log("Cannot check for updates: " + err.stack);
    });

  multimeter.addCommand("version", {
    description: "Multimeter version information.",
    handler: () => {
      if (release) {
        if (release.current != release.latest) {
          multimeter.log(
            banner() +
              "\n\n" +
              release.notes +
              "\n\nUse npm to update to the latest version.",
          );
        } else {
          multimeter.log(
            "This is Multimeter " + VERSION + ", which is the latest version.",
          );
        }
      } else {
        multimeter.log("This is Multimeter " + VERSION);
      }
    },
  });
};
