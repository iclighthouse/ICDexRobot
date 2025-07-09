const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const publicPath = process.env.NODE_ENV === 'production' ? './' : '/';
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
  publicPath: publicPath,
  outputDir: 'dist',

  // (js/css/img/font/...)
  assetsDir: './static',

  //lintOnSave: process.env.NODE_ENV !== 'production',

  // https://cn.vuejs.org/v2/guide/installation.html#
  // compiler: false,

  transpileDependencies: [
    '@dfinity/agent',
    '@dfinity/auth-client',
    '@dfinity/authentication',
    '@dfinity/candid',
    '@dfinity/identity',
    '@dfinity/principal'
  ],

  productionSourceMap: false,

  //  https://github.com/vuejs/vue-docs-zh-cn/blob/master/vue-cli/webpack.md
  chainWebpack: (config) => {
    config.plugins.delete('prefetch');
  },
  // CSS
  css: {
    sourceMap: true,

    loaderOptions: {}
  },
  lintOnSave: false,
  parallel: require('os').cpus().length > 1,

  // PWA。
  //  https://github.com/vuejs/vue-docs-zh-cn/blob/master/vue-cli-plugin-pwa/README.md
  pwa: {},

  // // eslint-disable-next-line no-dupe-keys
  configureWebpack: {
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true
            }
          }
        })
      ]
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    target: ['web', 'es5'],
    plugins: [new NodePolyfillPlugin()],
    module: {
      rules: []
    }
  },
  pluginOptions: {
    electronBuilder: {
      mainProcessFile: 'src/background.ts',
      nodeIntegration: true,
      builderOptions: {
        appId: 'io.iclight',
        icon: 'public/icons/favicon',
        productName: 'ICDexRobot',
        directories: {
          output: 'dist_electron'
        },
        win: {
          icon: 'public/icons/favicon.ico',
          target: 'nsis'
        },
        mac: {
          icon: 'public/icons/favicon.icns',
          target: 'dmg'
        },
        linux: {
          icon: 'public/icons/favicon.png',
          target: 'AppImage'
        }
      }
    }
  }
};
