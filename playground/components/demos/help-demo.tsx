"use client";

import { useState } from "react";

import { HelpArticleEditor } from "@/components/slashkit/help-article-editor";
import { ContentMarkdownRenderer } from "@/components/slashkit/content-markdown-renderer";
import {
  DeviceToggle,
  DEFAULT_DEVICE_OPTIONS,
} from "@/components/slashkit/device-toggle";
import { ScreenshotDialogHost } from "@/components/slashkit/screenshot-dialog";
import { hasPlatformImages } from "@/lib/slashkit/parse-platform-alt";
import { DemoShell, SourcePeek } from "@/components/demo-shell";
import { Key } from "@/components/demos/changelog-demo";
import { SAMPLE_ARTICLE, demoCommandOptions, demoUploadImage } from "@/lib/demo";

/**
 * The help demo, which exists mostly to show the platform-tagged image
 * convention doing something.
 *
 * The editor's own preview offers "Both" — a view no reader ever gets — because
 * an author needs to check that a pair is actually there. The reader's toggle
 * on the right has only the real options.
 */
export function HelpDemo() {
  const [body, setBody] = useState(SAMPLE_ARTICLE);
  const [authorPreview, setAuthorPreview] = useState("both");
  const [readerDevice, setReaderDevice] = useState("web");

  return (
    <>
      {/* Mounted once beside the editor. This is what answers `/screenshot`. */}
      <ScreenshotDialogHost onUploadImage={demoUploadImage} />

      <DemoShell
        note={
          <>
            Try <Key>/screenshot</Key> — one description, two optional uploads,
            each inserted with its platform baked into the alt text. The uploads
            here resolve to object URLs, so they work with no server at all.
          </>
        }
        editorLabel="Editor — author's view"
        outputLabel="What ships — reader's view"
        editor={
          <>
            <div className="mb-3">
              <DeviceToggle
                current={authorPreview}
                onChange={setAuthorPreview}
                label="Preview screenshots for"
                options={[
                  { value: "both", label: "Both" },
                  ...DEFAULT_DEVICE_OPTIONS,
                ]}
              />
            </div>
            <HelpArticleEditor
              body={SAMPLE_ARTICLE}
              onChange={setBody}
              commandOptions={demoCommandOptions}
              preview={authorPreview}
            />
          </>
        }
        output={
          <>
            {/* The toggle only appears when the body has something for it to
                switch — a control that visibly does nothing reads as broken. */}
            {hasPlatformImages(body) && (
              <div className="mb-3">
                <DeviceToggle
                  current={readerDevice}
                  onChange={setReaderDevice}
                />
              </div>
            )}
            <ContentMarkdownRenderer body={body} activePlatform={readerDevice} />
            <SourcePeek label="onChange → markdown" value={body} />
          </>
        }
      />
    </>
  );
}
