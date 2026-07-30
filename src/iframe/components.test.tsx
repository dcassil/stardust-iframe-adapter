import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { EditableTarget } from "./EditableTarget.js";
import { ContentRenderer } from "./ContentRenderer.js";
import { StyleElement } from "./StyleElement.js";
import { StardustContentContext } from "./content-context.js";
import { discoverTargets } from "./discovery.js";
import type {
  CmsContent,
  ContentPayload,
} from "../protocol/index.js";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

/* -------------------------------------------------------------------------- */
/* EditableTarget                                                             */
/* -------------------------------------------------------------------------- */

describe("EditableTarget", () => {
  it("TC-001: emits data-cms and (only for containers) data-cms-container-target", () => {
    const { container } = render(
      <>
        <EditableTarget targetId="hero" />
        <EditableTarget targetId="grid" isContainer />
      </>
    );

    const hero = container.querySelector('[data-cms="hero"]');
    const grid = container.querySelector('[data-cms="grid"]');
    expect(hero).not.toBeNull();
    expect(grid).not.toBeNull();
    expect(hero!.hasAttribute("data-cms-container-target")).toBe(false);
    expect(grid!.hasAttribute("data-cms-container-target")).toBe(true);
  });

  it("renders host-injected content from context, wrapped in a style element", () => {
    const content: CmsContent = {
      id: "c1",
      type: "text",
      value: "Hello world",
      styleGroup: "body",
    };
    const payload: ContentPayload = {
      targetId: "hero",
      contentId: "c1",
      index: 0,
      content,
    };
    const value = {
      content: { hero: [payload] },
      applyContent: () => undefined,
    };

    const { container } = render(
      <StardustContentContext.Provider value={value}>
        <EditableTarget targetId="hero" />
      </StardustContentContext.Provider>
    );

    const styleEl = container.querySelector("[data-style-element]");
    expect(styleEl).not.toBeNull();
    expect(styleEl!.getAttribute("data-style-id")).toBe("c1");
    expect(styleEl!.getAttribute("data-style-group")).toBe("body");
    const contentEl = container.querySelector("[data-cms-content]");
    expect(contentEl!.getAttribute("data-style-group")).toBe("body");
    expect(contentEl!.textContent).toBe("Hello world");
  });
});

/* -------------------------------------------------------------------------- */
/* ContentRenderer                                                            */
/* -------------------------------------------------------------------------- */

describe("ContentRenderer", () => {
  it("TC-002: renders text and number content as data-cms-content elements", () => {
    const { container } = render(
      <>
        <ContentRenderer
          content={{ id: "t", type: "text", value: "words", styleGroup: "g1" }}
        />
        <ContentRenderer
          content={{ id: "n", type: "number", value: "42", styleGroup: "g2" }}
        />
      </>
    );

    const text = container.querySelector("#t")!;
    const number = container.querySelector("#n")!;
    expect(text.hasAttribute("data-cms-content")).toBe(true);
    expect(text.textContent).toBe("words");
    expect(text.getAttribute("data-style-group")).toBe("g1");
    expect(number.textContent).toBe("42");
    expect(number.getAttribute("data-style-group")).toBe("g2");
  });

  it("TC-002: renders image content as an img with data-cms-content and src", () => {
    const { container } = render(
      <ContentRenderer
        content={{
          id: "img",
          type: "image",
          value: "https://example.com/a.png",
          styleGroup: "media",
        }}
      />
    );
    const img = container.querySelector("img")!;
    expect(img.getAttribute("data-cms-content")).not.toBeNull();
    expect(img.getAttribute("src")).toBe("https://example.com/a.png");
  });

  it("TC-002: renders container content with data-cms-container and nested targets", () => {
    const { container } = render(
      <ContentRenderer
        content={{ id: "box", type: "container", styleGroup: "layout" }}
      />
    );
    const box = container.querySelector("#box")!;
    expect(box.hasAttribute("data-cms-content")).toBe(true);
    expect(box.hasAttribute("data-cms-container")).toBe(true);
    // Two nested container targets.
    const nested = container.querySelectorAll("[data-cms-container-target]");
    expect(nested).toHaveLength(2);
    expect(container.querySelector('[data-cms="box.1"]')).not.toBeNull();
    expect(container.querySelector('[data-cms="box.2"]')).not.toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* StyleElement                                                               */
/* -------------------------------------------------------------------------- */

describe("StyleElement", () => {
  it("emits all data-style-* attributes and renders its child unchanged", () => {
    const { container } = render(
      <StyleElement name="text" group="body" id="c9" rules={["text", "color"]}>
        <span>child</span>
      </StyleElement>
    );
    const el = container.querySelector("[data-style-element]")!;
    expect(el.getAttribute("data-style-name")).toBe("text");
    expect(el.getAttribute("data-style-id")).toBe("c9");
    expect(el.getAttribute("data-style-group")).toBe("body");
    expect(el.getAttribute("data-style-rules")).toBe("text,color");
    expect(el.querySelector("span")!.textContent).toBe("child");
  });
});

/* -------------------------------------------------------------------------- */
/* End-to-end: components emit exactly what discovery reads                   */
/* -------------------------------------------------------------------------- */

describe("components + discovery integration", () => {
  it("mounting a target tree yields a discoverable ContentTarget with children", () => {
    const payloads: ContentPayload[] = [
      {
        targetId: "hero",
        contentId: "c1",
        index: 0,
        content: { id: "c1", type: "text", value: "hi", styleGroup: "body" },
      },
      {
        targetId: "hero",
        contentId: "c2",
        index: 1,
        content: {
          id: "c2",
          type: "image",
          value: "x.png",
          styleGroup: "media",
        },
      },
    ];
    const value = {
      content: { hero: payloads },
      applyContent: () => undefined,
    };

    render(
      <StardustContentContext.Provider value={value}>
        <EditableTarget targetId="hero" />
        <EditableTarget targetId="grid" isContainer />
      </StardustContentContext.Provider>
    );

    const targets = discoverTargets(document);
    const hero = targets.find((t) => t.targetId === "hero")!;
    const grid = targets.find((t) => t.targetId === "grid")!;

    expect(hero.isContainer).toBe(false);
    expect(hero.children).toHaveLength(2);
    expect(hero.children.map((c) => c.contentId)).toEqual(["c1", "c2"]);
    expect(hero.children.map((c) => c.styleGroup)).toEqual(["body", "media"]);
    // `grid` has a nested [data-cms-container-target]? No — it *is* one; a bare
    // container target with no children is still discovered as a target.
    expect(grid.isContainer).toBe(false);
    expect(grid.children).toEqual([]);
  });
});
