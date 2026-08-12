"use client";

import { useCallback, useState } from "react";

/**
 * Tracks whether a remote image is unusable, so the caller can drop it from the
 * layout instead of showing a broken-image box.
 *
 * `onError` alone isn't enough: the browser starts fetching as soon as it parses
 * the tag, so an image that fails before React hydrates fails against a handler
 * that isn't attached yet and the event is lost. The ref catches exactly that —
 * a node that is already `complete` with no intrinsic width has failed.
 *
 * Every image in this kit points at an arbitrary origin CDN that may
 * hotlink-protect, rate-limit or simply 404, and the
 * `complete && naturalWidth === 0` detail is too easy to lose in a copy.
 *
 * **Destructure this at the call site.** Holding the result as one object and
 * reading `x.ref` / `x.onError` in JSX trips `react-hooks/refs` — the React
 * Compiler cannot see inside the returned object, so it treats every property
 * read as reading a ref during render, and flags even `onError`, which is
 * plainly an event handler. Destructuring gives each value its own binding:
 *
 *     const { failed, ref: faviconRef, onError } = useBrokenImage();
 *
 * That is a real fix rather than a dodge — nothing here is a ref object, and
 * `ref` is a callback ref, which is exactly what a `ref=` prop wants.
 */
export function useBrokenImage() {
  const [failed, setFailed] = useState(false);

  const ref = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth === 0) setFailed(true);
  }, []);

  return { failed, ref, onError: () => setFailed(true) };
}
