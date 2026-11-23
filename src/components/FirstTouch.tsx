"use client";
// Remembers where this visitor FIRST came from (link tags like ?utm_source=tiktok and the referring
// domain), once per browser. Nothing is sent anywhere until they sign up; then it's saved with their
// onboarding answers so the admin insights page can tell which posts bring real users.
import { useEffect } from "react";
import { rememberFirstTouch } from "@/lib/insights";

export default function FirstTouch() {
  useEffect(() => rememberFirstTouch(), []);
  return null;
}
