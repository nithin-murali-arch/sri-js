"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceScriptIntegrity = enforceScriptIntegrity;
let alreadyWrapped = false;
/**
 * Adds integrity attributes to dynamically loaded scripts based on configuration.
 * This function overrides document.createElement to intercept script creation.
 *
 * @param config - A map of filenames to their SRI hashes
 */
function enforceScriptIntegrity(config) {
    if (typeof window === "undefined")
        return;
    if (alreadyWrapped)
        return;
    alreadyWrapped = true;
    function addIntegrityToScript(script) {
        const src = script.getAttribute("src");
        if (!src)
            return;
        const filename = src.split("/").pop() || "";
        const integrity = config[filename];
        if (integrity && !script.hasAttribute("integrity")) {
            script.setAttribute("integrity", integrity);
            script.setAttribute("crossorigin", "anonymous");
        }
    }
    // Override the native createElement to intercept script creation
    const originalCreateElement = document.createElement;
    document.createElement = function (tagName) {
        const element = originalCreateElement.call(document, tagName);
        if (tagName.toLowerCase() === "script") {
            addIntegrityToScript(element);
        }
        return element;
    };
}
