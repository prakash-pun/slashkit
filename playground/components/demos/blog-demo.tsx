"use client";

import { useState } from "react";

import { BlogPostEditor } from "@/components/slashkit/blog-post-editor";
import { ContentMarkdownRenderer } from "@/components/slashkit/content-markdown-renderer";
import { TableOfContents } from "@/components/slashkit/table-of-contents";
import { CoverImageUploader } from "@/components/slashkit/cover-image-uploader";
import { CategoryCombobox } from "@/components/slashkit/category-combobox";
import { BlogPostCard } from "@/components/slashkit/blog-post-card";
import { extractHeadings } from "@/lib/slashkit/markdown-headings";
import { buildBlogJsonLd, postDescription } from "@/lib/slashkit/seo-helpers";
import { slugify } from "@/lib/slashkit/slug";
import { DemoShell, SourcePeek } from "@/components/demo-shell";
import { Key } from "@/components/demos/changelog-demo";
import { SAMPLE_POST, demoCommandOptions, demoUploadImage } from "@/lib/demo";

const CATEGORIES = ["Budgeting", "Product Updates", "Personal Finance"];

/**
 * The blog demo, which is really two demonstrations.
 *
 * The first is `richBlocks`: quotes, dividers and checklists exist here and
 * nowhere else in the kit, and the editor flag and the renderer flag are on
 * together — turn one off and the other silently stops drawing.
 *
 * The second is the boundary. Title, slug, cover, category and author are all
 * ordinary React state in THIS file. Slashkit owns the body and refuses to own
 * anything around it, which is what the left column is really showing.
 */
export function BlogDemo() {
  const [title, setTitle] = useState("Budgets that survive contact with a month");
  const [category, setCategory] = useState("Budgeting");
  const [cover, setCover] = useState<string | null>(null);
  const [body, setBody] = useState(SAMPLE_POST);

  const slug = slugify(title) || "untitled";
  const post = {
    slug,
    title,
    body,
    category,
    coverImageUrl: cover,
    authorName: "Ada Lovelace",
    publishedAt: "2026-08-12T09:00:00.000Z",
    url: `https://example.com/blog/${slug}`,
    siteName: "Example",
  };

  return (
    <DemoShell
      note={
        <>
          The blog is the one surface with <Key>/quote</Key>, <Key>/divider</Key>{" "}
          and <Key>/checklist</Key> — they need <code>richBlocks</code>, which is
          on in the editor and the renderer together. Everything in the metadata
          row is this demo&apos;s own state, not Slashkit&apos;s.
        </>
      }
      editor={
        <>
          {/* ── Yours, entirely. Slashkit dictates no form. ─────────────── */}
          <div className="mb-4 space-y-3 border-b border-border/60 pb-4">
            <CoverImageUploader
              value={cover}
              onChange={setCover}
              onUploadImage={demoUploadImage}
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              aria-label="Post title"
              className="w-full border-none bg-transparent p-0 text-xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <div className="flex flex-wrap items-center gap-2">
              <CategoryCombobox
                value={category}
                onChange={setCategory}
                suggestions={CATEGORIES}
              />
              <span className="font-mono text-[11px] text-muted-foreground/70">
                /blog/{slug}
              </span>
            </div>
          </div>

          {/* ── …and this is the part Slashkit owns. ────────────────────── */}
          <BlogPostEditor
            body={SAMPLE_POST}
            onChange={setBody}
            commandOptions={demoCommandOptions}
          />
        </>
      }
      output={
        <>
          <TableOfContents headings={extractHeadings(body)} className="mb-6" />
          <h1 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <ContentMarkdownRenderer body={body} richBlocks />

          <div className="mt-8 border-t border-border/60 pt-6">
            <h4 className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
              In a list
            </h4>
            <BlogPostCard
              post={{ ...post, excerpt: postDescription(post) }}
              renderTitleLink={({ className, children }) => (
                <a href="#" className={className} onClick={(e) => e.preventDefault()}>
                  {children}
                </a>
              )}
              renderCategoryLink={({ className, children }) => (
                <a href="#" className={className} onClick={(e) => e.preventDefault()}>
                  {children}
                </a>
              )}
              className="max-w-sm"
            />
          </div>

          <SourcePeek
            label="buildBlogJsonLd → structured data"
            value={JSON.stringify(buildBlogJsonLd(post), null, 2)}
          />
          <SourcePeek label="onChange → markdown" value={body} />
        </>
      }
    />
  );
}
