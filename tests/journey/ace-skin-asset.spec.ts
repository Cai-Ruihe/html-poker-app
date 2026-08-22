import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const cardAsset = path.resolve(
  "assets/skins/classic-revk/ace-of-spades-our-poker-table.svg",
);
const figmaSource = path.resolve(
  "assets/skins/classic-revk/ace-center-artwork-figma.svg",
);
const figmaSourceSha256 =
  "2a7db5d23ff50b832a5955356cdb6562279a9ec0ce4551497ddcd307e13e57fc";

test("full Ace preserves the approved Figma core without the rejected dotted outline", async ({
  page,
}) => {
  const sourceBytes = fs.readFileSync(figmaSource);
  expect(createHash("sha256").update(sourceBytes).digest("hex")).toBe(
    figmaSourceSha256,
  );

  await page.goto(`file://${cardAsset}`);

  const embedded = await page.evaluate(() => {
    const artwork = document.querySelector("#figma-ace-artwork");
    if (!(artwork instanceof SVGSVGElement)) {
      throw new Error("Figma centre artwork is missing from the full Ace");
    }

    return {
      sourceHash: artwork.dataset.sourceSha256,
      figmaFile: artwork.dataset.figmaFile,
      figmaNode: artwork.dataset.figmaNode,
      viewBox: artwork.getAttribute("viewBox"),
      placement: [
        artwork.getAttribute("x"),
        artwork.getAttribute("y"),
        artwork.getAttribute("width"),
        artwork.getAttribute("height"),
      ],
      overflow: artwork.getAttribute("overflow"),
      paths: [...artwork.querySelectorAll("path")].map((item) => {
        const style = getComputedStyle(item);
        return {
          d: item.getAttribute("d"),
          fill: style.fill,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeLinecap: style.strokeLinecap,
          strokeLinejoin: style.strokeLinejoin,
          strokeDasharray: style.strokeDasharray,
        };
      }),
    };
  });

  const sourcePage = await page.context().newPage();
  await sourcePage.goto(`file://${figmaSource}`);
  const sourcePaths = await sourcePage.evaluate(() => {
    return [...document.querySelectorAll("path")]
      .filter((item) => item.getAttribute("fill") !== "white")
      .map((item) => {
        const style = getComputedStyle(item);
        return {
          d: item.getAttribute("d"),
          fill: style.fill,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeLinecap: style.strokeLinecap,
          strokeLinejoin: style.strokeLinejoin,
          strokeDasharray: style.strokeDasharray,
        };
      });
  });
  await sourcePage.close();

  expect(embedded).toMatchObject({
    sourceHash: figmaSourceSha256,
    figmaFile: "em6HUrTKbV0h2Q6dphjUqu",
    figmaNode: "2:2",
    viewBox: "0 0 700 700",
    placement: ["-70", "-70", "140", "140"],
    overflow: "visible",
  });
  expect(embedded.paths).toEqual(sourcePaths.slice(2));
  expect(await page.locator("#ace-fancy-dash, #ace-fancy-cut").count()).toBe(0);
});

test("full Ace keeps the approved corner indexes and brand lockup", async ({
  page,
}) => {
  await page.goto(`file://${cardAsset}`);

  const lockup = await page.evaluate(() => {
    const symbol = document.querySelector("#brand-lockup-symbol");
    const wordmark = document.querySelector("#brand-lockup-name");
    const green = document.querySelector("#brand-wordmark-green feFlood");
    const bar = document.querySelector("#brand-lockup-bar");

    if (
      !(symbol instanceof SVGGElement) ||
      !(wordmark instanceof SVGImageElement) ||
      !(green instanceof SVGElement) ||
      !(bar instanceof SVGPathElement)
    ) {
      throw new Error("Ace brand lockup is incomplete");
    }

    return {
      cornerIndexCount: document.querySelectorAll('use[href="#corner-index"]')
        .length,
      symbolColour: getComputedStyle(symbol).color,
      wordmarkIsEmbedded: wordmark.href.baseVal.startsWith(
        "data:image/png;base64,",
      ),
      wordmarkColour: green.getAttribute("flood-color"),
      barColour: bar.getAttribute("stroke"),
      improvisedNameCount: document.querySelectorAll(
        "#brand-lockup-name:is(text)",
      ).length,
    };
  });

  expect(lockup).toEqual({
    cornerIndexCount: 2,
    symbolColour: "rgb(212, 184, 110)",
    wordmarkIsEmbedded: true,
    wordmarkColour: "#194C3E",
    barColour: "#D4B86E",
    improvisedNameCount: 0,
  });

  const svg = fs.readFileSync(cardAsset, "utf8");
  const embeddedWordmark = svg.match(
    /id="brand-lockup-name"[\s\S]*?href="data:image\/png;base64,([^"]+)"/,
  )?.[1];
  const approvedWordmark = fs.readFileSync(
    path.resolve("assets/brand/source/wordmark/wordmark-ink.png"),
  );

  expect(embeddedWordmark).toBeTruthy();
  expect(
    createHash("sha256")
      .update(Buffer.from(embeddedWordmark ?? "", "base64"))
      .digest("hex"),
  ).toBe(createHash("sha256").update(approvedWordmark).digest("hex"));
});

test("all four gold paths remain painted inside the black spade", async ({
  page,
}) => {
  await page.goto(`file://${cardAsset}`);

  const result = await page.evaluate(() => {
    const ornament = document.querySelector("#ace-decoration");
    const spade = document.querySelector("#ace-center-spade");
    if (
      !(ornament instanceof SVGGElement) ||
      !(spade instanceof SVGPathElement)
    ) {
      throw new Error("Ace ornament or centre spade is missing");
    }

    let escapedSamples = 0;
    const paths = [...ornament.querySelectorAll("path")];

    for (const ornamentPath of paths) {
      const length = ornamentPath.getTotalLength();
      for (let distance = 0; distance <= length; distance += 1) {
        const point = ornamentPath.getPointAtLength(distance);
        if (!spade.isPointInFill(new DOMPoint(point.x, point.y))) {
          escapedSamples += 1;
        }
      }
    }

    const paintedPaths = paths.map(
      (ornamentPath) =>
        ornamentPath.getTotalLength() > 0 &&
        getComputedStyle(ornamentPath).stroke === "rgb(212, 184, 110)",
    );

    return { escapedSamples, paintedPaths };
  });

  expect(result).toEqual({
    escapedSamples: 0,
    paintedPaths: [true, true, true, true],
  });
});
