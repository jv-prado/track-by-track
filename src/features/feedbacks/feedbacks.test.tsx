import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FeedbackStatusBadge } from "./components/FeedbackStatusBadge";
import { FeedbackCard } from "./components/FeedbackCard";
import type { FeedbackSummary } from "@/shared/api/types";

// Habilita suporte a act(...) no JSDOM
// @ts-expect-error test flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock do i18next para os testes
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) => {
      const translations: Record<string, string> = {
        "feedbacks.status.open": "Aguardando resposta",
        "feedbacks.status.answered": "Respondido",
        "feedbacks.status.closed": "Encerrado",
        "feedbacks.subject": "Assunto",
      };
      if (key === "feedbacks.messagesCount") {
        return params?.count === 1 ? "1 mensagem" : `${params?.count} mensagens`;
      }
      return translations[key] ?? key;
    },
    i18n: { language: "pt-BR" },
  }),
}));

describe("FeedbackStatusBadge", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("renderiza status 'open' com texto Aguardando resposta", async () => {
    await act(async () => {
      root.render(<FeedbackStatusBadge status="open" />);
    });
    expect(container.textContent).toContain("Aguardando resposta");
  });

  it("renderiza status 'answered' com texto Respondido", async () => {
    await act(async () => {
      root.render(<FeedbackStatusBadge status="answered" />);
    });
    expect(container.textContent).toContain("Respondido");
  });

  it("renderiza status 'closed' com texto Encerrado", async () => {
    await act(async () => {
      root.render(<FeedbackStatusBadge status="closed" />);
    });
    expect(container.textContent).toContain("Encerrado");
  });
});

describe("FeedbackCard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const mockFeedback: FeedbackSummary = {
    id: "f-1",
    userId: "u-1",
    userDisplayName: "João Silva",
    subject: "Problema no ranking",
    status: "open",
    messageCount: 2,
    lastMessage: "Não consigo avaliar a faixa 3.",
    lastMessageCreatedAt: "2026-08-18T10:00:00.000Z",
    createdAt: "2026-08-18T09:00:00.000Z",
    updatedAt: "2026-08-18T10:00:00.000Z",
  };

  it("renderiza os dados principais do feedback no card", async () => {
    await act(async () => {
      root.render(<FeedbackCard feedback={mockFeedback} onClick={() => {}} isAdmin={true} />);
    });

    expect(container.textContent).toContain("Problema no ranking");
    expect(container.textContent).toContain("João Silva");
    expect(container.textContent).toContain("Não consigo avaliar a faixa 3.");
    expect(container.textContent).toContain("Aguardando resposta");
    expect(container.textContent).toContain("2 mensagens");
  });
});
