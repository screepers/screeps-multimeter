// const rp = require("request-promise-native");
const _ = require("lodash");
const semver = require("semver");

const RELEASES_URI =
  "https://api.github.com/repos/CGamesPlay/screeps-multimeter/releases";
const USER_AGENT = "screeps-multiplayer auto-updater";
const VERSION = require("../package.json").version;

async function checkForUpdates() {
  const res = await fetch(RELEASES_URI, {
    headers: { "User-Agent": USER_AGENT }
  });

  if (!res.ok) {
    throw new Error(`GitHub request failed: ${res.status}`);
  }

  let releases = await res.json();
  releases = releases.filter(r =>
    semver.gt(r.tag_name.slice(1), VERSION)
  );

  if (releases.length > 0) {
    return {
      current: VERSION,
      latest: releases[0].tag_name.slice(1),
      notes: releases
        .map(
          r =>
            `Release notes for ${r.tag_name}:\n` +
            r.body.replace(/\r/g, "")
        )
        .join("\n\n"),
    };
  }

  return { current: VERSION, latest: VERSION };
}

module.exports = async function(multimeter) {
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

  try {
    release = await checkForUpdates();
    if (release.current !== release.latest) {
      multimeter.log(banner() + " Use /version for more information.");
    }
  } catch (err) {
    multimeter.log("Cannot check for updates: " + err.stack);
  }

  multimeter.addCommand("version", {
    description: "Multimeter version information.",
    handler: () => {
      if (release) {
        if (release.current !== release.latest) {
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
