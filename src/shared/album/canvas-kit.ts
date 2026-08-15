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
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
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
 * Logo real do app (círculo com fundo branco recortado por um clip circular —
 * `logo.webp` é um quadrado com o selo inscrito tangente às bordas, então o
 * clip no mesmo diâmetro remove os cantos brancos sem sobrar borda).
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
    ctx.textBaseline = "alphabetic";
    ctx.font = font(700, Math.round(radius * 0.26));
    ctx.fillText("TRACK BY TRACK", cx, cy);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

export function drawInstagramGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, size, size);
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(x + size * 0.78, y + size * 0.22, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawGlobeGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
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
}

/** Coração de faixa favorita: mesmos dois lóbulos + ponta do ícone da tela. */
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

/** Ícone de pior faixa: o mesmo "proibido" (Ban) usado no seletor da tela. */
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
 * "@trackbytrackapp" / "www.trackbytrack.app": divulgação do app dentro da
 * imagem. `centerX`/`dividerY`/`lineY` são do chamador — cada gerador tem seu
 * próprio canvas e sua própria margem de segurança na base.
 */
export function drawBrandFooter(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  dividerY: number,
  lineY: number,
) {
  // Linha única que some nas pontas — traço reto cortado a seco deixava duas
  // bordas duras no meio da imagem.
  const dividerWidth = 620;
  const divider = ctx.createLinearGradient(
    centerX - dividerWidth / 2,
    0,
    centerX + dividerWidth / 2,
    0,
  );
  divider.addColorStop(0, "rgba(255, 186, 8, 0)");
  divider.addColorStop(0.5, "rgba(255, 186, 8, 0.55)");
  divider.addColorStop(1, "rgba(255, 186, 8, 0)");
  ctx.fillStyle = divider;
  ctx.fillRect(centerX - dividerWidth / 2, dividerY, dividerWidth, 2);

  ctx.textBaseline = "alphabetic";

  // Handle e site na mesma linha, medidos e centralizados como um grupo: com
  // offset fixo, texto de outro tamanho sai torto.
  const glyphSize = 27;
  const glyphGap = 14;
  const itemGap = 40;
  const footerFont = font(500, 29);

  ctx.font = footerFont;
  const handleWidth = ctx.measureText(BRAND_HANDLE).width;
  const siteWidth = ctx.measureText(BRAND_SITE).width;
  const totalWidth =
    glyphSize + glyphGap + handleWidth + itemGap + glyphSize + glyphGap + siteWidth;

  let x = centerX - totalWidth / 2;
  ctx.textAlign = "left";

  drawInstagramGlyph(ctx, x, lineY - 22, glyphSize);
  x += glyphSize + glyphGap;
  ctx.fillStyle = WHITE;
  ctx.font = footerFont;
  ctx.fillText(BRAND_HANDLE, x, lineY);
  x += handleWidth + itemGap / 2;

  ctx.fillStyle = "rgba(255, 186, 8, 0.7)";
  ctx.textAlign = "center";
  ctx.fillText("·", x, lineY);
  x += itemGap / 2;

  ctx.textAlign = "left";
  drawGlobeGlyph(ctx, x, lineY - 22, glyphSize);
  x += glyphSize + glyphGap;
  ctx.fillStyle = WHITE;
  ctx.fillText(BRAND_SITE, x, lineY);
}
