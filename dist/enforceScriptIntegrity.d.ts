import { SRIMap } from './types';
/**
 * Enforces Subresource Integrity (SRI) for script elements by adding integrity attributes
 * based on the provided configuration map.
 *
 * @param config - A map of script paths to their integrity hashes
 * @param prefix - Optional path prefix to match against script URLs
 */
export declare function enforceScriptIntegrity(config: SRIMap, prefix?: string): void;
export type SRIConfig = SRIMap;
