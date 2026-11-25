// REAL founder case studies (with the founder's permission). One entry per founder; the pages
// /case-studies and /case-studies/<slug> and the home page read this file, so editing it here
// updates everything.
// RULES (honesty):
//   - Only real people who said yes. Oliver is 15, so his parent/guardian must agree too
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
  crawler: null | { tested: string; found: string[]; changed: string[]; quote?: string };
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "handle-lab",
    published: true,
    founder: "Oliver Nasatir",
    age: 15,
    product: "Handle Lab",
    kind: "Mobile app",
    photo: "/case-studies/handle-lab/oliver.jpg",
    photoAlt: "Oliver Nasatir, the 15-year-old founder of Handle Lab, giving a thumbs up",
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
          "Oliver Nasatir is 15. He created Handle Lab, a basketball app, and runs it himself.",
          "He agreed to share how he builds and launches, and to run Handle Lab through Crawler so other young founders can see what a test turns up.",
        ],
      },
      {
        heading: "The traction so far",
        body: [
          "Handle Lab has climbed more than 150 places in the sports rankings and does 10k+ a month, as reported by Oliver.",
          "Those results came before Crawler. This case study is about what comes next: finding what still stops people from downloading, starting a trial or paying.",
        ],
      },
      {
        heading: "Why test with Crawler",
        body: [
          "Even an app that is growing loses many of the people who look at it. Crawler sends simulated customers through the app's onboarding and paywall, from screenshots, and reports where they hesitate and why.",
          "Every fix comes ranked by how many simulated customers it could win back, so Oliver can decide what to change first.",
        ],
      },
    ],
    crawler: null,
  },
];

export const publishedCaseStudies = () => CASE_STUDIES.filter((c) => c.published);
export const findCaseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug && c.published) ?? null;
