import type { SRIConfig } from './types';

declare global {
  interface Window {
    SRI?: {
      config: SRIConfig;
    };
  }
} 