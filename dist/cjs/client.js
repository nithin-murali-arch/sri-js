"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const enforceScriptIntegrity_1 = require("./enforceScriptIntegrity");
// Initialize if configuration is available
if (typeof window !== "undefined") {
    if ((_a = window.SRI) === null || _a === void 0 ? void 0 : _a.config) {
        (0, enforceScriptIntegrity_1.enforceScriptIntegrity)(window.SRI.config, (_b = window.SRI) === null || _b === void 0 ? void 0 : _b.prefix);
    }
}
