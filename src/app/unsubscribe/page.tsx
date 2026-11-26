// /unsubscribe?t=<token>: the link at the bottom of every launch email.
import type { Metadata } from "next";
import UnsubscribeBox from "@/components/UnsubscribeBox";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <section className="home-wide py-24">
      <h1 className="t-h1">Unsubscribe</h1>
      <div className="mt-8">
        <UnsubscribeBox />
      </div>
    </section>
  );
}
