const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
    app.use(
        /*'/api',*/
        createProxyMiddleware('/api',{
            target: 'http://localhost:3000',
            changeOrigin: true,
            pathFilter: '/api',
        })
    );

    app.use(
        /*'/auth',*/
        createProxyMiddleware('/auth',{
            target: 'http://localhost:3000',
            changeOrigin: true,
            pathFilter: '/auth',
        })
    );

    app.use(
        /*'/auth',*/
        createProxyMiddleware('/images',{
            target: 'http://localhost:3000',
            changeOrigin: true,
            pathFilter: '/images',
        })
    );

    app.use(
        /*'/auth',*/
        createProxyMiddleware('/attachments',{
            target: 'http://localhost:3000',
            changeOrigin: true,
            pathFilter: '/attachments',
        })
    );
    app.use(
        /*'/socket.io',*/
        createProxyMiddleware('/socket-io',{
            target: 'ws://localhost:3000',
            ws: true,
            pathFilter: '/socket-io',
            changeOrigin: true,
            logger: console,
        })
    );
};