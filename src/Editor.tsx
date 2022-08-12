import React, { useMemo, useState } from "react";
import { css } from "@emotion/react";
import {
  Editable,
  withReact,
  Slate,
  RenderElementProps,
  RenderLeafProps,
} from "slate-react";
import styled from "@emotion/styled";
import {
  Transforms,
  Editor,
  Range,
  createEditor,
  Element as SlateElement,
  Descendant,
} from "slate";
import { withHistory } from "slate-history";
import { ButtonElement, CombinedElement } from "./global";

const initialValue: Descendant[] = [
  {
    type: "paragraph",
    children: [
      {
        text: "In addition to block nodes, you can create inline nodes. Here is a ",
      },
      {
        text: ", and here is a more unusual inline: an ",
      },
      {
        type: "button",
        children: [{ text: "editable button" }],
      },
      {
        text: "!",
      },
    ],
  },
];

const Element: React.FC<RenderElementProps> = (props) => {
  const { attributes, children, element } = props;
  switch (element.type) {
    case "button":
      return (
        <b
          css={css`
            color: red;
          `}
          {...props}
        />
      );
    default:
      return <p {...attributes}>{children}</p>;
  }
};

const Text: React.FC<RenderLeafProps> = (props) => {
  const { attributes, children, leaf } = props;
  return (
    <span
      css={
        leaf.text === ""
          ? css`
              padding-left: 0.1px;
            `
          : null
      }
      {...attributes}
    >
      {children}
    </span>
  );
};

const Container = styled.div`
  width: 300px;
  margin: 0 auto;
  border: 1px solid #ccc;
`;

const withInline = (editor: Editor) => {
  const { isInline } = editor;

  editor.isInline = (element: CombinedElement) =>
    ["button"].includes(element.type) || isInline(element);

  return editor;
};

const normalize = (value: Descendant[]) => {
  const tree = JSON.parse(JSON.stringify(value));
  const intent: {
    text: string;
    marks: Array<{ start: number; end: number }>;
  } = {
    text: "",
    marks: [],
  };
  let node;
  while ((node = tree.shift())) {
    if (node.type === "paragraph") {
      tree.unshift(...node.children);
    } else if (node.type === "button") {
      const start: number = intent.text.length;
      intent.text += node.children[0].text;
      intent.marks.push({
        start,
        end: start + node.children[0].text.length,
      });
    } else {
      intent.text += node.text;
    }
  }

  return JSON.stringify(intent, null, 2);
};

function InlineEditor() {
  const [value, setValue] = useState(initialValue);
  const editor = useMemo(
    () => withInline(withHistory(withReact(createEditor()))),
    []
  );
  return (
    <>
      <Container
        css={css`
          width: 500px;
          white-space: pre-wrap;
        `}
      >
        {normalize(value)}
      </Container>
      <Container>
        <Slate
          editor={editor}
          value={initialValue}
          onChange={(val) => {
            setValue(JSON.parse(JSON.stringify(val)));
          }}
        >
          <Editable
            renderElement={(props) => <Element {...props} />}
            renderLeaf={(props) => <Text {...props} />}
            placeholder="Enter some text..."
            onSelectCapture={() => {
              const { selection } = editor;
              const isCollapsed = selection && Range.isCollapsed(selection);
              if (isCollapsed) return;
              const button: ButtonElement = {
                type: "button",
                children: [],
              };
              const windSelection = window.getSelection();
              const text = windSelection?.toString() as any;
              const endLength = text.length - text.trimEnd().length;
              const startLength = text.length - text.trimStart().length;

              if (text && selection && editor && text.trim().length) {
                let clone = JSON.parse(JSON.stringify(selection));
                if (clone.anchor.offset < clone.focus.offset) {
                  clone.anchor.offset += startLength;
                  clone.focus.offset -= endLength;
                }
                if (clone.anchor.offset > clone.focus.offset) {
                  clone.anchor.offset -= endLength;
                  clone.focus.offset += startLength
                }
                Transforms.select(editor, clone)
                Transforms.unwrapNodes(editor, {
                  at: [],
                  match: (node, path) =>
                    !Editor.isEditor(node) &&
                    "type" in node &&
                    node.type === "button",
                  mode: "all",
                });

                Transforms.wrapNodes(editor, button, { split: true });
                Transforms.collapse(editor, { edge: "end" });
              }
            }}
          />
        </Slate>
      </Container>
    </>
  );
}

export default InlineEditor;
