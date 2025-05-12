
interface SRIWindow extends Window {
  SRI?: {
    config: {
      [key: string]: string;
    };
  };
}

const win = window as SRIWindow;

// Initialize the SRI enforcer with the configuration
if (win.SRI && win.SRI.config) {
  const config = win.SRI.config;
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'SCRIPT') {
          const script = node as HTMLScriptElement;
          const src = script.getAttribute('src');
          if (src) {
            const filename = src.split('/').pop() || '';
            const integrity = config[filename];
            if (integrity) {
              script.setAttribute('integrity', integrity);
              script.setAttribute('crossorigin', 'anonymous');
            }
          }
        }
      });
    });
  });

  // Start observing the document
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Process existing scripts
  const scripts = document.getElementsByTagName('script');
  for (const script of Array.from(scripts)) {
    const src = script.getAttribute('src');
    if (!src) continue;

    const filename = src.split('/').pop() || src;
    const integrity = config[filename];
    if (integrity && !script.hasAttribute('integrity')) {
      script.setAttribute('integrity', integrity);
      script.setAttribute('crossorigin', 'anonymous');
    }
  }
} 