"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Render children into <body>, escaping any ancestor that has established a
 * containing block for fixed positioning (an ancestor with backdrop-filter /
 * filter / transform — e.g. our blurred sticky header). Without this a
 * `position: fixed` overlay is clipped to that ancestor's box instead of the
 * viewport, which is exactly what broke the search overlay.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
