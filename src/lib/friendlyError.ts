// Turns a raw AI/service error (e.g. `401 {"type":"error",...}`) into one plain sentence for the
// person using Crawler. Raw errors stay in the worker logs; customers never see JSON or codes.
export function friendlyAiError(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const r = raw.toLowerCase();
  if (/401|403|authentication|api[-_ ]?key|permission/.test(r)) return "Our AI service isn't connected right now. That's on our side, not your site.";
  if (/429|rate.?limit|overloaded|529|busy/.test(r)) return "Our AI is very busy right now. Try again in a minute.";
  if (/credit|billing|balance/.test(r)) return "Our AI service is paused right now. That's on our side.";
  if (/timeout|timed out|took too long|aborted/.test(r)) return "Reading the page took too long.";
  return "Our AI couldn't read everything this time.";
}
