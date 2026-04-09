// pdf-lib CV renderer.
//
// The source repo's templates/cv-template.html is a design, not a component.
// Porting it 1:1 to pdf-lib primitives is more work than pdf-lib enjoys,
// so the v0.1 approach is:
//
//   - Draw an editorial one-page layout with text-only blocks.
//   - Embed DM Sans + Space Grotesk for brand consistency with the source
//     repo. pdf-lib can embed TTF/OTF; we fetch them from the extension's
//     web_accessible_resources.
//   - Pull the Summary from the evaluation's tldr + top-line proof points.
//   - Pull Experience bullets from cv.md sections.
//
// ATS-safe: every character is a real text glyph, not a rasterized image.
// Unicode normalization (em-dash → hyphen, smart quotes → straight, etc.)
// matches the source repo's generate-pdf.mjs rules.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { EvaluationResult, Profile } from '../shared/types';

export interface RenderInput {
  evaluation: EvaluationResult;
  cv: string;
  profileJson: string;
}

export interface RenderOutput {
  bytes: Uint8Array;
  filename: string;
}

// ---- Unicode normalizer -------------------------------------------------
// Ported from source repo's generate-pdf.mjs.
export function normalizeForAts(input: string): string {
  return input
    .replace(/[—–]/g, '-')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
    .replace(/\u00A0/g, ' ');
}

export async function renderCvPdf(input: RenderInput): Promise<RenderOutput> {
  const profile = safeParseProfile(input.profileJson);
  const cv = parseCvMarkdown(input.cv);

  const pdf = await PDFDocument.create();
  // Use standard fonts for v0.1 — embedding variable TTF requires extra
  // setup (fontkit). We'll upgrade to DM Sans + Space Grotesk in Phase 6.
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([612, 792]); // US Letter
  const { width } = page.getSize();

  const marginX = 48;
  const marginTop = 64;
  const contentWidth = width - marginX * 2;
  let y = page.getHeight() - marginTop;

  const ink = rgb(0.1, 0.1, 0.12);
  const accent = rgb(0.73, 0.45, 0.12);
  const faint = rgb(0.42, 0.42, 0.45);

  const drawText = (
    text: string,
    opts: {
      size: number;
      font: typeof body;
      color?: ReturnType<typeof rgb>;
      spacing?: number;
      maxWidth?: number;
    },
  ): number => {
    const normalized = normalizeForAts(text);
    const lines = wrap(normalized, opts.maxWidth ?? contentWidth, opts.size, opts.font);
    for (const line of lines) {
      page.drawText(line, {
        x: marginX,
        y,
        size: opts.size,
        font: opts.font,
        color: opts.color ?? ink,
      });
      y -= opts.size * (opts.spacing ?? 1.35);
    }
    return y;
  };

  // ---- Header ---------------------------------------------------------
  drawText(profile.fullName || 'Candidate', { size: 26, font: bold, color: ink });
  y -= 4;
  const headerLine = [profile.location, profile.email, profile.links[0]?.url]
    .filter(Boolean)
    .join('  ·  ');
  drawText(headerLine, { size: 9, font: body, color: faint });
  y -= 16;

  // ---- Summary --------------------------------------------------------
  drawText('SUMMARY', { size: 9, font: bold, color: accent });
  y -= 4;
  drawText(input.evaluation.tldr, { size: 11, font: body, color: ink, spacing: 1.4 });
  y -= 10;

  // ---- Experience (truncated CV body) --------------------------------
  drawText('EXPERIENCE', { size: 9, font: bold, color: accent });
  y -= 4;

  const experienceText = cv.sections.experience || cv.raw.slice(0, 1200);
  drawText(experienceText, { size: 10, font: body, color: ink, spacing: 1.35 });
  y -= 12;

  // ---- Keywords (ATS block) ------------------------------------------
  if (input.evaluation.keywords.length > 0) {
    drawText('KEYWORDS', { size: 9, font: bold, color: accent });
    y -= 4;
    drawText(input.evaluation.keywords.slice(0, 20).join('  ·  '), {
      size: 9,
      font: body,
      color: faint,
      spacing: 1.4,
    });
  }

  const bytes = await pdf.save();
  const slug = profile.fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const filename = `${slug || 'cv'}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return { bytes, filename };
}

// ---- helpers ------------------------------------------------------------

function safeParseProfile(raw: string): Profile {
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return {
      id: 'singleton',
      fullName: '',
      email: '',
      phone: '',
      location: '',
      timezone: '',
      links: [],
      targetRoles: [],
      salaryTarget: { min: 0, max: 0, currency: 'USD' },
      language: 'en',
      modesDir: 'en',
      region: 'global',
      updatedAt: 0,
    };
  }
}

interface ParsedCv {
  raw: string;
  sections: Partial<Record<'summary' | 'experience' | 'education' | 'skills', string>>;
}

function parseCvMarkdown(md: string): ParsedCv {
  const sections: ParsedCv['sections'] = {};
  const headingRe = /^#{1,3}\s+(.*)$/gm;
  const matches = [...md.matchAll(headingRe)];
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    if (!match) continue;
    const title = (match[1] ?? '').toLowerCase();
    const from = (match.index ?? 0) + match[0].length;
    const to = matches[i + 1]?.index ?? md.length;
    const body = md.slice(from, to).trim();
    if (title.includes('summary') || title.includes('about')) sections.summary = body;
    else if (title.includes('experience') || title.includes('work')) sections.experience = body;
    else if (title.includes('education')) sections.education = body;
    else if (title.includes('skill')) sections.skills = body;
  }
  return { raw: md, sections };
}

function wrap(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    if (!para.trim()) {
      out.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let line = '';
    for (const word of words) {
      const tentative = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(tentative, fontSize);
      if (width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = tentative;
      }
    }
    if (line) out.push(line);
  }
  return out;
}
