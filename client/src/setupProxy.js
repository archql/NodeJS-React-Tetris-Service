const { createProxyMiddleware } = require('http-proxy-middleware');

const proxy_ip = process.env.REACT_APP_PROXY_IP || 'localhost';
const proxy_port = process.env.REACT_APP_PROXY_PORT || '3000';
const target = `http://${proxy_ip}:${proxy_port}`
const target_ws = `ws://${proxy_ip}:${proxy_port}`

module.exports = function(app) {
    app.use(
        /*'/api',*/
        createProxyMiddleware('/api',{
            target: target,
            changeOrigin: true,
            pathFilter: '/api',
        })
    );

    app.use(
        /*'/auth',*/
        createProxyMiddleware('/auth',{
            target: target,
            changeOrigin: true,
            pathFilter: '/auth',
        })
    );

    app.use(
        /*'/auth',*/
        createProxyMiddleware('/images',{
            target: target,
            changeOrigin: true,
            pathFilter: '/images',
        })
    );

    app.use(
        /*'/auth',*/
        createProxyMiddleware('/attachments',{
            target: target,
            changeOrigin: true,
            pathFilter: '/attachments',
        })
    );
    app.use(
        /*'/socket.io',*/
        createProxyMiddleware('/socket-io',{
            target: target_ws,
            ws: true,
            pathFilter: '/socket-io',
            changeOrigin: true,
            logger: console,
        })
    );
};