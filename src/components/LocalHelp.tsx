"use client";
// "It's only on my computer (localhost)." Crawler's test machine runs in the cloud, so it can't
// open http://localhost:3000 on YOUR computer. The fix is a TUNNEL: a free command that gives your
// local site a temporary public https address. You paste that address and test it like any site.
// We use Cloudflare's free "quick tunnel" (no account; the address ends in .trycloudflare.com).
// Honest notes are shown: the address is public while the command runs, so stop it after the test.
import { useState } from "react";

export const isLocalAddress = (u: string) =>
  /^(https?:\/\/)?(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[a-z0-9-]+\.local)(:\d+)?(\/|$)/i.test(u.trim());

// The port someone typed (localhost:5173 -> 5173), else the usual dev port.
export function portOf(u: string): string {
  const m = u.match(/:(\d{2,5})(\/|$)/);
  return m ? m[1] : "3000";
}

export default function LocalHelp({ typed = "", onUse }: { typed?: string; onUse: (url: string) => void }) {
  const [port, setPort] = useState(portOf(typed));
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const cmd = `npx cloudflared tunnel --url http://localhost:${port || "3000"}`;
  const tunnel = pasted.trim().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)?.[0] ?? (/^https:\/\/\S+$/.test(pasted.trim()) ? pasted.trim() : "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked: the command is on screen to copy by hand
    }
  }

  return (
    <div className="card p-5" aria-labelledby="local-h">
      <p className="t-label">testing your localhost</p>
      <h2 id="local-h" className="mt-1 text-lg font-semibold">
        Test the version on your computer, before it&apos;s live.
      </h2>
      <p className="mt-2 text-sm text-muted">
        Our test machine is in the cloud, so it can&apos;t open <span className="font-mono">localhost</span> on your computer. One free command gives your local
        site a temporary https address. No account needed.
      </p>
      <ol className="mt-4 space-y-4 text-sm">
        <li>
          <span className="font-medium">1. Keep your site running</span> (for example <span className="font-mono">npm run dev</span>). Its port:{" "}
          <input
            value={port}
            onChange={(e) => setPort(e.target.value.replace(/\D/g, "").slice(0, 5))}
            className="field inline-block h-9 w-24 px-2 font-mono text-sm"
            inputMode="numeric"
            aria-label="Port your site runs on"
          />
        </li>
        <li>
          <span className="font-medium">2. In a second terminal, run:</span>
          <div className="mt-2 flex items-stretch gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-line bg-subtle px-3 py-2 font-mono text-xs">{cmd}</code>
            <button type="button" onClick={copy} className="btn btn-secondary h-auto px-4 text-sm" data-done={copied || undefined}>
              {copied ? <span className="pop-ok">Copied ✓</span> : "Copy"}
            </button>
          </div>
          <p className="mt-1 text-xs text-faint">Needs Node.js. The first time, it downloads Cloudflare&apos;s small tunnel program.</p>
          <p className="mt-1 text-xs text-faint">
            Using Vite? It blocks unknown addresses: add <span className="font-mono">server: {"{"} allowedHosts: [&quot;.trycloudflare.com&quot;] {"}"}</span> to
            vite.config, then restart it.
          </p>
        </li>
        <li>
          <span className="font-medium">3. Paste the address it prints</span> (it ends in <span className="font-mono">.trycloudflare.com</span>):
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={pasted}
              onChange={(e) => setPasted(e.target.value.slice(0, 400))}
              placeholder="https://something-random.trycloudflare.com"
              className="field h-11 flex-1 font-mono text-sm"
              inputMode="url"
              aria-label="Your tunnel address"
            />
            <button type="button" disabled={!tunnel} onClick={() => onUse(tunnel)} className="btn btn-primary h-11 px-5 text-sm">
              Use this address
            </button>
          </div>
        </li>
      </ol>
      <p className="mt-4 text-xs text-faint">
        While the command runs, anyone with that address can open your local site, so press Ctrl+C to stop it after the test. Each run gives a new address. Crawler
        only looks at pages like a visitor; it never logs in or pays.
      </p>
    </div>
  );
}
