// VIDEO TEST BENCH: the parts of video testing that must be exactly right, with known answers
// and no AI (free, runs anywhere): cleaning answers, the watch curve, ranges, the view range,
// the deal check, reading pasted view counts, picking frame times, cleaning what the browser sends.
// Run: npm run bench (it builds first). Any failure = exit code 1.
const path = require("path");
const build = path.join(__dirname, "..", ".bench-build", "lib", "video");
const A = require(path.join(build, "aggregate.js"));
const { frameTimes } = require(path.join(build, "frames.js"));
const { cleanVideoSettings } = require(path.join(build, "validate.js"));

let pass = 0;
let total = 0;
function test(name, fn) {
  total++;
  try {
    const problem = fn();
    if (problem) throw new Error(problem);
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}
const eq = (a, b, what) => (JSON.stringify(a) === JSON.stringify(b) ? null : `${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const near = (a, b, what) => (Math.abs(a - b) < 1e-3 ? null : `${what}: expected ${b}, got ${a}`);

const raw = (o) => ({
  stopped_scrolling: true, swiped_at_frame: 0, liked: false, shared: false, tapped_through: false, after_tap: "didn't tap",
  objection_category: "unclear value", objection: "meh", would_change_mind: "show it", quote: "ok", ...o,
});
const P = (id, sample = 0) => ({ id, sample });

console.log("Video bench");

// ---------- cleaning one answer ----------
test("didn't stop scrolling = gone at frame 1, can't like/share/tap", () => {
  const v = A.normalizeVideo(raw({ stopped_scrolling: false, swiped_at_frame: 4, liked: true, shared: true, tapped_through: true, after_tap: "try it" }), P("a"), 5);
  return eq([v.leftAt, v.liked, v.shared, v.tapped, v.afterTap], [1, false, false, false, "didn't tap"], "answer");
});
test("stopped but 'left at frame 1' is moved to frame 2", () => eq(A.normalizeVideo(raw({ swiped_at_frame: 1 }), P("a"), 5).leftAt, 2, "leftAt"));
test("a frame number past the end means watched to the end", () => eq(A.normalizeVideo(raw({ swiped_at_frame: 99 }), P("a"), 5).leftAt, 0, "leftAt"));
test("no tap = 'didn't tap', and 'none' becomes a real reason", () => {
  const v = A.normalizeVideo(raw({ after_tap: "try it", objection_category: "none" }), P("a"), 5);
  return eq([v.afterTap, v.objectionCategory], ["didn't tap", "unclear value"], "answer");
});
test("tapped + try it = no objection", () => eq(A.normalizeVideo(raw({ tapped_through: true, after_tap: "try it", objection_category: "price" }), P("a"), 5).objectionCategory, "none", "category"));

// ---------- counting ----------
const beats = [1, 2, 3, 4].map((n, i) => ({ file: `${n}.jpg`, t: [0.3, 1.5, 3, 6][i], shows: "", text: "" }));
const personas = ["a", "b", "c", "d"].map((id, i) => ({ id, age: [16, 22, 30, 50][i], mindset: i < 2 ? "impulse buyer" : "skeptical", sample: 0 }));
const verdicts = [
  A.normalizeVideo(raw({ stopped_scrolling: false }), P("a"), 4), // gone at 1
  A.normalizeVideo(raw({ swiped_at_frame: 3 }), P("b"), 4), // gone at 3
  A.normalizeVideo(raw({ swiped_at_frame: 0, shared: true, tapped_through: true, after_tap: "try it" }), P("c"), 4), // to the end
  A.normalizeVideo(raw({ swiped_at_frame: 0, tapped_through: true, after_tap: "maybe later" }), P("d"), 4), // to the end
];
const stats = A.aggregateVideo(beats, 8, personas, verdicts, 1);
test("watch curve after each frame", () => eq(stats.curve.map((c) => c.watching), [0.75, 0.75, 0.5, 0.5], "curve"));
test("hook, finish, share, tap, try", () => eq([stats.hook.mid, stats.finish.mid, stats.share.mid, stats.tap.mid, stats.tryIt.mid], [0.75, 0.5, 0.25, 0.5, 0.25], "rates"));
test("biggest drop is a tie -> the first frame where people left", () => eq([stats.biggestDrop.n, stats.biggestDrop.left], [1, 1], "drop"));
test("average watched: (0.9/8 + 4.5/8 + 1 + 1) / 4", () => near(stats.avgWatchPct, Math.round(((0.9 / 8 + 4.5 / 8 + 2) / 4) * 1000) / 1000, "avg"));
test("reasons skip the person who'll try it", () => eq(stats.objections.reduce((s, o) => s + o.count, 0), 3, "count"));
test("tap rate by age band", () => eq(stats.byAge.map((s) => [s.name, s.tapRate]), [["13–17", 0], ["18–24", 0], ["25–34", 1], ["45+", 1]], "ages"));
test("3 crowds give a low / mid / high range", () => {
  const vs = [0, 1, 2].flatMap((s) => [0, 1, 2, 3].map((i) => ({ ...verdicts[i], personaId: `S${s}-${i}`, sample: s, tapped: i < s + 1 })));
  return eq(A.aggregateVideo(beats, 8, [], vs, 3).tap, { mid: 0.5, low: 0.25, high: 0.75 }, "tap range");
});

// ---------- reach signal + view range ----------
test("reach signal = 0.4 hook + 0.35 finish + 0.25 share/20%", () => near(A.reachSignal(0.5, 0.2, 0.1), 0.395, "signal"));
test("share above 20% is capped", () => near(A.reachSignal(0, 0, 0.9), 0.25, "signal"));
test("a typical signal keeps the account's usual views (x1)", () => eq(A.signalMultiplier(0.4), 1, "multiplier"));
test("the multiplier is capped at x0.3 and x3", () => eq([A.signalMultiplier(0.01), A.signalMultiplier(1)], [0.3, 3], "caps"));
test("median ignores one viral hit", () => eq(A.median([10000, 20000, 30000, 1000000]), 25000, "median"));
test("no account views = no view range (never made up)", () => eq(A.estimateViews({ mid: 0.5, low: 0.4, high: 0.6 }, null), null, "estimate"));
test("view range around the usual for a typical video", () => {
  const e = A.estimateViews({ mid: 0.4, low: 0.4, high: 0.4 }, { handle: "x", platform: "TikTok", followers: null, recentViews: [10000, 20000, 30000], source: "entered" });
  return eq([e.usual, e.likely, e.low, e.high, e.verdict], [20000, 20000, 10000, 36000, "around usual"], "estimate");
});

// ---------- deal check ----------
const views = { usual: 50000, likely: 50000, low: 25000, high: 90000, multiplier: 1, verdict: "around usual", basedOn: 5 };
test("$500 for 50k likely views = $10 per 1,000 = fair at a $10 target", () => {
  const d = A.dealCheck(500, views, { tap: { mid: 0.1, low: 0.1, high: 0.1 }, tryIt: { mid: 0.05, low: 0.05, high: 0.05 } }, 10);
  return eq([d.cpm.likely, d.verdict, d.visitors.likely, d.perVisitor, d.tries], [10, "fair", 500, 1, 250], "deal");
});
test("a cheaper post is a good deal", () => eq(A.dealCheck(200, views, { tap: { mid: 0.1, low: 0.1, high: 0.1 }, tryIt: { mid: 0, low: 0, high: 0 } }, 10).verdict, "good deal", "verdict"));
test("no price = no deal check", () => eq(A.dealCheck(null, views, { tap: { mid: 0.1 }, tryIt: { mid: 0 } }, 10), null, "deal"));

// ---------- pasted view counts ----------
test("reads 12k, 8.4K, 1.2M, 9,800 and 950", () => eq(A.parseViews("12k, 8.4K, 1.2M, 9,800 950"), [12000, 8400, 1200000, 9800, 950], "views"));

// ---------- frame times ----------
test("a 15s video: 9 frames, dense start, strictly increasing", () => {
  const t = frameTimes(15);
  if (t.length !== 9) return `expected 9 frames, got ${t.length}`;
  if (t[0] !== 0.3 || t[1] !== 1.5 || t[2] !== 3) return `start ${t.slice(0, 3)}`;
  if (t.some((x, i) => i && x <= t[i - 1])) return "not increasing";
  return t[t.length - 1] <= 14.6 ? null : `last ${t[t.length - 1]}`;
});
test("a 10-minute video: 12 frames from the first 3 minutes", () => {
  const t = frameTimes(600);
  return t.length === 12 && t[t.length - 1] <= 179.6 ? null : `${t.length} frames, last ${t[t.length - 1]}`;
});
test("a tiny video still gives 2 frames (the database needs 2)", () => eq(frameTimes(0.4).length, 2, "frames"));

// ---------- what the browser sends ----------
test("only YOUR frames and times, short text, safe options", () => {
  const input = { batch: "abcdefgh", frames: ["1.jpg", "2.jpg"], times: [0.3, 2], duration: 5, platform: "TikTok" };
  const s = cleanVideoSettings(
    {
      placement: "hacker",
      platform: "MySpace",
      beats: [{ file: "1.jpg", t: 999, shows: "x".repeat(900), text: "hi" }, { file: "../evil.jpg", shows: "bad" }],
      script: "y".repeat(5000),
      creator: { handle: "@good<script>", recentViews: [1000, "junk", -5, 2000], followers: "nope" },
      price: -20,
    },
    input,
  );
  return eq(
    [s.placement, s.platform, s.beats.map((b) => [b.file, b.t]), s.beats[0].shows.length, s.script.length, s.creator.handle, s.creator.recentViews, s.creator.followers, s.price],
    ["organic", "TikTok", [["1.jpg", 0.3], ["2.jpg", 2]], 300, 2000, "@goodscript", [1000, 0, 2000], null, null],
    "settings",
  );
});

console.log(`\nVideo bench: ${pass}/${total}`);
if (pass !== total) process.exit(1);
