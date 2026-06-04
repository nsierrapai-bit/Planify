const { v4: uuidv4 } = require('uuid');

class User {
    constructor(db) { this.db = db; }

    async create(email, nombre, password) {
        const id = uuidv4();
        const sql = `INSERT INTO users (id, email, nombre, password) VALUES (?, ?, ?, ?)`;
        await this.db.run(sql, [id, email, nombre, password]);
        return this.getById(id);
    }

    async getById(id) { return this.db.get('SELECT * FROM users WHERE id = ?', [id]); }
    async getByEmail(email) { return this.db.get('SELECT * FROM users WHERE email = ?', [email]); }

    async update(id, data) {
        const campos = []; const valores = [];
        if (data.nombre) { campos.push('nombre = ?'); valores.push(data.nombre); }
        if (data.email) { campos.push('email = ?'); valores.push(data.email); }
        if (data.password) { campos.push('password = ?'); valores.push(data.password); }
        if (data.foto_perfil) { campos.push('foto_perfil = ?'); valores.push(data.foto_perfil); }
        campos.push('fecha_actualizacion = CURRENT_TIMESTAMP'); valores.push(id);
        const sql = `UPDATE users SET ${campos.join(', ')} WHERE id = ?`;
        await this.db.run(sql, valores); return this.getById(id);
    }

    async delete(id) { await this.db.run('DELETE FROM users WHERE id = ?', [id]); }
    async getAll() { return this.db.all('SELECT id, email, nombre, fecha_creacion FROM users'); }
    async emailExists(email) { const u = await this.getByEmail(email); return !!u; }
    async getStatistics(userId) { return this.db.get(`SELECT COUNT(*) as total_tareas, SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as tareas_completadas, SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as tareas_pendientes, AVG(tiempo_estimado) as promedio_tiempo_estimado, AVG(tiempo_realizado) as promedio_tiempo_realizado FROM tasks WHERE user_id = ?`, [userId]); }
}

module.exports = User;
