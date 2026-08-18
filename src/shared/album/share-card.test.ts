import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderShareCard, type ShareCardData } from "./share-card";

/**
 * jsdom não implementa canvas 2D — o teste não é sobre pixels, é sobre o card
 * não estourar com dado faltando (capa/avatar que falham ao carregar,
 * favorita/pior faixa ausentes) e devolver um PNG. Por isso o contexto é
 * dublê e só registra chamadas; fundo/logo/rodapé de marca são 100% desenho
 * (gradientes, arcos, texto em curva), então o stub cobre toda a API usada.
 */
function stubCanvas() {
  const calls: {
    fillText: string[];
    drawImage: number;
    fillRect: number;
    clip: number;
  } = {
    fillText: [],
    drawImage: 0,
    fillRect: 0,
    clip: 0,
  };

  const gradient = { addColorStop: () => {} };

  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    fillRect: () => {
      calls.fillRect += 1;
    },
    strokeRect: () => {},
    drawImage: () => {
      calls.drawImage += 1;
    },
    fillText: (text: string) => {
      calls.fillText.push(text);
    },
    measureText: (text: string) => ({ width: text.length * 10 }),
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    arc: () => {},
    ellipse: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    clip: () => {
      calls.clip += 1;
    },
    translate: () => {},
    rotate: () => {},
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  };

  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toBlob: (callback: (blob: Blob | null) => void) => {
      callback(new Blob(["fake-png"], { type: "image/png" }));
    },
  };

  vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
    if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
    return {} as HTMLElement;
  }) as typeof document.createElement);

  return calls;
}

/** Imagem que nunca carrega: é o caminho de "capa/avatar ausentes". */
function stubImageFailure() {
  vi.stubGlobal(
    "Image",
    class {
      crossOrigin = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onerror?.(), 0);
      }
    },
  );
}

const baseData: ShareCardData = {
  albumId: "album-1",
  albumName: "Nevermind",
  artist: "Nirvana",
  averageScore: 8.4,
  isScoreComplete: true,
  userDisplayName: "ana",
  ratedAtLabel: "14 de ago. de 2026",
  favoriteTrack: { label: "Faixa favorita", name: "Something in the Way" },
  worstTrack: { label: "Faixa menos favorita", name: "Lithium" },
};

describe("renderShareCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubImageFailure();
  });

  it("devolve um PNG com álbum, artista, nota, usuário e data", async () => {
    const calls = stubCanvas();

    const blob = await renderShareCard(baseData);

    expect(blob.type).toBe("image/png");
    expect(calls.fillText).toContain("NEVERMIND");
    expect(calls.fillText).toContain("NIRVANA");
    expect(calls.fillText).toContain("8.4");
    expect(calls.fillText).toContain("ANA");
    expect(calls.fillText).toContain("14 DE AGO. DE 2026");
    expect(calls.fillText).toContain("/10");
  });

  it("desenha o rodapé de marca (@trackbytrackapp / www.trackbytrack.app)", async () => {
    const calls = stubCanvas();

    await renderShareCard(baseData);

    expect(calls.fillText).toContain("@trackbytrackapp");
    expect(calls.fillText).toContain("www.trackbytrack.app");
  });

  it("desenha faixa favorita e faixa menos favorita quando presentes", async () => {
    const calls = stubCanvas();

    await renderShareCard(baseData);

    expect(calls.fillText).toContain("FAIXA FAVORITA");
    expect(calls.fillText).toContain("Something in the Way");
    expect(calls.fillText).toContain("FAIXA MENOS FAVORITA");
    expect(calls.fillText).toContain("Lithium");
  });

  it("com texto de review, desenha o card de citação", async () => {
    const calls = stubCanvas();

    await renderShareCard({ ...baseData, reviewText: "Um álbum ousado, épico e consistente." });

    expect(calls.fillText).toContain("Um álbum ousado, épico e consistente.");
    expect(calls.fillText).toContain("NIRVANA");
  });

  it("quebra nome de álbum longo em linhas em vez de cortar na primeira", async () => {
    const calls = stubCanvas();

    await renderShareCard({ ...baseData, albumName: "Sargento Pimenta ".repeat(8).trim() });

    const nameLines = calls.fillText.filter((text) => text.startsWith("SARGENTO"));
    expect(nameLines.length).toBeGreaterThan(1);
  });

  it("corta review longa em vez de empurrar o rodapé de marca pra fora do card", async () => {
    const calls = stubCanvas();

    await renderShareCard({ ...baseData, reviewText: "palavra ".repeat(400) });

    expect(calls.fillText.some((text) => text.endsWith("…"))).toBe(true);
  });

  it("não estoura sem faixa favorita nem pior faixa", async () => {
    const calls = stubCanvas();

    await renderShareCard({ ...baseData, favoriteTrack: undefined, worstTrack: undefined });

    expect(calls.fillText).not.toContain("Faixa favorita");
    expect(calls.fillText).not.toContain("Pior faixa");
  });

  it("não estoura sem capa e sem avatar — desenha os fallbacks", async () => {
    const calls = stubCanvas();

    await renderShareCard(baseData);

    expect(calls.drawImage).toBe(0);
    // Fallback da capa (retângulo) + fallback do avatar (retângulo dentro do clip).
    expect(calls.fillRect).toBeGreaterThanOrEqual(2);
    // Círculo do avatar sempre recortado, com ou sem foto.
    expect(calls.clip).toBe(1);
  });

  it("desenha a inicial do usuário quando não há foto de avatar", async () => {
    const calls = stubCanvas();

    await renderShareCard(baseData);

    expect(calls.fillText).toContain("A");
  });

  it("trunca nome longo em vez de vazar do card", async () => {
    const calls = stubCanvas();

    await renderShareCard({ ...baseData, albumName: "N".repeat(300) });

    expect(calls.fillText.some((text) => text.endsWith("…"))).toBe(true);
  });

  it("desenha a imagem de fundo quando carregada com sucesso", async () => {
    vi.stubGlobal(
      "Image",
      class {
        crossOrigin = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          setTimeout(() => this.onload?.(), 0);
        }
      },
    );
    const calls = stubCanvas();

    await renderShareCard(baseData);

    expect(calls.drawImage).toBeGreaterThanOrEqual(1);
  });
});
