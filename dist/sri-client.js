import { SRIMap } from './types';

interface Window {
  SRI: {
    config: {
      [key: string]: string;
    };
  };
}

declare global {
  interface Window {
    SRI: {
      config: {
        [key: string]: string;
      };
    };
    __SRI_MAP__: SRIMap;
  }
}

export function enforceSRI(sriMap: SRIMap): void {
  // Store the SRI map in the window object for the observer to access
  window.__SRI_MAP__ = sriMap;

  // Create a MutationObserver to watch for dynamically added script tags
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'SCRIPT') {
          const script = node as HTMLScriptElement;
          const src = script.getAttribute('src');
          if (src) {
            const filename = src.split('/').pop() || '';
            const integrity = window.__SRI_MAP__[filename];
            if (integrity) {
              script.setAttribute('integrity', integrity);
              script.setAttribute('crossorigin', 'anonymous');
            }
          }
        }
      });
    });
  });

  // Start observing the document with the configured parameters
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

export class SRIEnforcer {
  private observer: MutationObserver;
  private config: { [key: string]: string };

  constructor(config: { [key: string]: string }) {
    this.config = config;
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.initialize();
  }

  private initialize(): void {
    // Start observing the document with the configured parameters
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Process existing scripts
    this.processExistingScripts();
  }

  private processExistingScripts(): void {
    const scripts = document.getElementsByTagName('script');
    for (const script of Array.from(scripts)) {
      this.processScript(script);
    }
  }

  private handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLScriptElement) {
            this.processScript(node);
          }
        }
      }
    }
  }

  private processScript(script: HTMLScriptElement): void {
    const src = script.getAttribute('src');
    if (!src) return;

    // Use only the filename for lookup
    const filename = src.split('/').pop() || src;
    const integrity = this.config[filename];
    if (integrity && !script.hasAttribute('integrity')) {
      script.setAttribute('integrity', integrity);
      script.setAttribute('crossorigin', 'anonymous');
    }
  }
}

// Initialize the SRI enforcer with the configuration
if (typeof window !== 'undefined' && window.SRI && window.SRI.config) {
  new SRIEnforcer(window.SRI.config);
} 