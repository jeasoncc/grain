import { LinkPlugin as LexicalLinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import type { JSX } from "react";
import * as React from "react";

import { validateUrl } from "@/components/editor/utils/url";

export function LinkPlugin(): JSX.Element {
	return <LexicalLinkPlugin validateUrl={validateUrl} />;
}
