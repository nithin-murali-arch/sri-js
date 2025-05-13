import { SRIGenerator } from "./generator";
import { SRIOptions, SRIResult, SRIMap } from "./types";

export { SRIGenerator };
export type { SRIOptions, SRIResult, SRIMap };

export function generateSRI(options: SRIOptions): SRIGenerator {
  return new SRIGenerator(options);
}
