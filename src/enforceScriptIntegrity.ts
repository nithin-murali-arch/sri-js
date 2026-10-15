import { SRIMap } from './types';

let isWrapped = false;

/**
 * Finds the integrity hash for a script URL. The exact last path segment wins
 * (so a key like "app.js?v=1" still works); otherwise the segment is looked up
 * with its query string and hash removed.
 */
export function findIntegrity(config: SRIMap, src: string): string | undefined {
  return (
    config[src.split('/').pop() || ''] ||
    config[src.split(/[?#]/)[0].split('/').pop() || '']
  );
}

/**
 * Enforces Subresource Integrity (SRI) for script elements by adding integrity attributes
 * based on the provided configuration map.
 * 
 * @param config - A map of script paths to their integrity hashes
 * @param prefix - Optional path prefix to match against script URLs
 */
export function enforceScriptIntegrity(config: SRIMap, prefix?: string): void {
  if (isWrapped) return;
  isWrapped = true;

  const originalCreateElement = document.createElement;
  document.createElement = function(tagName: string): HTMLElement {
    const element = originalCreateElement.call(document, tagName);
    
    if (tagName.toLowerCase() === "script") {
      // Store the original descriptor for the src property
      const descriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      
      // Only proceed if we can get the descriptor
      if (descriptor && descriptor.set) {
        // Override the src setter
        Object.defineProperty(element, 'src', {
          set: function(value) {            
            // Extract filename from the src
            let url = value;
            if(typeof url !== 'string' && url.toString){
              url = url.toString();
            }
            const integrity = typeof url === 'string' ? findIntegrity(config, url) : undefined;
            
            // Add integrity and crossorigin attributes if we have a match
            if ((!prefix || (prefix && url?.includes(prefix))) && integrity && !this.hasAttribute('integrity')) {
              this.setAttribute('integrity', integrity);
              this.setAttribute('crossorigin', 'anonymous');
            }
            // Call the original setter
            descriptor.set!.call(this, value);

          },
          get: descriptor.get,
          configurable: true
        });
      }
    }
    
    return element;
  };
}

export type SRIConfig = SRIMap;