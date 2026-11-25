// REAL founder case studies (with the founder's permission). One entry per founder; the pages
// /case-studies and /case-studies/<slug> and the home page read this file, so editing it here
// updates everything.
// RULES (honesty):
//   - Only real people who said yes. Rubin is 15, so his parent/guardian must agree too
//     (in writing) before this is public. Set `published: false` to hide the page instantly.
//   - Their numbers are THEIR numbers: always labelled "as reported by <name>", never presented as
//     Crawler's result unless a Crawler test actually caused it.
//   - `crawler` stays empty until the real test is done; the page then shows "coming soon".
export type CaseStudy = {
  slug: string;
  published: boolean;
  founder: string;
  age: number;
  product: string;
  kind: string; // what was / will be tested
  photo: string;
  photoAlt: string;
  icon: string;
  iconAlt: string;
  summary: string; // one line for cards
  stats: { value: string; label: string }[]; // as reported by the founder
  story: { heading: string; body: string[] }[];
  glance: { label: string; value: string }[]; // the "At a glance" card (facts only)
  // how this founder's Crawler test runs; status moves to "done" as each step really happens
  plan: { title: string; body: string; status: "done" | "now" | "next" }[];
  questions: string[]; // what every simulated customer answers in this test
  crawler: null | { tested: string; found: string[]; changed: string[]; quote?: string };
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "handle-lab",
    published: true,
    founder: "Rubin Netai",
    age: 15,
    product: "Handle Lab",
    kind: "Mobile app",
    photo: "/case-studies/handle-lab/rubin.jpg",
    photoAlt: "Rubin Netai, the 15-year-old founder of Handle Lab, giving a thumbs up",
    icon: "/case-studies/handle-lab/icon.jpg",
    iconAlt: "The Handle Lab app icon: an orange basketball with a ring around it, dropping through a net",
    summary: "A 15-year-old founder whose basketball app climbed 150+ places in the sports rankings.",
    stats: [
      { value: "15", label: "years old" },
      { value: "+150", label: "places in the sports rankings" },
      { value: "10k+", label: "a month" },
    ],
    story: [
      {
        heading: "The founder",
        body: [
          "Rubin Netai is 15. He created Handle Lab, a basketball app, and runs it himself.",
          "He agreed to share how he builds and launches, and to run Handle Lab through Crawler so other young founders can see what a test turns up.",
        ],
      },
      {
        heading: "The traction so far",
        body: [
          "Handle Lab has climbed more than 150 places in the sports rankings and does 10k+ a month, as reported by Rubin.",
          "Those results came before Crawler. This case study is about what comes next: finding what still stops people from downloading, starting a trial or paying.",
        ],
      },
      {
        heading: "Why test with Crawler",
        body: [
          "Even an app that is growing loses many of the people who look at it. Crawler sends simulated customers through the app's onboarding and paywall, from screenshots, and reports where they hesitate and why.",
          "Every fix comes ranked by how many simulated customers it could win back, so Rubin can decide what to change first.",
        ],
      },
    ],
    glance: [
      { label: "Founder", value: "Rubin Netai, 15" },
      { label: "Product", value: "Handle Lab" },
      { label: "Type", value: "Basketball app" },
      { label: "Traction", value: "+150 in sports rankings · 10k+ a month (reported)" },
      { label: "Crawler test", value: "Mobile app: onboarding and paywall" },
      { label: "Status", value: "In progress" },
    ],
    plan: [
      { title: "Collect the screens", body: "Rubin adds screenshots of Handle Lab's onboarding and paywall, in order. Crawler never logs into the app.", status: "now" },
      { title: "Pick the crowd", body: "He chooses who the simulated customers are: their ages, budgets, mindsets and what they use today.", status: "next" },
      { title: "Run the simulation", body: "Each simulated customer goes through the screens on their own phone, with their own patience and dealbreaker, and decides.", status: "next" },
      { title: "Fix and re-test", body: "Rubin gets fixes ranked by how many customers each could win back, ships the top ones, then re-tests the same crowd.", status: "next" },
    ],
    questions: [
      "Would you keep going after the first screen?",
      "Would you start the free trial or pay?",
      "What stopped you, in your own words?",
      "What would change your mind?",
    ],
    crawler: null,
  },
];

export const publishedCaseStudies = () => CASE_STUDIES.filter((c) => c.published);
export const findCaseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug && c.published) ?? null;
