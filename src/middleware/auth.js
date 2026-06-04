const config = require('../config/config');
const jwt = require('jwt-simple');

function authMiddleware(authService) {
    return (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado', message: 'Token no proporcionado' });
            const token = authHeader.substring(7);
            // Preferir método del servicio si existe
            let payload;
            if (authService && typeof authService.verifyToken === 'function') payload = authService.verifyToken(token);
            else payload = jwt.decode(token, config.jwt.secret);
            req.userId = payload.userId;
            next();
        } catch (error) {
            return res.status(401).json({ error: 'No autorizado', message: error.message });
        }
    };
}

function errorHandler(err, req, res, next) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Error interno del servidor', message: err.message });
}

module.exports = { authMiddleware, errorHandler };
