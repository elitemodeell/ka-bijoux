const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "..", "components", "home", "seasonalAudioPlayback.ts");
const sourceText = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(sourceText, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const controllerModule = { exports: {} };
new Function("exports", "module", compiled)(controllerModule.exports, controllerModule);
const { SeasonalAudioPlayback } = controllerModule.exports;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class FakePlayer {
  loop = false;
  volume = 1;
  playCount = 0;
  pauseCount = 0;
  replaceCount = 0;
  failReplace = false;
  play() { this.playCount += 1; }
  pause() { this.pauseCount += 1; }
  replace() {
    this.replaceCount += 1;
    if (this.failReplace) throw new Error("audio source unavailable");
  }
}

async function run() {
  let active = true;
  const player = new FakePlayer();
  let audioModeCalls = 0;
  const controller = new SeasonalAudioPlayback(
    player,
    async () => { audioModeCalls += 1; await wait(10); },
    () => active,
  );

  // Enable, finish the 2-second volume fade, then disable and re-enable repeatedly.
  await controller.start("bundled", 1, 0.08);
  await wait(2400);
  assert.equal(player.playCount, 1, "first activation plays on the existing player");
  assert.ok(Math.abs(player.volume - 0.08) < 0.001, "fade reaches the 8% cap");
  controller.stop();
  assert.equal(player.pauseCount, 1, "deactivation pauses the same player");
  await controller.start("bundled", 1, 0.08);
  controller.stop();
  await controller.start("bundled", 1, 0.08);
  assert.equal(player.replaceCount, 1, "rapid toggles do not recreate or reload the player");
  assert.equal(player.playCount, 3, "rapid toggles remain usable");

  // A pending start invalidated by a rapid off action must never begin playback.
  const beforePending = player.playCount;
  const pending = controller.start("bundled", 1, 0.08);
  controller.stop();
  await pending;
  assert.equal(player.playCount, beforePending, "off cancels a pending start");

  // Backgrounding stops; foregrounding permits a clean restart.
  active = false;
  await controller.start("bundled", 1, 0.08);
  assert.equal(player.playCount, beforePending, "background state suppresses playback");
  controller.stop();
  active = true;
  await controller.start("bundled", 1, 0.08);
  assert.equal(player.playCount, beforePending + 1, "foreground resume works");

  // A missing/unavailable source is contained and cannot escape as an exception.
  const missingPlayer = new FakePlayer();
  missingPlayer.failReplace = true;
  let reportedErrors = 0;
  const missing = new SeasonalAudioPlayback(missingPlayer, async () => {}, () => true, () => { reportedErrors += 1; });
  await assert.doesNotReject(missing.start("missing", { uri: "https://invalid.invalid/audio.mp3" }, 0.08));
  assert.equal(missingPlayer.playCount, 0, "failed source never starts playback");
  assert.equal(reportedErrors, 1, "source failure is reported to UI without crashing it");

  const playsBeforeDispose = player.playCount;
  controller.dispose();
  controller.stop();
  await controller.start("bundled", 1, 0.08);
  assert.equal(player.playCount, playsBeforeDispose, "disposed player receives no further operations");
  assert.ok(audioModeCalls >= 4, "audio session mode is applied on activation");
  console.log("Seasonal audio controller checks passed: stable player, fade, rapid toggles, background/foreground, unavailable source and disposal.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
