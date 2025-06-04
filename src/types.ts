export interface SRIConfig {
  htmlPath?: string; // Path to HTML files that need SRI updates
  algorithm?: "sha256" | "sha384" | "sha512";
  basePath?: string;
}

export interface SRIMap {
  [key: string]: string; // Maps script paths to their SRI hashes
}

export interface SRIOptions {
  algorithm: "sha256" | "sha384" | "sha512";
  basePath: string; // Required since we always provide a default value
  errorHandler?: string;
}

export interface SRIResult {
  integrity: string;
  path: string;
}

export interface HTMLUpdateResult {
  updatedFiles: string[];
  sriMap: SRIMap;
}
