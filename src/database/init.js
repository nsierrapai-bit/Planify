const sqlite3 = require('sqlite3').verbose();
const { join } = require('path');

class Database {
    constructor(dbPath) {
        this.dbPath = dbPath || './database.db';
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) reject(err); else resolve();
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) reject(err); else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows || []); });
        });
    }

    close() { return new Promise((resolve, reject) => { if (this.db) this.db.close(err => err ? reject(err) : resolve()); else resolve(); }); }

    async initialize() {
        // Create tables
        await this.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL, password TEXT NOT NULL, foto_perfil TEXT, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP, fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP)`);

        await this.run(`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, titulo TEXT NOT NULL, descripcion TEXT, prioridad TEXT CHECK(prioridad IN ('alta','media','baja')) DEFAULT 'media', urgencia TEXT CHECK(urgencia IN ('muy_urgente','urgente','normal','poco_urgente')) DEFAULT 'normal', fecha_vencimiento DATE, estado TEXT CHECK(estado IN ('pendiente','en_progreso','completada','cancelada')) DEFAULT 'pendiente', tiempo_estimado INTEGER DEFAULT 0, tiempo_realizado INTEGER DEFAULT 0, etiquetas TEXT, notas TEXT, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP, fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))`);

        await this.run(`CREATE TABLE IF NOT EXISTS task_dependencies (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, depends_on_task_id TEXT NOT NULL, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (task_id) REFERENCES tasks(id), FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id))`);

        await this.run(`CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, task_id TEXT, titulo TEXT NOT NULL, descripcion TEXT, fecha_inicio DATETIME NOT NULL, fecha_fin DATETIME NOT NULL, prioridad TEXT CHECK(prioridad IN ('alta','media','baja')) DEFAULT 'media', recordatorio INTEGER DEFAULT 15, color TEXT DEFAULT '#4CAF50', ubicacion TEXT, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP, fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (task_id) REFERENCES tasks(id))`);

        await this.run('PRAGMA table_info(calendar_events)');

        try {
            await this.run("ALTER TABLE calendar_events ADD COLUMN prioridad TEXT DEFAULT 'media'");
        } catch (e) {
            // Si la columna ya existe, el error se captura aquí sin romper la app
        }

        await this.run(`CREATE TABLE IF NOT EXISTS ai_recommendations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, task_id TEXT, tipo TEXT NOT NULL, titulo TEXT NOT NULL, descripcion TEXT, razon TEXT, confianza REAL DEFAULT 0.5, aceptada BOOLEAN DEFAULT NULL, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP, fecha_respuesta DATETIME, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (task_id) REFERENCES tasks(id))`);

        await this.run(`CREATE TABLE IF NOT EXISTS task_scores (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, puntuacion_prioridad REAL DEFAULT 0, puntuacion_urgencia REAL DEFAULT 0, puntuacion_dependencias REAL DEFAULT 0, puntuacion_tiempo REAL DEFAULT 0, puntuacion_total REAL DEFAULT 0, ranking INTEGER, fecha_calculo DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (task_id) REFERENCES tasks(id))`);

        await this.run(`CREATE TABLE IF NOT EXISTS activity_log (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, accion TEXT NOT NULL, entidad_tipo TEXT, entidad_id TEXT, detalles TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))`);

        await this.run(`CREATE TABLE IF NOT EXISTS user_statistics (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, total_tareas INTEGER DEFAULT 0, tareas_completadas INTEGER DEFAULT 0, tareas_pendientes INTEGER DEFAULT 0, promedio_tiempo_estimado REAL DEFAULT 0, promedio_tiempo_realizado REAL DEFAULT 0, tasa_completitud REAL DEFAULT 0, horas_mas_productivas TEXT, fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))`);

        await this.run('CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_tasks_estado ON tasks(estado)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_tasks_fecha ON tasks(fecha_vencimiento)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_calendar_user ON calendar_events(user_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_recommendations_user ON ai_recommendations(user_id)');
    }
}

module.exports = Database;
