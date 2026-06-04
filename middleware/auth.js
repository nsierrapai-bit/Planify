// Lightweight middleware implementation compatible with server expectations
function authMiddleware(authService) {
    return (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'No autorizado', message: 'Token no proporcionado' });
            }

            const token = authHeader.substring(7);
            const payload = authService.verifyToken(token);
            req.userId = payload.userId;
            next();
        } catch (err) {
            return res.status(401).json({ error: 'No autorizado', message: err.message });
        }
    };
}

function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error interno del servidor', message: err.message });
}

module.exports = { authMiddleware, errorHandler };
