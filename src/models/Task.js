const { v4: uuidv4 } = require('uuid');

class Task {
    constructor(db) { this.db = db; }

    async create(userId, taskData) {
        const id = uuidv4();
        const sql = `INSERT INTO tasks (id, user_id, titulo, descripcion, prioridad, urgencia, fecha_vencimiento, estado, tiempo_estimado, etiquetas, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const valores = [id, userId, taskData.titulo, taskData.descripcion || null, taskData.prioridad || 'media', taskData.urgencia || 'normal', taskData.fecha_vencimiento || null, 'pendiente', taskData.tiempo_estimado || 0, taskData.etiquetas || null, taskData.notas || null];
        await this.db.run(sql, valores); return this.getById(id);
    }

    async getById(id) { return this.db.get('SELECT * FROM tasks WHERE id = ?', [id]); }

    async getByUserId(userId, filtros = {}) {
        let sql = 'SELECT * FROM tasks WHERE user_id = ?'; const params = [userId];
        if (filtros.estado) { sql += ' AND estado = ?'; params.push(filtros.estado); }
        if (filtros.prioridad) { sql += ' AND prioridad = ?'; params.push(filtros.prioridad); }
        if (filtros.fecha_desde) { sql += ' AND fecha_vencimiento >= ?'; params.push(filtros.fecha_desde); }
        if (filtros.fecha_hasta) { sql += ' AND fecha_vencimiento <= ?'; params.push(filtros.fecha_hasta); }
        sql += ' ORDER BY fecha_vencimiento ASC, prioridad DESC'; return this.db.all(sql, params);
    }

    async update(id, data) {
        const campos = []; const valores = [];
        if (data.titulo !== undefined) { campos.push('titulo = ?'); valores.push(data.titulo); }
        if (data.descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(data.descripcion); }
        if (data.prioridad !== undefined) { campos.push('prioridad = ?'); valores.push(data.prioridad); }
        if (data.urgencia !== undefined) { campos.push('urgencia = ?'); valores.push(data.urgencia); }
        if (data.fecha_vencimiento !== undefined) { campos.push('fecha_vencimiento = ?'); valores.push(data.fecha_vencimiento); }
        if (data.estado !== undefined) { campos.push('estado = ?'); valores.push(data.estado); }
        if (data.tiempo_realizado !== undefined) { campos.push('tiempo_realizado = ?'); valores.push(data.tiempo_realizado); }
        if (data.etiquetas !== undefined) { campos.push('etiquetas = ?'); valores.push(data.etiquetas); }
        if (data.notas !== undefined) { campos.push('notas = ?'); valores.push(data.notas); }
        if (campos.length === 0) return this.getById(id);
        campos.push('fecha_actualizacion = CURRENT_TIMESTAMP'); valores.push(id);
        const sql = `UPDATE tasks SET ${campos.join(', ')} WHERE id = ?`;
        await this.db.run(sql, valores); return this.getById(id);
    }

    async delete(id) { await this.db.run('DELETE FROM tasks WHERE id = ?', [id]); }

    async getPending(userId) { const sql = `SELECT * FROM tasks WHERE user_id = ? AND estado IN ('pendiente','en_progreso') ORDER BY fecha_vencimiento ASC, prioridad DESC`; return this.db.all(sql, [userId]); }

    async getCompleted(userId, dias = 30) { const sql = `SELECT * FROM tasks WHERE user_id = ? AND estado = 'completada' AND fecha_actualizacion >= datetime('now', '-' || ? || ' days') ORDER BY fecha_actualizacion DESC`; return this.db.all(sql, [userId, dias]); }

    async getByDate(userId, fecha) { const sql = `SELECT * FROM tasks WHERE user_id = ? AND DATE(fecha_vencimiento) = ? ORDER BY prioridad DESC, urgencia DESC`; return this.db.all(sql, [userId, fecha]); }

    async getUpcoming(userId, dias = 7) { const sql = `SELECT * FROM tasks WHERE user_id = ? AND estado != 'completada' AND fecha_vencimiento IS NOT NULL AND DATE(fecha_vencimiento) >= DATE('now') AND DATE(fecha_vencimiento) <= DATE('now', '+' || ? || ' days') ORDER BY fecha_vencimiento ASC, prioridad DESC`; return this.db.all(sql, [userId, dias]); }

    async getOverdue(userId) { const sql = `SELECT * FROM tasks WHERE user_id = ? AND estado != 'completada' AND fecha_vencimiento IS NOT NULL AND DATE(fecha_vencimiento) < DATE('now') ORDER BY fecha_vencimiento ASC, prioridad DESC`; return this.db.all(sql, [userId]); }

    async search(userId, termino) { const sql = `SELECT * FROM tasks WHERE user_id = ? AND (titulo LIKE ? OR descripcion LIKE ? OR etiquetas LIKE ?) ORDER BY fecha_actualizacion DESC`; const busqueda = `%${termino}%`; return this.db.all(sql, [userId, busqueda, busqueda, busqueda]); }

    async getDependencies(taskId) { const sql = `SELECT t.* FROM tasks t JOIN task_dependencies td ON t.id = td.depends_on_task_id WHERE td.task_id = ? AND t.estado != 'completada'`; return this.db.all(sql, [taskId]); }

    async addDependency(taskId, dependsOnTaskId) { const id = uuidv4(); const sql = `INSERT INTO task_dependencies (id, task_id, depends_on_task_id) VALUES (?, ?, ?)`; await this.db.run(sql, [id, taskId, dependsOnTaskId]); return id; }

    async countByStatus(userId) { const sql = `SELECT estado, COUNT(*) as cantidad FROM tasks WHERE user_id = ? GROUP BY estado`; const results = await this.db.all(sql, [userId]); const conteo = { pendiente: 0, en_progreso: 0, completada: 0, cancelada: 0 }; results.forEach(r => { conteo[r.estado] = r.cantidad; }); return conteo; }
}

module.exports = Task;
