"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceScriptIntegrity = enforceScriptIntegrity;
let isWrapped = false;
/**
 * Enforces Subresource Integrity (SRI) for script elements by adding integrity attributes
 * based on the provided configuration map.
 *
 * @param config - A map of script paths to their integrity hashes
 * @param prefix - Optional path prefix to match against script URLs
 */
function enforceScriptIntegrity(config, prefix) {
    if (isWrapped)
        return;
    isWrapped = true;
    const originalCreateElement = document.createElement;
    document.createElement = function (tagName) {
        const element = originalCreateElement.call(document, tagName);
        if (tagName.toLowerCase() === "script") {
            // Store the original descriptor for the src property
            const descriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
            // Only proceed if we can get the descriptor
            if (descriptor && descriptor.set) {
                // Override the src setter
                Object.defineProperty(element, 'src', {
                    set: function (value) {
                        // Extract filename from the src
                        let url = value;
                        if (typeof url !== 'string' && url.toString) {
                            url = url.toString();
                        }
                        const filename = url?.split('/')?.pop() || '';
                        const integrity = config[filename];
                        // Add integrity and crossorigin attributes if we have a match
                        if ((!prefix || (prefix && url?.includes(prefix))) && integrity && !this.hasAttribute('integrity')) {
                            this.setAttribute('integrity', integrity);
                            this.setAttribute('crossorigin', 'anonymous');
                        }
                        // Call the original setter
                        descriptor.set.call(this, value);
                    },
                    get: descriptor.get,
                    configurable: true
                });
            }
        }
        return element;
    };
}
