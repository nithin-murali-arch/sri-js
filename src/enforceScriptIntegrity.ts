/**
 * Configuration interface for SRI (Subresource Integrity) settings
 */
export interface SRIConfig {
  [filename: string]: string;
}

let alreadyWrapped = false;

/**
 * Adds integrity attributes to dynamically loaded scripts based on configuration.
 * This function overrides document.createElement to intercept script creation.
 *
 * @param config - A map of filenames to their SRI hashes
 */
export function enforceScriptIntegrity(config: SRIConfig): void {
  if (typeof window === "undefined") return;
  if (alreadyWrapped) return;
  alreadyWrapped = true;

  function addIntegrityToScript(script: HTMLScriptElement): void {
    const src = script.getAttribute("src");
    if (!src) return;

    const filename = src.split("/").pop() || "";
    const integrity = config[filename];
    if (integrity && !script.hasAttribute("integrity")) {
      script.setAttribute("integrity", integrity);
      script.setAttribute("crossorigin", "anonymous");
    }
  }

  // Override the native createElement to intercept script creation
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName: string): HTMLElement {
    const element = originalCreateElement.call(document, tagName);
    if (tagName.toLowerCase() === "script") {
      addIntegrityToScript(element as HTMLScriptElement);
    }
    return element;
  };
} 