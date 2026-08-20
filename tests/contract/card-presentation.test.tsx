import { createElement } from "../../apps/web/node_modules/react/index.js";
import { renderToStaticMarkup } from "../../apps/web/node_modules/react-dom/server.js";
import { describe, expect, it } from "vitest";
import { PlayingCard } from "../../packages/presentation/src/index";

describe("card presentation", () => {
  it("renders illustrated classic court faces and the classic ten label", () => {
    for (const card of ["Jh", "Qd", "Kc"] as const) {
      const markup = renderToStaticMarkup(
        createElement(PlayingCard, { card, marker: "board" }),
      );
      expect(markup).toContain(`data-court-rank="${card[0]}"`);
      expect(markup).toContain("card__court");
    }

    expect(
      renderToStaticMarkup(
        createElement(PlayingCard, { card: "Ts", marker: "board" }),
      ),
    ).toContain(">10<");
  });

  it("keeps player board cards concise and keeps Four Colour free of court art", () => {
    const minimalClassic = renderToStaticMarkup(
      createElement(PlayingCard, {
        card: "Qh",
        marker: "board",
        minimal: true,
      }),
    );
    const fourColour = renderToStaticMarkup(
      createElement(PlayingCard, {
        card: "Qh",
        cardStyle: "four-colour",
        marker: "board",
      }),
    );

    expect(minimalClassic).not.toContain("data-court-rank");
    expect(fourColour).not.toContain("data-court-rank");
    expect(fourColour).toContain("card--four-colour");
  });
});
