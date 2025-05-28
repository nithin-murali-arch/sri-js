/**
 * Configuration interface for SRI (Subresource Integrity) settings
 */
export interface SRIConfig {
    [filename: string]: string;
}
/**
 * Adds integrity attributes to dynamically loaded scripts based on configuration.
 * This function overrides the src setter of script elements to add integrity attributes
 * when the src is set.
 *
 * @param config - A map of filenames to their SRI hashes
 */
export declare function enforceScriptIntegrity(config: SRIConfig): void;
