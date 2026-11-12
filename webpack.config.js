const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MinimizerPlugin = require("minimizer-webpack-plugin");

function apiModeFor(isProd) {
  if (process.env.BSPRE_RECON_API) {
    return process.env.BSPRE_RECON_API;
  }
  return isProd ? "siebel" : "mock";
}

module.exports = (env, argv) => {
  const mode = (argv && argv.mode) || "development";
  const isProd = mode === "production";

  const plugins = [
    new webpack.DefinePlugin({
      "process.env.BSPRE_RECON_API": JSON.stringify(apiModeFor(isProd)),
      "process.env.BSPRE_SIEBEL_BASE_URL": JSON.stringify(
        process.env.BSPRE_SIEBEL_BASE_URL || "/siebel/v1.0"
      ),
      "process.env.BSPRE_SIEBEL_APP_BASE": JSON.stringify(process.env.BSPRE_SIEBEL_APP_BASE || ""),
      "process.env.BSPRE_SIEBEL_USERNAME": JSON.stringify(process.env.BSPRE_SIEBEL_USERNAME || ""),
      "process.env.BSPRE_SIEBEL_PASSWORD": JSON.stringify(process.env.BSPRE_SIEBEL_PASSWORD || ""),
    }),
  ];

  // The dev server needs an HTML page. Siebel hosts the production bundle, so
  // the production build stays a single script with CSS inlined by style-loader.
  if (!isProd) {
    plugins.push(
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "public/index.html"),
      })
    );
  }

  return {
    mode,
    target: "web",
    // Dev serves the local harness. The Siebel bundle only exports mount.
    entry: isProd ? "./src/index.js" : "./src/devIndex.js",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "bspre-recon-bundle.js",
      publicPath: "",
      clean: true,
      globalObject: "this",
      ...(isProd
        ? {
            library: {
              name: "BloomspireSearchRecon",
              type: "umd",
            },
          }
        : {}),
    },
    devtool: isProd ? false : "eval-source-map",
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: "babel-loader",
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    resolve: {
      extensions: [".js", ".jsx"],
    },
    plugins,
    ...(isProd
      ? {
          optimization: {
            minimizer: [
              new MinimizerPlugin({
                extractComments: false,
              }),
            ],
          },
        }
      : {}),
    devServer: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: "all",
      hot: true,
      historyApiFallback: true,
    },
  };
};
