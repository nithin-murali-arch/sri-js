export interface SRIConfig {
    htmlPath?: string;
    algorithm?: 'sha256' | 'sha384' | 'sha512';
    basePath?: string;
}
export interface SRIMap {
    [key: string]: string;
}
export interface SRIOptions {
    algorithm: 'sha256' | 'sha384' | 'sha512';
    basePath?: string;
}
export interface SRIResult {
    integrity: string;
    path: string;
}
export interface HTMLUpdateResult {
    updatedFiles: string[];
    sriMap: SRIMap;
}
