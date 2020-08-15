var path = require('path')

let client = {
  target: 'web',
  entry: './javascript/index.tsx',
  output: {
    path: __dirname + '/resources/public',
    publicPath: '/',
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        use: ['ts-loader']
      },
      {
        test: /\.ttf$/,
        use: [
          {
            loader: 'ttf-loader',
            options: {
              name: './font/[hash].[ext]',
            },
          }
        ]
      },
      {
        test: /\.(sass|scss|css)$/,
        use: [
            "style-loader", // creates style nodes from JS strings
            "css-loader?url=false", // translates CSS into CommonJS
            "sass-loader?url=false" // compiles Sass to CSS, using Node Sass by default
        ]
      }
    ]
  },
}

let server = {
  target: 'node',
  entry: './javascript/index-server.tsx',
  output: {
    path: __dirname + '/resources/',
    filename: 'server.js'
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        use: ['ts-loader']
      },
      {
        test: /\.ttf$/,
        use: ['ignore-loader']
      },
      {
        test: /\.(sass|scss|css)$/,
        use: ['ignore-loader']
      }
    ]
  },
}

let common = {
  resolve: {
    modules: [
      'node_modules',
      path.resolve(__dirname, 'javascript/modules')
    ],
    extensions: ['*', '.js', '.jsx', '.css','.scss', '.tsx']
  },
  devServer: {
    contentBase: './resources/public'
  }
}

module.exports = [{...common, ...server}, {...common, ...client}]