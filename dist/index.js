"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SRIGenerator = void 0;
exports.generateSRI = generateSRI;
const generator_1 = require("./generator");
Object.defineProperty(exports, "SRIGenerator", { enumerable: true, get: function () { return generator_1.SRIGenerator; } });
function generateSRI(options) {
    return new generator_1.SRIGenerator(options);
}
