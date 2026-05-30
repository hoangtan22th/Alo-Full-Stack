/**
 * Global error handling middleware
 */
export function errorHandler(err, req, res, next) {
    console.error('[ErrorHandler]', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        error: message,
        status,
        path: req.path,
        method: req.method,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}
/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        method: req.method,
    });
}
//# sourceMappingURL=errorHandler.js.map