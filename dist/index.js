"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SRIGenerator = void 0;
exports.generateSRI = generateSRI;
exports.updateHtmlScripts = updateHtmlScripts;
exports.updateHTML = updateHTML;
const generator_1 = require("./generator");
Object.defineProperty(exports, "SRIGenerator", { enumerable: true, get: function () { return generator_1.SRIGenerator; } });
const cheerio = __importStar(require("cheerio"));
function generateSRI(options) {
    return new generator_1.SRIGenerator(options);
}
/**
 * Updates script tags in an HTML string with integrity attributes based on the provided configuration.
 *
 * @param html - The HTML string to update.
 * @param config - A map of filenames to their SRI hashes.
 * @returns The updated HTML string.
 */
function updateHtmlScripts(html, config, prefix) {
    return updateHTML(html, config, '');
}
/**
 * Updates script tags in an HTML string with integrity attributes based on the provided configuration.
 *
 * @param html - The HTML string to update.
 * @param config - A map of filenames to their SRI hashes.
 * @returns The updated HTML string.
 */
function updateHTML(html, config, prefix) {
    const $ = cheerio.load(html);
    $('script[src]').each((_, element) => {
        const src = $(element).attr('src');
        if (!src || (src && prefix && src.includes(prefix)))
            return;
        const filename = src.split('/').pop() || '';
        const integrity = config[filename];
        if (integrity && !$(element).attr('integrity')) {
            $(element).attr('integrity', integrity);
            $(element).attr('crossorigin', 'anonymous');
        }
    });
    return $.html();
}
