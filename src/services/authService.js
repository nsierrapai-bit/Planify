const jwt = require('jwt-simple');
const config = require('../config/config');

class AuthService {
    constructor(userModel) { this.userModel = userModel; }

    async register(email, nombre, password) {
        const usuarioExistente = await this.userModel.getByEmail(email);
        if (usuarioExistente) throw new Error('El email ya está registrado');
        const usuario = await this.userModel.create(email, nombre, password);
        const token = this.generateToken(usuario.id);
        return { usuario: this.sanitizeUser(usuario), token };
    }

    async login(email, password) {
        const usuario = await this.userModel.getByEmail(email);
        if (!usuario) throw new Error('Usuario o contraseña incorrectos');
        if (usuario.password !== password) throw new Error('Usuario o contraseña incorrectos');
        const token = this.generateToken(usuario.id);
        return { usuario: this.sanitizeUser(usuario), token };
    }

    generateToken(userId) { const payload = { userId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) }; return jwt.encode(payload, config.jwt.secret); }
    verifyToken(token) { try { return jwt.decode(token, config.jwt.secret); } catch (err) { throw new Error('Token inválido o expirado'); } }
    sanitizeUser(usuario) { const { password, ...u } = usuario; return u; }
}

module.exports = AuthService;
