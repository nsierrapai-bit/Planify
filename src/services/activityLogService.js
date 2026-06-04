const { v4: uuidv4 } = require('uuid');

class ActivityLogService {
    constructor(db) { this.db = db; }

    async log(userId, accion, entidadTipo = null, entidadId = null, detalles = null) {
        const id = uuidv4();
        const sql = `INSERT INTO activity_log (id, user_id, accion, entidad_tipo, entidad_id, detalles) VALUES (?, ?, ?, ?, ?, ?)`;
        const detallesJSON = detalles ? JSON.stringify(detalles) : null;
        await this.db.run(sql, [id, userId, accion, entidadTipo, entidadId, detallesJSON]); return id;
    }

    async getActivityLog(userId, limite = 50) { const sql = `SELECT * FROM activity_log WHERE user_id = ? ORDER BY fecha DESC LIMIT ?`; return this.db.all(sql, [userId, limite]); }
    async getActivityByDateRange(userId, fechaInicio, fechaFin) { const sql = `SELECT * FROM activity_log WHERE user_id = ? AND fecha >= ? AND fecha <= ? ORDER BY fecha DESC`; return this.db.all(sql, [userId, fechaInicio, fechaFin]); }
    async getActivityByType(userId, accion) { const sql = `SELECT * FROM activity_log WHERE user_id = ? AND accion = ? ORDER BY fecha DESC`; return this.db.all(sql, [userId, accion]); }
    async cleanOldLogs(diasRetener = 90) { const sql = `DELETE FROM activity_log WHERE fecha < datetime('now', '-' || ? || ' days')`; await this.db.run(sql, [diasRetener]); }
}

module.exports = ActivityLogService;
