const { v4: uuidv4 } = require('uuid');

class CalendarEvent {
    constructor(db) { this.db = db; }

    async create(userId, eventData) {
        const id = uuidv4();
        const sql = `INSERT INTO calendar_events (id, user_id, task_id, titulo, descripcion, fecha_inicio, fecha_fin, prioridad, recordatorio, color, ubicacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const valores = [id, userId, eventData.task_id || null, eventData.titulo, eventData.descripcion || null, eventData.fecha_inicio, eventData.fecha_fin, eventData.prioridad || 'media', eventData.recordatorio || 15, eventData.color || '#4CAF50', eventData.ubicacion || null];
        await this.db.run(sql, valores); return this.getById(id);
    }

    async getById(id) { return this.db.get('SELECT * FROM calendar_events WHERE id = ?', [id]); }

    async getByUserId(userId, filters = {}) { let sql = 'SELECT * FROM calendar_events WHERE user_id = ?'; const params = [userId]; if (filters.start && filters.end) { sql += ' AND fecha_inicio >= ? AND fecha_fin <= ?'; params.push(filters.start, filters.end); } sql += ' ORDER BY fecha_inicio ASC'; return this.db.all(sql, params); }

    async getByDate(userId, fecha) { const sql = `SELECT * FROM calendar_events WHERE user_id = ? AND DATE(fecha_inicio) = DATE(?) ORDER BY fecha_inicio ASC`; return this.db.all(sql, [userId, fecha]); }

    async update(id, data) { const campos = []; const valores = []; if (data.titulo !== undefined) { campos.push('titulo = ?'); valores.push(data.titulo); } if (data.descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(data.descripcion); } if (data.fecha_inicio !== undefined) { campos.push('fecha_inicio = ?'); valores.push(data.fecha_inicio); } if (data.fecha_fin !== undefined) { campos.push('fecha_fin = ?'); valores.push(data.fecha_fin); } if (data.prioridad !== undefined) { campos.push('prioridad = ?'); valores.push(data.prioridad); } if (data.recordatorio !== undefined) { campos.push('recordatorio = ?'); valores.push(data.recordatorio); } if (data.color !== undefined) { campos.push('color = ?'); valores.push(data.color); } if (data.ubicacion !== undefined) { campos.push('ubicacion = ?'); valores.push(data.ubicacion); } if (data.task_id !== undefined) { campos.push('task_id = ?'); valores.push(data.task_id); } if (campos.length === 0) return this.getById(id); campos.push('fecha_actualizacion = CURRENT_TIMESTAMP'); valores.push(id); const sql = `UPDATE calendar_events SET ${campos.join(', ')} WHERE id = ?`; await this.db.run(sql, valores); return this.getById(id); }

    async delete(id) { await this.db.run('DELETE FROM calendar_events WHERE id = ?', [id]); }
}

module.exports = CalendarEvent;
