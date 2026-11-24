// A drawing of the Crawler app (not a screenshot), set on a painted backdrop: a sidebar, breadcrumbs,
// pill tabs, the main area and a "Properties" panel. Used on the home page to show what you'll see.
// Everything inside is either a real Crawler concept or clearly example content.
import Mark from "@/components/Mark";
import Nature from "@/components/Nature";

// each backdrop is a real nature photo (see Nature.tsx)
const NATURE = { sky: "ridge", dusk: "valley", moss: "peak" } as const;

export default function AppWindow({
  crumb,
  title,
  tabs,
  active,
  children,
  side,
  scene = "sky",
  bleed = "right",
}: {
  crumb: string;
  title: string;
  tabs: string[];
  active: string;
  children: React.ReactNode;
  side?: React.ReactNode;
  scene?: "sky" | "dusk" | "moss";
  bleed?: "right" | "left";
}) {
  return (
    <div className={`scene scene-${scene} ${bleed === "left" ? "scene-left" : ""}`} aria-hidden>
      <Nature kind={NATURE[scene]} />
      <div className="win flex min-h-[28rem] text-left">
        {/* sidebar */}
        <div className="win-side hidden w-52 shrink-0 flex-col p-3 md:flex">
          <div className="flex items-center gap-2 px-2 py-1.5 text-[13px] font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent text-white">
              <Mark size={12} className="text-white" />
            </span>
            Crawler
          </div>
          <div className="mt-3 space-y-0.5">
            <div className="win-item on">◎ Simulations</div>
            <div className="win-item">◇ Customer minds</div>
          </div>
          <p className="mt-5 px-2 text-[11px] text-faint">Recents</p>
          <div className="mt-1 space-y-0.5">
            <div className="win-item">▢ mealmate.app</div>
            <div className="win-item">▢ Pricing page v2</div>
            <div className="win-item">▢ Store: product page</div>
          </div>
          <div className="mt-auto flex items-center gap-2 px-2 pt-6 text-[12px] text-muted">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-subtle text-[9px]">YO</span> You
          </div>
        </div>
        {/* main */}
        <div className="min-w-0 flex-1">
          <div className="flex h-10 items-center justify-between border-b border-line px-4 text-[12px] text-muted">
            <span className="truncate">
              Simulations <span className="mx-1 text-faint">/</span> <span className="text-fg">{crumb}</span>
            </span>
            <span className="hidden sm:inline">··· ◌ Share</span>
          </div>
          <div className="flex">
            <div className="min-w-0 flex-1 p-5">
              <p className="text-[19px] tracking-tight text-fg">{title}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                {tabs.map((t) => (
                  <span key={t} className={`win-tab ${t === active ? "on" : ""}`}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-4">{children}</div>
            </div>
            {side && <div className="hidden w-56 shrink-0 border-l border-line p-4 lg:block">{side}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// The little "Properties" panel used on the right of the windows.
export function Props({ rows, files }: { rows: [string, React.ReactNode][]; files?: string[] }) {
  return (
    <div className="space-y-3 text-[12px]">
      <div className="win-card p-3">
        <p className="mb-2 font-medium text-fg">Properties</p>
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2 py-1">
            <span className="text-faint">{k}</span>
            <span className="text-right text-fg">{v}</span>
          </div>
        ))}
      </div>
      {files && (
        <div className="win-card p-3">
          <p className="mb-2 font-medium text-fg">Files</p>
          {files.map((f) => (
            <p key={f} className="truncate py-1 text-muted">
              ▤ {f}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
