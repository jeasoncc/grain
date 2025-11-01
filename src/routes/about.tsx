"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SerializedEditorState } from "lexical";
import { Editor } from "@/components/blocks/editor-x/editor";

export const Route = createFileRoute("/about")({
  component: RouteComponent,
});

const initialValue = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Hello World 🚀",
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: "ltr",
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
} as unknown as SerializedEditorState;
function RouteComponent() {
  const [editorState, setEditorState] =
    useState<SerializedEditorState>(initialValue);

  return (
    <div>
      <Editor
        editorSerializedState={editorState}
        onSerializedChange={(value) => setEditorState(value)}
      />
    </div>
  );
}
// import { Editor } from "@/components/blocks/editor-00"
