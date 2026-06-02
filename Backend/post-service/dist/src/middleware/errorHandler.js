"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
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
function notFoundHandler(req, res) {
    console.warn(`[DEBUG] 404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        method: req.method,
    });
}
//# sourceMappingURL=errorHandler.js.map