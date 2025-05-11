"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SRIEnforcer = void 0;
exports.enforceSRI = enforceSRI;
function enforceSRI(sriMap) {
    // Store the SRI map in the window object for the observer to access
    window.__SRI_MAP__ = sriMap;
    // Create a MutationObserver to watch for dynamically added script tags
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeName === 'SCRIPT') {
                    const script = node;
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
class SRIEnforcer {
    constructor(config) {
        this.config = config;
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.initialize();
    }
    initialize() {
        // Start observing the document with the configured parameters
        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
        // Process existing scripts
        this.processExistingScripts();
    }
    processExistingScripts() {
        const scripts = document.getElementsByTagName('script');
        for (const script of Array.from(scripts)) {
            this.processScript(script);
        }
    }
    handleMutations(mutations) {
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
    processScript(script) {
        const src = script.getAttribute('src');
        if (!src)
            return;
        // Use only the filename for lookup
        const filename = src.split('/').pop() || src;
        const integrity = this.config[filename];
        if (integrity && !script.hasAttribute('integrity')) {
            script.setAttribute('integrity', integrity);
            script.setAttribute('crossorigin', 'anonymous');
        }
    }
}
exports.SRIEnforcer = SRIEnforcer;
// Initialize the SRI enforcer with the configuration
if (typeof window !== 'undefined' && window.SRI && window.SRI.config) {
    new SRIEnforcer(window.SRI.config);
}
