const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const fs = require('fs');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/app.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'bundle.js' : '[name].js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@types': path.resolve(__dirname, 'src/types'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@ui': path.resolve(__dirname, 'src/ui'),
        '@media': path.resolve(__dirname, 'src/media'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@state': path.resolve(__dirname, 'src/state'),
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: isProduction
            ? [MiniCssExtractPlugin.loader, 'css-loader']
            : ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: 'styles.css',
        }),
      ] : []),
      new HtmlWebpackPlugin({
        template: './src/index.template.html',
        filename: 'SIGame.html',
        inject: 'body',
        minify: isProduction ? {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
        } : false,
        ...(isProduction ? {
          scriptLoading: 'blocking',
        } : {}),
      }),
      // Custom plugin to inline everything in production
      ...(isProduction ? [{
        apply: (compiler) => {
          compiler.hooks.afterEmit.tap('InlineAssetsPlugin', (compilation) => {
            const htmlPath = path.join(compilation.outputOptions.path, 'SIGame.html');
            const jsPath = path.join(compilation.outputOptions.path, 'bundle.js');
            const cssPath = path.join(compilation.outputOptions.path, 'styles.css');

            if (fs.existsSync(htmlPath) && fs.existsSync(jsPath)) {
              let html = fs.readFileSync(htmlPath, 'utf8');

              // Inline JavaScript
              const jsContent = fs.readFileSync(jsPath, 'utf8');
              html = html.replace(
                /<script[^>]*src=["'][^"']*bundle\.js["'][^>]*><\/script>/i,
                `<script>${jsContent}</script>`
              );

              // Inline CSS if exists
              if (fs.existsSync(cssPath)) {
                const cssContent = fs.readFileSync(cssPath, 'utf8');
                html = html.replace(
                  /<\/head>/i,
                  `<style>${cssContent}</style></head>`
                );
              }

              fs.writeFileSync(htmlPath, html, 'utf8');

              // Clean up separate files
              if (fs.existsSync(jsPath)) fs.unlinkSync(jsPath);
              if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath);
            }
          });
        },
      }] : []),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 9000,
      open: true,
    },
  };
};
