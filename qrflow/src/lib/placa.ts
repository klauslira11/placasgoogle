import fs from "node:fs";
import path from "node:path";
import Jimp from "jimp";
import { generateQrPngBuffer } from "./qr";
import { formatPlacaNumber } from "./placa-number";

const CANDIDATE_TEMPLATES = [
  "public/templates/placa-padrao.png",
  "public/templates/placa-padrao.jpg",
  "public/templates/placa-padrao.jpeg",
  "public/templates/placa.png",
];

export function findTemplatePath(): string | null {
  for (const rel of CANDIDATE_TEMPLATES) {
    const abs = path.join(process.cwd(), rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

export type RedBox = { x: number; y: number; w: number; h: number };

function isRed(r: number, g: number, b: number): boolean {
  // Vermelho do placeholder: R alto, G e B baixos
  return r >= 170 && g <= 130 && b <= 130 && r - g > 50 && r - b > 40;
}

export function detectRedBox(image: Jimp): RedBox | null {
  const { width, height } = image.bitmap;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  let count = 0;

  // Ignora faixas arco-íris do topo/rodapé e logo do Google (tem letras vermelhas):
  // placeholder fica no miolo-esquerdo da arte
  const yStart = Math.round(height * 0.45);
  const yEnd = Math.round(height * 0.85);
  const xEnd = Math.round(width * 0.65);
  // scan a cada 3px por performance
  const step = 3;
  for (let y = yStart; y < yEnd; y += step) {
    for (let x = 0; x < xEnd; x += step) {
      const idx = (y * width + x) * 4;
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      if (isRed(r, g, b)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        count++;
      }
    }
  }

  if (count < 500 || maxX < 0) return null;

  // Ajusta pelo step para não cortar borda
  minX = Math.max(0, minX - step);
  minY = Math.max(0, minY - step);
  maxX = Math.min(width - 1, maxX + step);
  maxY = Math.min(height - 1, maxY + step);

  let w = maxX - minX;
  let h = maxY - minY;

  // Validação de sanidade: deve ser quadrado aproximado e área relevante (5% a 60% da imagem)
  const ratio = w / h;
  const areaPct = (w * h) / (width * height);
  if (ratio < 0.7 || ratio > 1.4) return null;
  if (areaPct < 0.02 || areaPct > 0.6) return null;

  return { x: minX, y: minY, w, h };
}

function isStarRed(r: number, g: number, b: number): boolean {
  // "***" vermelhos do rodapé (limiar mais solto que o bloco do QR)
  return r >= 150 && g <= 130 && b <= 130 && r - g > 40;
}

/**
 * Localiza o marcador "***" vermelho no rodapé.
 * Medido no template 1181x1771: x 551-635, y 1634-1655.
 */
export function detectEstrelasBox(image: Jimp): RedBox | null {
  const { width, height } = image.bitmap;
  const yStart = Math.round(height * 0.82);
  const yEnd = Math.round(height * 0.955);
  const xStart = Math.round(width * 0.2);
  const xEnd = Math.round(width * 0.8);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  let count = 0;
  const step = 2;
  for (let y = yStart; y < yEnd; y += step) {
    for (let x = xStart; x < xEnd; x += step) {
      const idx = (y * width + x) * 4;
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      if (isStarRed(r, g, b)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        count++;
      }
    }
  }
  if (count < 80 || maxX < 0) return null;
  minX = Math.max(0, minX - step);
  minY = Math.max(0, minY - step);
  maxX = Math.min(width - 1, maxX + step);
  maxY = Math.min(height - 1, maxY + step);
  const w = maxX - minX;
  const h = maxY - minY;
  // sanidade: marcador pequeno e baixo (largura < 40% da arte, altura < 8%)
  if (w > width * 0.4 || h > height * 0.08 || w < 8 || h < 5) return null;
  return { x: minX, y: minY, w, h };
}

function fallbackEstrelasBox(width: number, height: number): RedBox {
  // Proporcional ao medido no template 1181x1771
  return {
    x: Math.round((width * 551) / 1181),
    y: Math.round((height * 1634) / 1771),
    w: Math.round((width * 84) / 1181),
    h: Math.round((height * 21) / 1771),
  };
}

function fallbackBox(width: number, height: number): RedBox {
  // Estimativa baseada na arte enviada (bloco vermelho lado esquerdo):
  // x ~4% a 48%, y ~52% a 77% — ajustado para cobrir também o pontilhado
  const x = Math.round(width * 0.04);
  const y = Math.round(height * 0.515);
  const w = Math.round(width * 0.45);
  const h = w; // quadrado
  return { x, y, w, h };
}

// Fonte bitmap 5x7 embutida (sem arquivos externos): garante que a numeração
// sempre seja desenhada mesmo se Jimp.loadFont falhar no build de produção.
// Cada dígito = 7 linhas de 5 bits.
const DIGITS_5X7: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

/**
 * Renderiza texto numérico (ex "001") como imagem Jimp preta no branco,
 * sem depender de arquivos de fonte. Último recurso / fallback garantido.
 */
async function renderNumberBitmapLayer(text: string, targetH: number, maxW: number): Promise<Jimp> {
  const chars = String(text).split("").filter((c) => DIGITS_5X7[c]);
  const safe = chars.length > 0 ? chars : ["0"];
  const colsPerDigit = 5;
  const gapCols = 1;
  const totalCols = safe.length * colsPerDigit + (safe.length - 1) * gapCols;
  let scale = Math.max(2, Math.floor(targetH / 7));
  // respeita largura máxima
  while (scale > 1 && totalCols * scale > maxW) scale--;
  const pad = Math.max(4, scale);
  const lw = totalCols * scale + pad * 2;
  const lh = 7 * scale + pad * 2;
  const layer = await new Jimp(lw, lh, 0xffffffff);
  const black = 0x000000ff;
  safe.forEach((ch, di) => {
    const glyph = DIGITS_5X7[ch];
    const x0 = pad + di * (colsPerDigit + gapCols) * scale;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "1") {
          const px = x0 + col * scale;
          const py = pad + row * scale;
          // bloco scale x scale preto
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              layer.setPixelColor(black, px + dx, py + dy);
            }
          }
        }
      }
    }
  });
  return layer;
}

export async function composePlacaBuffer(qrText: string, placaNum?: number | string): Promise<Buffer> {
  const templatePath = findTemplatePath();
  if (!templatePath) {
    throw new Error(
      "Template não encontrado. Salve a Imagem 1 como public/templates/placa-padrao.png"
    );
  }

  const template = await Jimp.read(templatePath);
  const W = template.bitmap.width;
  const H = template.bitmap.height;

  // Detecta o "***" ANTES de qualquer composite, no template pristino
  const starsDetected = detectEstrelasBox(template) ?? fallbackEstrelasBox(W, H);
  const numCx = starsDetected.x + starsDetected.w / 2;
  const numCy = starsDetected.y + starsDetected.h / 2;

  const box = detectRedBox(template) ?? fallbackBox(W, H);
  // Expande ~1.5% para cobrir o contorno pontilhado preto
  const pad = Math.round(Math.max(box.w, box.h) * 0.025);
  const bx = Math.max(0, box.x - pad);
  const by = Math.max(0, box.y - pad);
  const bw = Math.min(W - bx, box.w + pad * 2);
  const bh = Math.min(H - by, box.h + pad * 2);
  const side = Math.min(bw, bh);

  // QR sempre preto no branco na placa = máxima leitura impressa
  const qrBuf = await generateQrPngBuffer(qrText, {
    fgColor: "#000000",
    bgColor: "#ffffff",
    margin: 1,
    size: 1000,
    errorLevel: "M",
    transparentBg: false,
  });
  const qrImg = await Jimp.read(qrBuf);
  qrImg.resize(side, side);

  // Cobre o vermelho + pontilhado com branco e cola o QR na mesma posição
  // Usa um quadrado branco de fundo para garantir contraste
  const white = await new Jimp(side, side, 0xffffffff);
  white.composite(qrImg, 0, 0);
  template.composite(white, bx, by);

  // Número da placa no rodapé: cobre o "***" vermelho com branco
  // e escreve o número sequencial POR CIMA DE TUDO (última operação).
  if (placaNum !== undefined && placaNum !== null && String(placaNum).trim() !== "") {
    const numeroStr =
      typeof placaNum === "number" ? formatPlacaNumber(placaNum) : String(placaNum).trim();
    const cx = numCx;
    const cy = numCy;
    // altura-alvo ~1.8% da altura (≈1/3 do tamanho anterior)
    const targetH = Math.max(12, Math.round(H * 0.0183));
    const maxW = Math.round(W * 0.5);

    let layer: Jimp | null = null;
    // 1) tenta fonte Jimp (tipografia mais bonita)
    try {
      const font = (await Jimp.loadFont(
        (Jimp as any).FONT_SANS_128_BLACK ?? Jimp.FONT_SANS_64_BLACK
      ).catch(() => Jimp.loadFont(Jimp.FONT_SANS_64_BLACK))) as any;
      const tw = Jimp.measureText(font, numeroStr);
      const th0 = Jimp.measureTextHeight(font, numeroStr, Math.round(W * 0.6));
      const tmp = await new Jimp(
        Math.max(10, tw + 60),
        Math.max(10, th0 + 60),
        0xffffffff
      );
      // fake-bold: imprime 4x com 1-2px de deslocamento para engrossar
      tmp.print(font, 30, 30, numeroStr);
      try {
        tmp.print(font, 32, 30, numeroStr);
        tmp.print(font, 30, 32, numeroStr);
      } catch {
        // ignora
      }
      try {
        (tmp as any).autocrop(0.02, false);
      } catch {
        // mantém camada cheia se autocrop falhar
      }
      let scale = targetH / tmp.bitmap.height;
      if (tmp.bitmap.width * scale > maxW) {
        scale = maxW / tmp.bitmap.width;
      }
      tmp.resize(
        Math.max(8, Math.round(tmp.bitmap.width * scale)),
        Math.max(8, Math.round(tmp.bitmap.height * scale))
      );
      layer = tmp;
    } catch {
      layer = null;
    }

    // 2) fallback garantido: bitmap embutido (sempre funciona, sem arquivos)
    if (!layer && /^[\d\s-]+$/.test(numeroStr)) {
      try {
        const digitsOnly = numeroStr.replace(/[^\d]/g, "") || numeroStr;
        layer = await renderNumberBitmapLayer(digitsOnly, targetH, maxW);
      } catch {
        layer = null;
      }
    }

    // 3) se ainda assim falhar, ao menos tenta o bitmap com "0"
    if (!layer) {
      try {
        layer = await renderNumberBitmapLayer(
          String(numeroStr).replace(/[^\d]/g, "") || "0",
          targetH,
          maxW
        );
      } catch {
        layer = null;
      }
    }

    if (layer) {
      // Branco mínimo: união do "***" (+margem fina) com o retângulo do número.
      // Cobre só o suficiente para apagar os asteriscos, sem invadir o resto.
      // Esta é SEMPRE a última operação: número fica visível por cima de tudo.
      // Não invade a faixa colorida do rodapé (reserva ~12px na borda inferior).
      const margin = 6;
      const sx0 = Math.max(0, Math.floor(starsDetected.x - margin));
      const sy0 = Math.max(0, Math.floor(starsDetected.y - margin));
      const sx1 = Math.min(W, Math.ceil(starsDetected.x + starsDetected.w + margin));
      const sy1 = Math.min(H, Math.ceil(starsDetected.y + starsDetected.h + margin));
      // número centralizado no "***", sem sair da imagem
      let lx = Math.round(cx - layer.bitmap.width / 2);
      let ly = Math.round(cy - layer.bitmap.height / 2);
      lx = Math.max(0, Math.min(lx, W - layer.bitmap.width));
      ly = Math.max(0, Math.min(ly, H - layer.bitmap.height));
      const maxBottom = H - 12;
      const coverX = Math.min(sx0, lx);
      let coverY = Math.min(sy0, ly);
      const coverX1 = Math.max(sx1, lx + layer.bitmap.width);
      let coverY1 = Math.max(sy1, ly + layer.bitmap.height);
      if (coverY1 > maxBottom) {
        const overflow = coverY1 - maxBottom;
        coverY = Math.max(0, coverY - overflow);
        coverY1 = maxBottom;
        // mantém o número dentro da cobertura após o deslocamento
        ly = Math.max(coverY, Math.min(ly, coverY1 - layer.bitmap.height));
      }
      const cw = coverX1 - coverX;
      const ch = coverY1 - coverY;
      const cover = await new Jimp(cw, ch, 0xffffffff);
      template.composite(cover, coverX, coverY);
      template.composite(layer, lx, ly);
    } else {
      // último recurso: ao menos esconde o "***" com branco
      const cover = await new Jimp(starsDetected.w + 28, starsDetected.h + 24, 0xffffffff);
      template.composite(
        cover,
        Math.round(Math.min(Math.max(0, cx - cover.bitmap.width / 2), W - cover.bitmap.width)),
        Math.round(Math.min(Math.max(0, cy - cover.bitmap.height / 2), H - cover.bitmap.height))
      );
    }
  }

  return template.getBufferAsync(Jimp.MIME_PNG);
}
