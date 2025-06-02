"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enforceScriptIntegrity_1 = require("./enforceScriptIntegrity");
// Initialize if configuration is available
if (typeof window !== "undefined") {
    if (window.SRI?.config) {
        (0, enforceScriptIntegrity_1.enforceScriptIntegrity)(window.SRI.config, window.SRI?.prefix);
    }
}
