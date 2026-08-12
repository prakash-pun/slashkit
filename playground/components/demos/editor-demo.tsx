"use client";

import { useState } from "react";

import { SlashCommandEditor } from "@/components/slashkit/slash-command-editor";
import { ContentMarkdownRenderer } from "@/components/slashkit/content-markdown-renderer";
import { defaultCommands } from "@/lib/slashkit/commands";
import { DemoShell, SourcePeek } from "@/components/demo-shell";
import { Key } from "@/components/demos/changelog-demo";
import { demoCommandOptions } from "@/lib/demo";

const STARTER = `## The editor, on its own

No feature assumed — this is \`slash-command-editor\` and \`content-markdown-renderer\`
with nothing else installed.

Press **/** on an empty line for the menu. Select some text for the formatting
toolbar. Paste a URL and it offers to embed it.

Try pasting an image URL, like this one:

https://placehold.co/800x400/1f2937/e5e7eb.png?text=Paste+me
`;

/**
 * The bare editor, which is the honest starting point: everything else in the
 * kit is this plus a node, a command, or a renderer.
 *
 * The command set is passed explicitly and always has to be — there is no
 * default, because a default is one every surface silently inherits including
 * the ones whose schema cannot honour half of it.
 */
export function EditorDemo() {
  const [body, setBody] = useState(STARTER);

  return (
    <DemoShell
      note={
        <>
          Paste a bare URL to see the chooser — it offers Image or Video only
          when the URL could plausibly be one, and ignoring it leaves the link
          exactly as pasted. A link alone on its line is drawn as a card{" "}
          <em>while you type</em>, by the same rules the renderer uses.{" "}
          <Key>Esc</Key> closes the menu.
        </>
      }
      editor={
        <SlashCommandEditor
          body={STARTER}
          onChange={setBody}
          commands={defaultCommands(demoCommandOptions)}
        />
      }
      output={
        <>
          <ContentMarkdownRenderer body={body} />
          <SourcePeek label="onChange → markdown" value={body} open />
        </>
      }
    />
  );
}
