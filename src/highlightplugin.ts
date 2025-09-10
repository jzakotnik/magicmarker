import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export const highlightPluginKey = new PluginKey("persistHighlight");

export function createHighlightPlugin() {
  return new Plugin({
    key: highlightPluginKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, oldDecos: DecorationSet) {
        const range = tr.getMeta(highlightPluginKey) as
          | { from: number; to: number }
          | null
          | undefined;

        if (range === undefined) {
          return oldDecos.map(tr.mapping, tr.doc);
        }
        if (range === null) return DecorationSet.empty;
        if (range.from < range.to) {
          return DecorationSet.create(tr.doc, [
            Decoration.inline(range.from, range.to, {
              class: "persist-highlight",
            }),
          ]);
        }
        return DecorationSet.empty;
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}
