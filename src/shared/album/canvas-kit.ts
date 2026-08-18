// Blocos de desenho compartilhados entre os geradores de imagem do álbum
// (story de compartilhamento em share-card.ts, posts de Instagram em
// post-templates/*). Tudo aqui é dimension-agnostic ou recebe as dimensões
// como parâmetro — cada gerador decide o próprio canvas (tamanho, aspect
// ratio), este módulo só empresta o material visual da marca.

// Paleta oficial da marca (track-by-track/src/index.css, bloco @theme).
export const PURPLE_DARK = "#341e49"; // roxo-escuro
export const PURPLE = "#5d1f89"; // roxo
export const GOLD = "#ffba08"; // dourado
export const WHITE = "#ffffff";
export const MUTED = "#bcbcbc"; // cinza-claro
export const INK = "#01080e"; // grafite
export const HEART_RED = "#f87171"; // red-400, mesma cor do coração de faixa favorita na tela
export const BAN_GRAY = "#9ca3af"; // gray-400, mesma cor do ícone de pior faixa na tela

export const FONT_STACK = '"SF Pro Display", Inter, system-ui, sans-serif';
export function font(weight: number, size: number): string {
  return `${weight} ${size}px ${FONT_STACK}`;
}

export const BRAND_HANDLE = "@trackbytrackapp";
export const BRAND_SITE = "www.trackbytrack.app";

/**
 * Capa do álbum e avatar são buscados pelo **nosso** domínio (proxy da API):
 * imagem de outra origem sem CORS contamina o canvas e `toBlob` passa a
 * estourar `SecurityError`. `crossOrigin` continua obrigatório mesmo com o
 * proxy — sem ele o browser não pede CORS e o canvas é contaminado do mesmo jeito.
 */
const IMAGE_LOAD_TIMEOUT_MS = 10_000;

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = (result: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };

    // Teto de tempo: um request que fica pendurado (proxy sem resposta, aba em
    // background, service worker travado) nunca dispara load nem error, e sem
    // isso o `Promise.all` do gerador fica pendente pra sempre — botão de
    // compartilhar em loading eterno, sem imagem e sem erro.
    const timer = setTimeout(() => finish(null), IMAGE_LOAD_TIMEOUT_MS);

    image.crossOrigin = "anonymous";
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = src;
  });
}

/**
 * `document.fonts.ready` pode não resolver enquanto o documento ainda dispara
 * carregamentos de fonte. Esperar é só pra medir texto com a fonte certa —
 * nunca deve impedir a imagem de sair.
 */
export function fontsReady(timeoutMs = 3_000): Promise<unknown> {
  const ready = document.fonts?.ready;
  if (!ready) return Promise.resolve();
  return Promise.race([ready, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
}

/**
 * PNG do canvas com teto de tempo: `toBlob` é assíncrono e, se o callback não
 * vier, o gerador fica pendente para sempre em vez de falhar.
 */
export function toPngBlob(canvas: HTMLCanvasElement, timeoutMs = 15_000): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Tempo esgotado ao converter o canvas em PNG."));
    }, timeoutMs);

    canvas.toBlob((blob) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem."));
    }, "image/png");
  });
}

export function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

/**
 * Quebra texto em linhas. A última ganha reticências quando sobrou texto —
 * texto longo não pode empurrar o resto do layout pra fora do canvas.
 */
export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const lastIndex = lines.length - 1;
  const lastLine = lines[lastIndex];
  if (consumed < words.length && lastLine !== undefined) {
    lines[lastIndex] = truncate(ctx, `${lastLine} …`, maxWidth);
  }

  return lines;
}

/**
 * Path de retângulo arredondado montado só com `arc` — `roundRect` ainda não
 * existe em Safari antigo, e a imagem precisa sair igual em qualquer browser.
 */
export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arc(x + width - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + width, y + height - r);
  ctx.arc(x + width - r, y + height - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, y + height);
  ctx.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

/** Cartão de vidro: mesmo material do app (branco translúcido + borda 1px). */
export function drawGlassCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * A própria capa vira a atmosfera do fundo: desfocada e ampliada atrás do
 * conteúdo, cada imagem sai com a cor do álbum em vez de um fundo genérico.
 * `ctx.filter` não existe em Safari antigo — sem ele a capa entra só como
 * mancha de cor bem apagada, e os gradientes da marca seguram o resto.
 */
export function drawCoverAtmosphere(
  ctx: CanvasRenderingContext2D,
  cover: HTMLImageElement | null,
  width: number,
  height: number,
) {
  if (!cover) return;

  const supportsBlur = typeof ctx.filter === "string";
  ctx.save();
  if (supportsBlur) ctx.filter = "blur(90px)";
  ctx.globalAlpha = supportsBlur ? 0.75 : 0.3;

  const scale = Math.max(width / cover.width, height / cover.height) * 1.25;
  const w = cover.width * scale;
  const h = cover.height * scale;
  ctx.drawImage(cover, (width - w) / 2, (height - h) / 2, w, h);

  ctx.restore();
  ctx.globalAlpha = 1;
  if (supportsBlur) ctx.filter = "none";
}

/**
 * Desenha imagem recortada estilo `object-fit: cover` — preenche todo o
 * retângulo sem distorcer, cortando o excedente centralizado. Sem isso,
 * capa com aspect ratio diferente de 1:1 esticava e deformava dentro do
 * quadrado.
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

/** Fundo roxo/dourado da marca: gradientes são sempre lisos, ao contrário do grão de um PNG. */
export function drawBrandBackground(
  ctx: CanvasRenderingContext2D,
  cover: HTMLImageElement | null,
  width: number,
  height: number,
) {
  ctx.fillStyle = PURPLE_DARK;
  ctx.fillRect(0, 0, width, height);

  drawCoverAtmosphere(ctx, cover, width, height);

  // Véu roxo por cima da capa desfocada: sem ele, capa clara joga o contraste
  // do texto branco pro chão e a imagem deixa de ser reconhecível como do app.
  ctx.fillStyle = "rgba(52, 30, 73, 0.72)";
  ctx.fillRect(0, 0, width, height);

  const depth = ctx.createLinearGradient(0, 0, 0, height);
  depth.addColorStop(0, "rgba(1, 8, 14, 0.72)");
  depth.addColorStop(0.42, "rgba(1, 8, 14, 0.12)");
  depth.addColorStop(1, "rgba(1, 8, 14, 0.86)");
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, width, height);

  // Brilho roxo atrás da capa — dá volume ao centro sem competir com a arte.
  const center = ctx.createRadialGradient(
    width / 2,
    height * 0.44,
    0,
    width / 2,
    height * 0.44,
    700,
  );
  center.addColorStop(0, "rgba(93, 31, 137, 0.55)");
  center.addColorStop(1, "rgba(93, 31, 137, 0)");
  ctx.fillStyle = center;
  ctx.fillRect(0, 0, width, height);

  for (const edgeX of [-140, width + 140]) {
    const glow = ctx.createRadialGradient(edgeX, height / 2, 0, edgeX, height / 2, 820);
    glow.addColorStop(0, "rgba(255, 186, 8, 0.26)");
    glow.addColorStop(1, "rgba(255, 186, 8, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Logo oficial do app. Contain-fit em vez de forçar quadrado: o lockup atual
 * (ícone + wordmark) é bem mais largo que alto, e esticar num quadrado
 * deformava o desenho.
 */
export function drawBrandLogo(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  cx: number,
  cy: number,
  radius: number,
) {
  if (!image) {
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font(700, Math.round(radius * 0.26));
    ctx.fillText("TRACK BY TRACK", cx, cy);
    return;
  }

  const box = radius * 2;
  const scale = Math.min(box / image.width, box / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, cx - width / 2, cy - height / 2, width, height);
}

export function drawInstagramGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.2;
  const r = 6;
  roundedRectPath(ctx, x, y, size, size, r);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.26, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(x + size * 0.76, y + size * 0.24, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGlobeGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + size, cy);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.45, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Coração de faixa favorita: contorno fino em dourado. */
export function drawOutlineHeartGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const r = size / 4;
  const top = cy - size / 4;
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx - r, top, r, Math.PI, 0);
  ctx.arc(cx + r, top, r, Math.PI, 0);
  ctx.lineTo(cx + r * 2, top + r * 0.5);
  ctx.lineTo(cx, cy + size * 0.46);
  ctx.lineTo(cx - r * 2, top + r * 0.5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Ícone de pior faixa: círculo com barra diagonal em contorno dourado. */
export function drawOutlineBanGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const r = size / 2;
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const offset = r * Math.SQRT1_2;
  ctx.beginPath();
  ctx.moveTo(cx - offset, cy - offset);
  ctx.lineTo(cx + offset, cy + offset);
  ctx.stroke();
  ctx.restore();
}

/** Coração de faixa favorita preenchido. */
export function drawHeartGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const r = size / 4;
  const top = cy - size / 4;
  ctx.fillStyle = HEART_RED;
  ctx.beginPath();
  ctx.arc(cx - r, top, r, Math.PI, 0);
  ctx.arc(cx + r, top, r, Math.PI, 0);
  ctx.lineTo(cx + r * 2, top + r * 0.4);
  ctx.lineTo(cx, cy + size / 2);
  ctx.lineTo(cx - r * 2, top + r * 0.4);
  ctx.closePath();
  ctx.fill();
}

/** Ícone de pior faixa preenchido. */
export function drawBanGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const r = size / 2;
  ctx.strokeStyle = BAN_GRAY;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const offset = r * Math.SQRT1_2;
  ctx.beginPath();
  ctx.moveTo(cx - offset, cy - offset);
  ctx.lineTo(cx + offset, cy + offset);
  ctx.stroke();
}

/**
 * Rodapé elegante com logo do Instagram, handle, divisor vertical e site oficial.
 */
export function drawBrandFooter(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  _dividerY: number,
  lineY: number,
) {
  ctx.save();
  ctx.textBaseline = "middle";

  const glyphSize = 26;
  const glyphGap = 12;
  const itemGap = 32;
  const footerFont = font(500, 24);

  ctx.font = footerFont;
  const handleWidth = ctx.measureText(BRAND_HANDLE).width;
  const siteWidth = ctx.measureText(BRAND_SITE).width;
  const pipeWidth = ctx.measureText("|").width;
  const totalWidth =
    glyphSize + glyphGap + handleWidth + itemGap + pipeWidth + itemGap + glyphSize + glyphGap + siteWidth;

  let x = centerX - totalWidth / 2;

  // Instagram glyph
  ctx.textAlign = "left";
  drawInstagramGlyph(ctx, x, lineY - glyphSize / 2, glyphSize);
  x += glyphSize + glyphGap;

  // Handle
  ctx.fillStyle = WHITE;
  ctx.font = footerFont;
  ctx.fillText(BRAND_HANDLE, x, lineY);
  x += handleWidth + itemGap;

  // Vertical Divider
  ctx.fillStyle = "rgba(255, 186, 8, 0.55)";
  ctx.font = font(300, 24);
  ctx.fillText("|", x, lineY - 1);
  x += pipeWidth + itemGap;

  // Globe glyph
  drawGlobeGlyph(ctx, x, lineY - glyphSize / 2, glyphSize);
  x += glyphSize + glyphGap;

  // Site
  ctx.fillStyle = WHITE;
  ctx.font = footerFont;
  ctx.fillText(BRAND_SITE, x, lineY);

  ctx.restore();
}
