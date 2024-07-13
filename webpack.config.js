// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const isProduction = process.env.NODE_ENV == 'production';


const stylesHandler = MiniCssExtractPlugin.loader;

const common = {
    resolve: {
      modules: [
        'node_modules',
        path.resolve(__dirname, 'javascript/modules')
      ],
      extensions: ['*', '.js', '.jsx', '.css','.scss', '.tsx']
    },
    devServer: {
      contentBase: './resources/public'
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
              terserOptions: {
                keep_classnames: true
              }
            })
        ]
    }
}
  

const server = {
    target: 'node',
    entry: './javascript/index-server.tsx',
    output: {
      path: __dirname + '/resources/',
      filename: 'server.js'
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['ignore-loader'],
            },
            {
                test: /\.ts(x?)$/,
                use: ['ts-loader']
            },
            {
                test: /\.s[ac]ss$/i,
                use: ['ignore-loader'],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                use: ['ignore-loader'],
            },
        ]
    }
}

const client = {
    target: 'web',
    entry: './javascript/index.tsx',
    output: {
      path: __dirname + '/resources/public',
      publicPath: '/',
      filename: 'bundle.js'
    },
    devServer: {
        open: true,
        host: 'localhost',
    },
    plugins: [
        new MiniCssExtractPlugin(),

        // Add your plugins here
        // Learn more about plugins from https://webpack.js.org/configuration/plugins/
    ],
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [stylesHandler,{
                    loader: 'css-loader',
                    options: {
                        url: false
                    }
                }],
            },
            {
                test: /\.ts(x?)$/,
                use: ['ts-loader']
            },
            {
                test: /\.s[ac]ss$/i,
                use: [stylesHandler, {
                    loader: 'css-loader',
                    options: {
                        url: false
                    }
                }, 'sass-loader']
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 8192,
                    }
                }],
                type: 'javascript/auto'
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
};

module.exports = ()=>{
    return [
        {...common, ...server}, 
        {...common, ...client}
    ].map(config => {
        if (isProduction) {
            config.mode = 'production';
        } else {
            config.mode = 'development';
        }
        return config;
    })
}