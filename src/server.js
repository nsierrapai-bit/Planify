// src/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config/config');
const Database = require('./database/init');

// Importar modelos
const User = require('./models/User');
const Task = require('./models/Task');
const CalendarEvent = require('./models/CalendarEvent');

// Importar servicios
const AuthService = require('./services/authService');
const AIService = require('./services/aiService');
const ActivityLogService = require('./services/activityLogService');

// Importar controladores
const AuthController = require('./controllers/authController');
const TasksController = require('./controllers/tasksController');
const AIController = require('./controllers/aiController');
const CalendarController = require('./controllers/calendarController');

// Importar middleware
const { authMiddleware, errorHandler } = require('./middleware/auth');

const app = express();
let db;
let authService;
let aiService;
let taskModel;
let userModel;
let activityLog;
let calendarModel;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor Planify funcionando ✅', timestamp: new Date().toISOString(), environment: config.server.nodeEnv });
});

app.get('/api/info', (req, res) => {
    res.json({ name: 'Planify API', version: '1.0.0', description: 'API para calendario inteligente con IA' });
});

// Auth routes
app.post('/api/auth/register', async (req, res, next) => {
    try {
        const controller = new AuthController(authService, activityLog);
        await controller.register(req, res, next);
    } catch (err) { next(err); }
});

app.post('/api/auth/login', async (req, res, next) => {
    try {
        const controller = new AuthController(authService, activityLog);
        await controller.login(req, res, next);
    } catch (err) { next(err); }
});

app.get('/api/auth/register', (req, res) => {
    res.json({ message: 'Usa POST en /api/auth/register con email, nombre, password y passwordConfirm para crear un usuario.' });
});

app.get('/api/auth/login', (req, res) => {
    res.json({ message: 'Usa POST en /api/auth/login con email y password para iniciar sesión.' });
});

app.post('/api/auth/logout', authMiddleware(authService), async (req, res, next) => {
    try { const controller = new AuthController(authService, activityLog); await controller.logout(req, res, next); } catch (err) { next(err); }
});

app.get('/api/auth/verify', authMiddleware(authService), async (req, res, next) => {
    try { const controller = new AuthController(authService, activityLog); await controller.verify(req, res, next); } catch (err) { next(err); }
});

// Tasks
app.get('/api/tasks', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.getTasks(req, res, next); } catch (err) { next(err); } });
app.post('/api/tasks', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.createTask(req, res, next); } catch (err) { next(err); } });
app.get('/api/tasks/:id', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.getTask(req, res, next); } catch (err) { next(err); } });
app.put('/api/tasks/:id', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.updateTask(req, res, next); } catch (err) { next(err); } });
app.delete('/api/tasks/:id', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.deleteTask(req, res, next); } catch (err) { next(err); } });
app.get('/api/tasks/status/pending', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.getPendingTasks(req, res, next); } catch (err) { next(err); } });
app.get('/api/tasks/status/overdue', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.getOverdueTasks(req, res, next); } catch (err) { next(err); } });
app.get('/api/tasks/upcoming', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.getUpcomingTasks(req, res, next); } catch (err) { next(err); } });
app.get('/api/tasks/date/:fecha', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.getTasksByDate(req, res, next); } catch (err) { next(err); } });
app.patch('/api/tasks/:id/complete', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.completeTask(req, res, next); } catch (err) { next(err); } });
app.get('/api/tasks/stats/summary', authMiddleware(authService), async (req, res, next) => { try { const controller = new TasksController(taskModel, aiService, activityLog); await controller.getStats(req, res, next); } catch (err) { next(err); } });

// AI routes
app.get('/api/ai/recommendations', authMiddleware(authService), async (req, res, next) => { try { const controller = new AIController(aiService, taskModel, activityLog); await controller.getRecommendations(req, res, next); } catch (err) { next(err); } });
app.get('/api/ai/ranked-tasks', authMiddleware(authService), async (req, res, next) => { try { const controller = new AIController(aiService, taskModel, activityLog); await controller.getRankedTasks(req, res, next); } catch (err) { next(err); } });
app.post('/api/ai/optimize-schedule', authMiddleware(authService), async (req, res, next) => { try { const controller = new AIController(aiService, taskModel, activityLog); await controller.optimizeSchedule(req, res, next); } catch (err) { next(err); } });
app.post('/api/ai/reprioritize', authMiddleware(authService), async (req, res, next) => { try { const controller = new AIController(aiService, taskModel, activityLog); await controller.reprioritizeTasks(req, res, next); } catch (err) { next(err); } });
app.get('/api/ai/insights', authMiddleware(authService), async (req, res, next) => { try { const controller = new AIController(aiService, taskModel, activityLog); await controller.getInsights(req, res, next); } catch (err) { next(err); } });
app.get('/api/ai/focus-plan', authMiddleware(authService), async (req, res, next) => { try { const controller = new AIController(aiService, taskModel, activityLog); await controller.getFocusPlan(req, res, next); } catch (err) { next(err); } });
app.get('/api/ai/problem-detection', authMiddleware(authService), async (req, res, next) => { try { const controller = new AIController(aiService, taskModel, activityLog); await controller.detectProblems(req, res, next); } catch (err) { next(err); } });
app.get('/api/ai/productivity-metrics', authMiddleware(authService), async (req, res, next) => { try { const controller = new AIController(aiService, taskModel, activityLog); await controller.getProductivityMetrics(req, res, next); } catch (err) { next(err); } });
app.post('/api/ai/recommendations/:id/feedback', authMiddleware(authService), async (req, res, next) => { try { const controller = new AIController(aiService, taskModel, activityLog); await controller.recordFeedback(req, res, next); } catch (err) { next(err); } });

// Calendar routes
app.get('/api/calendar', authMiddleware(authService), async (req, res, next) => { try { const controller = new CalendarController(calendarModel, aiService, activityLog); await controller.getEvents(req, res, next); } catch (err) { next(err); } });
app.post('/api/calendar', authMiddleware(authService), async (req, res, next) => { try { const controller = new CalendarController(calendarModel, aiService, activityLog); await controller.createEvent(req, res, next); } catch (err) { next(err); } });
app.put('/api/calendar/:id', authMiddleware(authService), async (req, res, next) => { try { const controller = new CalendarController(calendarModel, aiService, activityLog); await controller.updateEvent(req, res, next); } catch (err) { next(err); } });
app.delete('/api/calendar/:id', authMiddleware(authService), async (req, res, next) => { try { const controller = new CalendarController(calendarModel, aiService, activityLog); await controller.deleteEvent(req, res, next); } catch (err) { next(err); } });
app.post('/api/calendar/suggest', authMiddleware(authService), async (req, res, next) => { try { const controller = new CalendarController(calendarModel, aiService, activityLog); await controller.suggestFromAI(req, res, next); } catch (err) { next(err); } });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/app.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'app.js'));
});

app.use((req, res) => { res.status(404).json({ error: 'Not Found', message: `La ruta ${req.method} ${req.path} no existe` }); });
app.use(errorHandler);

async function startServer() {
    try {
        db = new Database(config.database.path);
        await db.connect();
        await db.initialize();

        userModel = new User(db);
        taskModel = new Task(db);
        calendarModel = new CalendarEvent(db);

        authService = new AuthService(userModel);
        aiService = new AIService(db, taskModel);
        activityLog = new ActivityLogService(db);

        const existingUsers = await userModel.getAll();
        if (!existingUsers.length) {
            const defaultEmail = 'admin@planify.app';
            const defaultPassword = '123456';
            await userModel.create(defaultEmail, 'Admin', defaultPassword);
            console.log(`Usuario inicial creado: ${defaultEmail} / ${defaultPassword}`);
        }

        const PORT = config.server.port;
        const HOST = config.server.host;

        app.listen(PORT, HOST, () => {
            console.log(`Servidor listo en http://${HOST}:${PORT}`);
        });
    } catch (error) {
        console.error('Error al iniciar servidor:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
