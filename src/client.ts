import { enforceScriptIntegrity, SRIConfig } from './enforceScriptIntegrity';

/**
 * Extended Window interface that includes SRI configuration
 */
interface SRIWindow extends Window {
  SRI?: {
    prefix?: string;
    config: SRIConfig;
  };
}

// Initialize if configuration is available
if (typeof window !== "undefined") {
  if ((window as SRIWindow).SRI?.config) {
    enforceScriptIntegrity((window as SRIWindow).SRI!.config, (window as SRIWindow).SRI?.prefix);
  }
}
