const { v4: uuidv4 } = require('uuid');

class AIService {
    constructor(db, taskModel) { this.db = db; this.taskModel = taskModel; }

    async calculateTaskScore(task) {
        const prioridadMap = { baja: 1, media: 2, alta: 3 };
        const scorePrioridad = (prioridadMap[task.prioridad] || 2) / 3;
        const urgenciaMap = { poco_urgente: 1, normal: 2, urgente: 3, muy_urgente: 4 };
        const scoreUrgencia = (urgenciaMap[task.urgencia] || 2) / 4;
        const dependencias = await this.taskModel.getDependencies(task.id);
        const scoreDependencias = Math.min(dependencias.length / 5, 1);
        let scoreTime = 0;
        if (task.fecha_vencimiento) {
            const today = new Date(); const due = new Date(task.fecha_vencimiento); const diasRestantes = Math.floor((due - today) / (1000 * 60 * 60 * 24));
            if (diasRestantes < 0) scoreTime = 1; else if (diasRestantes === 0) scoreTime = 0.9; else if (diasRestantes <= 3) scoreTime = 0.7; else if (diasRestantes <= 7) scoreTime = 0.5; else if (diasRestantes <= 30) scoreTime = 0.2; else scoreTime = 0.1;
        }
        const puntuacionTotal = (scorePrioridad * 0.4) + (scoreUrgencia * 0.3) + (scoreDependencias * 0.2) + (scoreTime * 0.1);
        return { puntuacion_prioridad: scorePrioridad, puntuacion_urgencia: scoreUrgencia, puntuacion_dependencias: scoreDependencias, puntuacion_tiempo: scoreTime, puntuacion_total: Math.round(puntuacionTotal * 100) / 100 };
    }

    async getRankedTasks(userId) {
        const tareas = await this.taskModel.getPending(userId);
        const tasksWithScore = await Promise.all(tareas.map(async t => ({ ...t, puntuacion: await this.calculateTaskScore(t) })));
        return tasksWithScore.sort((a, b) => b.puntuacion.puntuacion_total - a.puntuacion.puntuacion_total);
    }

    async generateFocusPlan(userId) {
        const tareas = await this.getRankedTasks(userId);
        const plan = tareas.slice(0, 5).map((task, index) => ({
            paso: index + 1,
            tarea_id: task.id,
            titulo: task.titulo,
            descripcion: `Crea un bloque de enfoque de ${Math.max(20, Math.min(60, task.tiempo_estimado || 30))} minutos para esta tarea.`,
            prioridad: task.prioridad,
            urgencia: task.urgencia,
            duracion_minutos: task.tiempo_estimado || 30,
            razon: `Tarea valorada con ${task.puntuacion.puntuacion_total} puntos de IA para impulsar tu productividad.`
        }));
        return { mensaje: 'Plan de enfoque generado para tus próximas sesiones', plan };
    }

    async generateRecommendations(userId) {
        const recomendaciones = [];
        const atrasadas = await this.taskModel.getOverdue(userId);
        if (atrasadas.length > 0) recomendaciones.push({ id: uuidv4(), user_id: userId, task_id: atrasadas[0].id, tipo: 'urgente', titulo: '⚠️ Tarea Atrasada', descripcion: `La tarea "${atrasadas[0].titulo}" está atrasada desde ${atrasadas[0].fecha_vencimiento}`, razon: 'La tarea no ha sido completada y pasó su fecha de vencimiento', confianza: 0.95 });
        const proximas = await this.taskModel.getUpcoming(userId, 2);
        if (proximas.length > 0) recomendaciones.push({ id: uuidv4(), user_id: userId, task_id: proximas[0].id, tipo: 'proximamente', titulo: '📅 Tarea Próxima a Vencer', descripcion: `La tarea "${proximas[0].titulo}" vence el ${proximas[0].fecha_vencimiento}`, razon: 'La tarea vence en los próximos 2 días', confianza: 0.8 });
        const completadas = await this.taskModel.getCompleted(userId, 1);
        if (completadas.length > 0) recomendaciones.push({ id: uuidv4(), user_id: userId, task_id: null, tipo: 'felicitacion', titulo: '🎉 ¡Excelente Progreso!', descripcion: `Completaste ${completadas.length} tarea(s) hoy. ¡Sigue así!`, razon: 'Refuerzo positivo por tareas completadas', confianza: 1.0 });
        const tareasActivas = await this.taskModel.getByUserId(userId);
        for (const task of tareasActivas) { if (task.estado !== 'completada') { const deps = await this.taskModel.getDependencies(task.id); if (deps.length > 0) { const pendientes = deps.filter(d => d.estado !== 'completada'); if (pendientes.length > 0) { recomendaciones.push({ id: uuidv4(), user_id: userId, task_id: task.id, tipo: 'bloqueada', titulo: '🚫 Tarea Bloqueada por Dependencias', descripcion: `"${task.titulo}" está esperando que completes ${pendientes.length} tarea(s) primero`, razon: `Hay ${pendientes.length} dependencia(s) sin resolver`, confianza: 0.9 }); break; } } } }
        return recomendaciones;
    }

    async saveRecommendation(recomendacion) { const sql = `INSERT INTO ai_recommendations (id, user_id, task_id, tipo, titulo, descripcion, razon, confianza) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`; const valores = [recomendacion.id, recomendacion.user_id, recomendacion.task_id, recomendacion.tipo, recomendacion.titulo, recomendacion.descripcion, recomendacion.razon, recomendacion.confianza]; await this.db.run(sql, valores); }

    async getPendingRecommendations(userId) { const sql = `SELECT * FROM ai_recommendations WHERE user_id = ? AND aceptada IS NULL ORDER BY confianza DESC, fecha_creacion DESC LIMIT 5`; return this.db.all(sql, [userId]); }

    async recordFeedback(recommendationId, accepted) { const sql = `UPDATE ai_recommendations SET aceptada = ?, fecha_respuesta = CURRENT_TIMESTAMP WHERE id = ?`; await this.db.run(sql, [accepted, recommendationId]); }

    async getInsights(userId) {
        const stats = await this.db.get(`SELECT COUNT(*) as total_tareas, SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas, SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes, AVG(tiempo_estimado) as promedio_tiempo_est, AVG(tiempo_realizado) as promedio_tiempo_real FROM tasks WHERE user_id = ?`, [userId]);
        const porPrioridad = await this.db.all(`SELECT prioridad, COUNT(*) as cantidad FROM tasks WHERE user_id = ? AND estado != 'completada' GROUP BY prioridad`, [userId]);
        const proximas = await this.taskModel.getUpcoming(userId, 7);
        return { resumen: { total: stats.total_tareas || 0, completadas: stats.completadas || 0, pendientes: stats.pendientes || 0, tasa_completitud: stats.total_tareas > 0 ? Math.round((stats.completadas / stats.total_tareas) * 100) : 0 }, porPrioridad, proximasVencer: proximas.slice(0, 5), tiempoPromedio: { estimado: Math.round(stats.promedio_tiempo_est) || 0, realizado: Math.round(stats.promedio_tiempo_real) || 0 } };
    }

    async suggestReschedule(taskId) { const task = await this.taskModel.getById(taskId); if (task.fecha_vencimiento && new Date(task.fecha_vencimiento) < new Date()) { return { sugerencia: 'reprogramar', razon: 'La tarea está atrasada', nuevaFecha: new Date().toISOString().split('T')[0], diasAdelantar: 3 }; } return null; }
}

module.exports = AIService;
