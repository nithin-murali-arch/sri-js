const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { SubresourceIntegrityPlugin } = require("webpack-subresource-integrity");

module.exports = {
  mode: "production",
  entry: path.join(__dirname, "main.js"),
  output: {
    filename: "assets/app.[contenthash].js",
    publicPath: "/shop/",
    crossOriginLoading: "anonymous",
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({ title: "Webpack SRI fixture" }),
    new SubresourceIntegrityPlugin({ hashFuncNames: ["sha384"] }),
  ],
};
