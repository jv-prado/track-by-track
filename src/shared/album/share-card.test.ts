import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderShareCard, type ShareCardData } from "./share-card";

/**
 * jsdom não implementa canvas 2D — o teste não é sobre pixels, é sobre o card
 * não estourar com dado faltando (álbum sem capa, ranking com menos de 3
 * faixas) e devolver um PNG. Por isso o contexto é dublê e só registra chamadas.
 */
function stubCanvas() {
  const calls: { fillText: string[]; drawImage: number; fillRect: number } = {
    fillText: [],
    drawImage: 0,
    fillRect: 0,
  };

  const ctx = {
    fillStyle: "",
    font: "",
    textAlign: "left" as CanvasTextAlign,
    fillRect: () => {
      calls.fillRect += 1;
    },
    drawImage: () => {
      calls.drawImage += 1;
    },
    fillText: (text: string) => {
      calls.fillText.push(text);
    },
    measureText: (text: string) => ({ width: text.length * 10 }),
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

/** Imagem que nunca carrega: é o caminho de "álbum sem capa". */
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
  userDisplayName: "ana",
  topTracks: [
    { position: 1, name: "Something in the Way", score: 5 },
    { position: 2, name: "Lithium", score: 4.5 },
    { position: 3, name: "Come as You Are", score: 4 },
  ],
};

describe("renderShareCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    stubImageFailure();
  });

  it("devolve um PNG com álbum, artista e nota", async () => {
    const calls = stubCanvas();

    const blob = await renderShareCard(baseData);

    expect(blob.type).toBe("image/png");
    expect(calls.fillText).toContain("Nevermind");
    expect(calls.fillText).toContain("Nirvana");
    expect(calls.fillText).toContain("8.4");
    expect(calls.fillText).toContain("@ana");
  });

  it("não estoura sem capa — desenha o fundo de fallback", async () => {
    const calls = stubCanvas();

    await renderShareCard(baseData);

    expect(calls.drawImage).toBe(0);
    // Fundo do card + retângulo no lugar da capa.
    expect(calls.fillRect).toBe(2);
  });

  it("não estoura com menos de 3 faixas", async () => {
    const calls = stubCanvas();

    await renderShareCard({ ...baseData, topTracks: [baseData.topTracks[0]!] });

    expect(calls.fillText).toContain("Something in the Way");
    expect(calls.fillText).not.toContain("Lithium");
  });

  it("trunca nome longo em vez de vazar do card", async () => {
    const calls = stubCanvas();

    await renderShareCard({ ...baseData, albumName: "N".repeat(300) });

    expect(calls.fillText.some((text) => text.endsWith("…"))).toBe(true);
  });
});
