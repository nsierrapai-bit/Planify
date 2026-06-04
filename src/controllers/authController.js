class AuthController {
    constructor(authService, activityLog) { this.authService = authService; this.activityLog = activityLog; }
    async register(req, res, next) {
        try {
            const { email, nombre, password, passwordConfirm } = req.body;
            if (!email || !nombre || !password) return res.status(400).json({ error: 'Campos requeridos', message: 'Email, nombre y contraseña son obligatorios' });
            if (password !== passwordConfirm) return res.status(400).json({ error: 'Validación fallida', message: 'Las contraseñas no coinciden' });
            if (password.length < 4) return res.status(400).json({ error: 'Contraseña débil', message: 'La contraseña debe tener al menos 4 caracteres' });
            const resultado = await this.authService.register(email, nombre, password);
            await this.activityLog.log(resultado.usuario.id, 'registro', 'usuario', resultado.usuario.id);
            res.status(201).json({ message: 'Usuario registrado exitosamente', usuario: resultado.usuario, token: resultado.token });
        } catch (error) {
            const lower = error.message.toLowerCase();
            const status = lower.includes('registrado') || lower.includes('obligatorios') || lower.includes('contraseña') ? 400 : 500;
            return res.status(status).json({ error: status === 400 ? 'Solicitud inválida' : 'Error interno del servidor', message: error.message });
        }
    }
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Campos requeridos', message: 'Email y contraseña son obligatorios' });
            const resultado = await this.authService.login(email, password);
            await this.activityLog.log(resultado.usuario.id, 'login', 'usuario', resultado.usuario.id);
            res.json({ message: 'Login exitoso', usuario: resultado.usuario, token: resultado.token });
        } catch (error) {
            const lower = error.message.toLowerCase();
            const status = lower.includes('incorrectos') ? 401 : 500;
            return res.status(status).json({ error: status === 401 ? 'No autorizado' : 'Error interno del servidor', message: error.message });
        }
    }
    async verify(req, res, next) { try { res.json({ message: 'Token válido', userId: req.userId }); } catch (error) { next(error); } }
    async logout(req, res, next) { try { await this.activityLog.log(req.userId, 'logout', 'usuario', req.userId); res.json({ message: 'Sesión cerrada exitosamente' }); } catch (error) { next(error); } }
}

module.exports = AuthController;
