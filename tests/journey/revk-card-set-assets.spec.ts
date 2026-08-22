import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const suits = ["S", "H", "C", "D"];
const expectedFaces = ranks.flatMap((rank) =>
  suits.map((suit) => `${rank}${suit}.svg`),
);

const sets = {
  classic: path.resolve("assets/skins/revk-card-sets/classic/faces"),
  "four-colour": path.resolve("assets/skins/revk-card-sets/four-colour/faces"),
};

const customAce = path.resolve(
  "assets/skins/classic-revk/ace-of-spades-our-poker-table.svg",
);

test("both review sets contain exactly 52 self-contained SVG faces", async ({
  page,
}) => {
  for (const [setName, directory] of Object.entries(sets)) {
    const files = fs
      .readdirSync(directory)
      .filter((item) => item.endsWith(".svg"))
      .sort();
    expect(files, setName).toEqual([...expectedFaces].sort());

    for (const file of files) {
      const asset = path.join(directory, file);
      const source = fs.readFileSync(asset, "utf8");
      expect(source, `${setName}/${file} script`).not.toMatch(/<script\b/i);
      expect(source, `${setName}/${file} foreignObject`).not.toMatch(
        /<foreignObject\b/i,
      );
      expect(source, `${setName}/${file} remote resource`).not.toMatch(
        /(?:href|src)=["']https?:\/\//i,
      );

      await page.goto(`file://${asset}`);
      expect(await page.locator("svg:root").count(), `${setName}/${file}`).toBe(
        1,
      );
      expect(await page.locator("svg:root").getAttribute("viewBox"), file).toBe(
        "-120 -168 240 336",
      );
    }
  }
});

test("the corrected custom Ace of Spades replaces AS in both sets", () => {
  const customHash = createHash("sha256")
    .update(fs.readFileSync(customAce))
    .digest("hex");

  for (const [setName, directory] of Object.entries(sets)) {
    const setHash = createHash("sha256")
      .update(fs.readFileSync(path.join(directory, "AS.svg")))
      .digest("hex");
    expect(setHash, setName).toBe(customHash);
  }
});

test("the approved Ace has a pointed head and no outer dotted outline", async ({
  page,
}) => {
  await page.goto(`file://${customAce}`);

  expect(await page.locator("#ace-fancy-dash, #ace-fancy-cut").count()).toBe(0);
  const head = await page.locator("#ace-center-spade").evaluate((item) => {
    if (!(item instanceof SVGPathElement))
      throw new Error("Centre spade is missing");
    const box = item.getBBox();
    const firstPoint = item.getPointAtLength(0);
    return { boxY: box.y, firstX: firstPoint.x, firstY: firstPoint.y };
  });

  expect(head.boxY).toBeLessThan(7);
  expect(head.firstX).toBe(350);
  expect(head.firstY).toBeCloseTo(6.66669, 4);
});

test("Classic and Four Colour use their intended suit palettes", async ({
  page,
}) => {
  const visibleColours = async (asset: string) => {
    await page.goto(`file://${asset}`);
    return page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!(svg instanceof SVGSVGElement)) throw new Error("SVG is missing");
      return [...svg.querySelectorAll("path")]
        .flatMap((item) => {
          const style = getComputedStyle(item);
          return [style.fill, style.stroke];
        })
        .map((item) => item.toLowerCase());
    });
  };

  const expected = {
    classic: {
      S: "rgb(0, 0, 0)",
      H: "rgb(255, 0, 0)",
      C: "rgb(0, 0, 0)",
      D: "rgb(255, 0, 0)",
    },
    "four-colour": {
      S: "rgb(0, 0, 0)",
      H: "rgb(255, 0, 0)",
      C: "rgb(0, 128, 0)",
      D: "rgb(0, 0, 255)",
    },
  } as const;

  for (const [setName, palette] of Object.entries(expected)) {
    for (const [suit, colour] of Object.entries(palette)) {
      const colours = await visibleColours(
        path.join(sets[setName as keyof typeof sets], `A${suit}.svg`),
      );
      expect(colours, `${setName}/${suit}`).toContain(colour);
    }
  }
});

test("court cards remain fully vector and substantially illustrated", () => {
  for (const [setName, directory] of Object.entries(sets)) {
    for (const rank of ["J", "Q", "K"]) {
      for (const suit of suits) {
        const source = fs.readFileSync(
          path.join(directory, `${rank}${suit}.svg`),
          "utf8",
        );
        expect(source, `${setName}/${rank}${suit} raster`).not.toMatch(
          /<image\b/i,
        );
        expect(
          source.length,
          `${setName}/${rank}${suit} illustration`,
        ).toBeGreaterThan(20_000);
      }
    }
  }
});
