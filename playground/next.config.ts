import type { NextConfig } from "next";

/**
 * The playground ships as STATIC HTML, onto the same GitHub Pages site that
 * serves the registry itself.
 *
 * `output: "export"` is the whole reason this works on Pages, and it costs
 * nothing here: every Slashkit editor is a client component by nature, so there
 * was never a server to render on. The registry JSON at `/r/*.json` and this
 * app at `/play/` are both just files in `public/`.
 *
 * `basePath` has to match where the deploy actually lands. Pages serves this
 * repo at `/slashkit/`, and the workflow copies the export into `public/play`,
 * so every asset URL has to be prefixed with `/slashkit/play` or the page loads
 * and then fails to find its own JavaScript. Override it with
 * `NEXT_PUBLIC_BASE_PATH=""` when running locally or deploying elsewhere.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // The playground is its own npm project nested inside the registry repo, so
  // there are two lockfiles and Turbopack picks the wrong root by default.
  turbopack: { root: import.meta.dirname },
  // A static export has no image optimiser to call.
  images: { unoptimized: true },
  // Pages serves `/play/` as a directory, so emit `play/index.html` rather than
  // `play.html` — without this every link 404s on the trailing slash.
  trailingSlash: true,
};

export default nextConfig;
