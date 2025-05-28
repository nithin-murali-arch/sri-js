/**
 * Configuration interface for SRI (Subresource Integrity) settings
 */
export interface SRIConfig {
  [filename: string]: string;
}

let alreadyWrapped = false;

/**
 * Adds integrity attributes to dynamically loaded scripts based on configuration.
 * This function overrides the src setter of script elements to add integrity attributes
 * when the src is set.
 *
 * @param config - A map of filenames to their SRI hashes
 */
export function enforceScriptIntegrity(config: SRIConfig): void {
  if (typeof window === "undefined") return;
  if (alreadyWrapped) return;
  alreadyWrapped = true;

  // Override the native createElement to intercept script creation
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
            // Call the original setter
            descriptor.set!.call(this, value);
            
            // Extract filename from the src
            let url = value;
            if(typeof url !== 'string' && url.toString){
              url = url.toString();
            }
            const filename = url?.split('/')?.pop() || '';
            const integrity = config[filename];
            
            // Add integrity and crossorigin attributes if we have a match
            if (integrity && !this.hasAttribute('integrity')) {
              this.setAttribute('integrity', integrity);
              this.setAttribute('crossorigin', 'anonymous');
            }
          },
          get: descriptor.get,
          configurable: true
        });
      }
    }
    
    return element;
  };
}