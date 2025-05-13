/**
 * Configuration interface for SRI (Subresource Integrity) settings
 */
interface SRIConfig {
  [filename: string]: string;
}

/**
 * Extended Window interface that includes SRI configuration
 */
interface SRIWindow extends Window {
  SRI?: {
    config: SRIConfig;
  };
}

// Extend the global Window interface
declare global {
  interface Window {
    SRI?: {
      config: SRIConfig;
    };
  }
}

/**
 * Adds integrity attributes to dynamically loaded scripts based on configuration.
 * This function:
 * 1. Sets up a MutationObserver to watch for new script tags
 * 2. Processes existing script tags
 * 3. Adds integrity and crossorigin attributes when matching hashes are found
 *
 * @param config - A map of filenames to their SRI hashes
 */
export function enforceScriptIntegrity(config: SRIConfig): void {
  if (typeof window === "undefined") return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === "SCRIPT") {
          const script = node as HTMLScriptElement;
          const src = script.getAttribute("src");
          if (!src) return;

          const filename = src.split("/").pop() || "";
          const integrity = config[filename];
          if (integrity && !script.hasAttribute("integrity")) {
            script.setAttribute("integrity", integrity);
            script.setAttribute("crossorigin", "anonymous");
          }
        }
      });
    });
  });

  // Start observing the document for changes
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Process existing scripts
  document.querySelectorAll("script[src]").forEach((script) => {
    const src = script.getAttribute("src");
    if (!src) return;

    const filename = src.split("/").pop() || src;
    const integrity = config[filename];
    if (integrity && !script.hasAttribute("integrity")) {
      script.setAttribute("integrity", integrity);
      script.setAttribute("crossorigin", "anonymous");
    }
  });
}

// Initialize if configuration is available
if (typeof window !== "undefined") {
  if (window.SRI?.config) {
    enforceScriptIntegrity(window.SRI.config);
  }
}
