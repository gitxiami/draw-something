const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const config = {
    entry: {
        main: path.resolve(__dirname, '../src/main.js')
    },
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: 'build.[hash].js',
        chunkFilename: 'chunk.[name].[hash].js'
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                query: {
                    "presets": ["es2015", "stage-0", "react"],
                    "plugins": ["transform-runtime", "transform-decorators-legacy"]
                }
            },
            {
                test: /\.(css|less)$/,
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: "css-loader!less-loader"
                })
            },
            {
                test: /\.(png|jpe?g|gif|svg|eot|ttf|woff)(\?\S*)?$/,
                loader: 'file-loader',
                query: {
                    name: '[name].[ext]?[hash]'
                }
            },
        ]
    },
    resolve: {
        alias: {
            'actions': path.resolve(__dirname, '../src/actions'),
            'components': path.resolve(__dirname, '../src/components'),
            'containers': path.resolve(__dirname, '../src/containers'),
            'utils': path.resolve(__dirname, '../src/utils'),
            'network': path.resolve(__dirname, '../src/network'),
            'flow': path.resolve(__dirname, '../src/flow'),
            'style': path.resolve(__dirname, '../src/style'),
            'lib': path.resolve(__dirname, '../src/lib'),
        }
    },
    plugins: [
        new ExtractTextPlugin('style.css'),
    ]
};

module.exports = config;