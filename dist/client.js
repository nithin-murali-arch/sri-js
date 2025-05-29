var _a, _b;
import { enforceScriptIntegrity } from './enforceScriptIntegrity';
// Initialize if configuration is available
if (typeof window !== "undefined") {
    if ((_a = window.SRI) === null || _a === void 0 ? void 0 : _a.config) {
        enforceScriptIntegrity(window.SRI.config, (_b = window.SRI) === null || _b === void 0 ? void 0 : _b.prefix);
    }
}
