import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normaliza telefone BR para formato 55XXXXXXXXXXX (sem +)
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const only = raw.replace(/\D/g, '');
  // adiciona DDI se faltar
  const withDDI = only.startsWith('55') ? only : `55${only}`;
  // tamanho aceitável BR: 12~13 dígitos (55 + DDD2 + 8/9)
  if (withDDI.length < 12 || withDDI.length > 13) return null;
  return withDDI;
}

export function normalizeText(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

// bem simples: substitui {{chaves}} pelo contexto
export function renderTemplate(tpl: string, ctx: Record<string, any>): string {
  return (tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) =>
    ctx[k] != null ? String(ctx[k]) : '',
  );
}
