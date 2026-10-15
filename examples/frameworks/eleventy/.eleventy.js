module.exports = function (eleventyConfig) { eleventyConfig.addPassthroughCopy('src/app.js'); return { dir: { input: 'src', output: 'dist' } }; };
