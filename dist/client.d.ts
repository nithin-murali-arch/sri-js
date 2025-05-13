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
/**
 * Adds integrity attributes to dynamically loaded scripts based on configuration.
 * This function:
 * 1. Sets up a MutationObserver to watch for new script tags
 * 2. Processes existing script tags
 * 3. Adds integrity and crossorigin attributes when matching hashes are found
 *
 * @param config - A map of filenames to their SRI hashes
 */
declare function enforceScriptIntegrity(config: SRIConfig): void;
