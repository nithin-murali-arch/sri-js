/**
 * Configuration interface for SRI (Subresource Integrity) settings
 */
export interface SRIConfig {
    [filename: string]: string;
}
/**
 * Adds integrity attributes to dynamically loaded scripts based on configuration.
 * This function overrides document.createElement to intercept script creation.
 *
 * @param config - A map of filenames to their SRI hashes
 */
export declare function enforceScriptIntegrity(config: SRIConfig): void;
