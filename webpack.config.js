const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const fs = require('fs');

const os = require('os');

function getLocalExternalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (127.0.0.1) and non-IPv4
      if ('IPv4' !== iface.family || iface.internal) {
        continue;
      }
      return iface.address;
    }
  }
  return 'localhost';
}

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const localIP = getLocalExternalIP();

  return {
    entry: {
      bundle: './src/app.ts',
      mobile: './src/mobile.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
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
        chunks: ['bundle'],
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
      new HtmlWebpackPlugin({
        template: './src/mobile.template.html',
        filename: 'mobile.html',
        inject: 'body',
        chunks: ['mobile'],
        minify: isProduction ? {
          collapseWhitespace: true,
          removeComments: true,
        } : false,
      }),
      // Custom plugin to inline JS (and CSS) into HTML files in production.
      // Both SIGame.html and mobile.html become fully self-contained.
      ...(isProduction ? [{
        apply: (compiler) => {
          compiler.hooks.afterEmit.tap('InlineAssetsPlugin', (compilation) => {
            const outDir = compilation.outputOptions.path;

            /**
             * Reads `htmlFile`, replaces the <script src="jsFile"> tag with an
             * inline <script> block, writes back, then deletes the JS file.
             */
            function inlineJs(htmlFile, jsFile) {
              const htmlPath = path.join(outDir, htmlFile);
              const jsPath = path.join(outDir, jsFile);
              if (!fs.existsSync(htmlPath) || !fs.existsSync(jsPath)) return;

              let html = fs.readFileSync(htmlPath, 'utf8');
              const jsContent = fs.readFileSync(jsPath, 'utf8');
              const escapedName = jsFile.replace(/\./g, '\\.');
              html = html.replace(
                new RegExp(`<script[^>]*src=["'][^"']*${escapedName}["'][^>]*><\\/script>`, 'i'),
                `<script>${jsContent}</script>`
              );
              fs.writeFileSync(htmlPath, html, 'utf8');
              fs.unlinkSync(jsPath);
            }

            // --- SIGame.html: inline bundle.js + styles.css ---
            inlineJs('SIGame.html', 'bundle.js');

            const htmlPath = path.join(outDir, 'SIGame.html');
            const cssPath = path.join(outDir, 'styles.css');
            if (fs.existsSync(htmlPath) && fs.existsSync(cssPath)) {
              let html = fs.readFileSync(htmlPath, 'utf8');
              const cssContent = fs.readFileSync(cssPath, 'utf8');
              html = html.replace(/<\/head>/i, `<style>${cssContent}</style></head>`);
              fs.writeFileSync(htmlPath, html, 'utf8');
              fs.unlinkSync(cssPath);
            }

            // --- mobile.html: inline mobile.js (makes it fully self-contained) ---
            inlineJs('mobile.html', 'mobile.js');
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
      open: [`http://${localIP}:9000/SIGame.html`],
      host: '0.0.0.0', // Allow access from local network
      allowedHosts: 'all', // Disable host check
      client: {
        overlay: false, // Optional: disable overlay if it gets annoying on mobile
      }
    },
  };
};
