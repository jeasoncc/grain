import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import type { LexicalEditor } from "lexical";
import type { ReactElement, RefObject } from "react";
import { useEffect } from "react";

/** Keeps runtime props separate from the mount-scoped extension definition. */
export default function EditorLifecyclePlugin({
  editorRef,
  readOnly,
}: {
  editorRef?: RefObject<LexicalEditor | null>;
  readOnly: boolean;
}): ReactElement | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => () => {
    if (editorRef?.current === editor) editorRef.current = null;
  }, [editor, editorRef]);

  return editorRef ? <EditorRefPlugin editorRef={editorRef} /> : null;
}
