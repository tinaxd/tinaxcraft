const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const process = require("process");

module.exports = {
  mode: process.env.WEBPACK_MODE || "development",
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: "/node_modules/",
      },
      {
        test: /\.glsl$/,
        type: "asset/source",
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "public", to: "" }],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
    },
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".glsl"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
};
