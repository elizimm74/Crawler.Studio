"use client";
// Makes the "press-in" feel work on iPhones too. Safari on iOS only shows a button's :active
// (pressed) style when the page listens for touches, so this adds one empty, passive listener.
// It doesn't block or change scrolling in any way.
import { useEffect } from "react";

export default function PressFeedback() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  return null;
}
