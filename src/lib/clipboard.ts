'use client';

// Heurísticas: se QUALQUER uma for verdadeira, já vamos direto pro fallback.
function mustFallbackClipboard(): boolean {
  // 1) Em iframe (frequentemente bloqueia)
  try {
    if (window.self !== window.top) return true;
  } catch {
    // cross-origin iframe
    return true;
  }
  // 2) Contexto não-seguro (http)
  if (!window.isSecureContext) return true;

  // 3) Permissions Policy aparenta bloquear (tentativa best-effort)
  // Nem todos os browsers expõem essas APIs — trate com try/catch silencioso.
  try {
    // @ts-ignore - featurePolicy antiga; alguns browsers ainda expõem
    const fp = (document as any).featurePolicy || (document as any).permissionsPolicy;
    if (fp?.allowsFeature && fp?.allowsFeature('clipboard-write') === false) return true;
  } catch {}

  return false;
}

/**
 * Copia texto p/ área de transferência sem NUNCA lançar erro:
 * - Usa API moderna somente se estiver tudo OK
 * - Caso contrário, usa fallback (textarea + execCommand)
 * - Retorna true/false; nunca lança.
 */
export async function copyToClipboardSafe(text: string): Promise<boolean> {
  // Fallback “forçado” quando política/iframe/inseguro
  if (mustFallbackClipboard()) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  // Tenta API moderna; se falhar, cai no fallback silenciosamente
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // silencioso
  }

  // Fallback final
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
