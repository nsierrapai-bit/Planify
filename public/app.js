const apiUrl = window.location.origin;
const authPage = document.getElementById('authPage');
const dashboardPage = document.getElementById('dashboardPage');
let currentUser = null;
let currentCalendarMonth = new Date();
let currentTaskView = 'today';
let isLoadingSection = false;

// Elementos del dashboard
const tasksListEl = document.getElementById('tasksList');
const recommendationsEl = document.getElementById('recommendationsList');
const rankedTasksEl = document.getElementById('rankedTasksList');
const focusPlanEl = document.getElementById('focusPlanResult');
const allEventsListEl = document.getElementById('allEventsList');
const userNameDisplay = document.getElementById('userNameDisplay');

function setToken(token) {
    if (!token || token === 'null' || token === 'undefined') {
        localStorage.removeItem('planify_token');
        return;
    }
    localStorage.setItem('planify_token', token);
}

function getToken() {
    const token = localStorage.getItem('planify_token');
    if (!token || token === 'null' || token === 'undefined') return null;
    return token;
}

function clearToken() {
    localStorage.removeItem('planify_token');
    localStorage.removeItem('planify_user');
    setToken(null);
    setUser(null);
    location.reload();
}

function setUser(user) {
    currentUser = user;
    if (!user) {
        userNameDisplay.textContent = 'Usuario';
        authPage.classList.remove('hidden');
        dashboardPage.classList.add('hidden');
        return;
    }
    localStorage.setItem('planify_user', JSON.stringify(user));
    userNameDisplay.textContent = user.nombre || user.email;
    authPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
}

function getUser() {
    const stored = localStorage.getItem('planify_user');
    if (!stored) return null;
    try { return JSON.parse(stored); } catch (err) { return null; }
}

async function request(path, options = {}) {
    const token = getToken();
    const headers = options.headers || {};
    headers['Content-Type'] = 'application/json';
    if (!path.startsWith('/api/auth') && !token) {
        throw new Error('Token no proporcionado');
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(apiUrl + path, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
        if (res.status === 401) {
            clearToken();
            setUser(null);
        }
        throw new Error(data.message || 'Error API');
    }
    return data;
}

function switchAuthTab(tab) {
    const tabButtons = document.querySelectorAll('.auth-tabs button');
    tabButtons.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (tab === 'login') {
        if (tabButtons[0]) tabButtons[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        if (tabButtons[1]) tabButtons[1].classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }
}

async function verifySession() {
    const token = getToken();
    if (!token) {
        setUser(null);
        return false;
    }
    try {
        const result = await request('/api/auth/verify');
        const user = getUser();
        if (user) {
            setUser(user);
        } else {
            setUser({ nombre: `Usuario ${result.userId.slice(0, 6)}` });
        }
        await loadDashboard();
        return true;
    } catch (err) {
        setUser(null);
        return false;
    }
}

async function registerUser(event) {
    event.preventDefault();
    try {
        const email = document.getElementById('registerEmail').value.trim();
        const nombre = document.getElementById('registerName').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        if (!email || !nombre || !password || !passwordConfirm) {
            alert('Completa todos los campos de registro');
            return;
        }
        if (password !== passwordConfirm) {
            alert('Las contraseñas no coinciden');
            return;
        }
        const result = await request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, nombre, password, passwordConfirm })
        });
        setToken(result.token);
        setUser(result.usuario);
        document.getElementById('registerForm').reset();
        await loadDashboard();
        showSection('today');
    } catch (err) {
        alert('Error en registro: ' + err.message);
    }
}

async function loginUser(event) {
    event.preventDefault();
    try {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) {
            alert('Introduce email y contraseña para iniciar sesión');
            return;
        }
        const result = await request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        setToken(result.token);
        setUser(result.usuario);
        document.getElementById('loginForm').reset();
        await loadDashboard();
        showSection('today');
    } catch (err) {
        alert('Error en login: ' + err.message);
    }
}

function formatEventDateRange(event) {
    const inicio = new Date(event.fecha_inicio).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const fin = new Date(event.fecha_fin).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    return `${inicio} → ${fin}`;
}

function renderTasks(tasks) {
    if (!tasks || !tasks.length) {
        tasksListEl.innerHTML = '<div class="empty-state"><p>No hay tareas o eventos en esta vista.</p></div>';
        return;
    }
    tasksListEl.innerHTML = tasks.map(task => {
        const isEvent = task.tipo === 'evento';
        const checkbox = isEvent ? '<input type="checkbox" disabled>' : `<input type="checkbox" ${task.estado === 'completada' ? 'checked' : ''} onclick="completeTask('${task.id}')">`;
        const metaTags = [];
        if (!isEvent) metaTags.push(`<span class="tag ${task.prioridad || 'media'}">${task.prioridad || 'media'}</span>`);
        if (task.fecha_vencimiento) metaTags.push(`<span class="task-meta">Vence: ${task.fecha_vencimiento}</span>`);
        if (isEvent) metaTags.push(`<span class="task-meta">Evento</span>`);
        if (task.fecha_inicio && task.fecha_fin) metaTags.push(`<span class="task-meta">${formatEventDateRange(task)}</span>`);
        if (task.ia_score) metaTags.push(`<span class="task-meta">Score: ${Math.round(task.ia_score.puntuacion_total)}</span>`);
        return `
        <div class="task-item">
            ${checkbox}
            <div class="task-content">
                <div class="task-title">${task.titulo}</div>
                <div class="task-meta">
                    ${metaTags.join('')}
                </div>
            </div>
            ${isEvent ? '' : `<button class="delete-btn" onclick="deleteTask('${task.id}')">Eliminar</button>`}
        </div>
        `;
    }).join('');
}

function renderRecommendations(recs) {
    if (!recs || !recs.length) {
        recommendationsEl.innerHTML = '<div class="empty-state"><p>Sin recomendaciones.</p></div>';
        return;
    }
    recommendationsEl.innerHTML = recs.map(rec => `
        <div class="card">
            <h4>${rec.titulo}</h4>
            <p style="margin: 8px 0; font-size: 12px; color: var(--text-muted);">${rec.descripcion}</p>
        </div>
    `).join('');
}

function renderRankedTasks(tasks) {
    if (!tasks || !tasks.length) {
        rankedTasksEl.innerHTML = '<div class="empty-state"><p>Sin tareas.</p></div>';
        return;
    }
    rankedTasksEl.innerHTML = tasks.map((task, idx) => `
        <div class="task-item">
            <div style="font-weight: 700; color: var(--primary); min-width: 30px;">${idx + 1}.</div>
            <div class="task-content">
                <div class="task-title">${task.titulo}</div>
                <div class="task-meta">
                    ${task.puntuacion ? `<span>Score: ${Math.round(task.puntuacion.puntuacion_total)}</span>` : ''}
                    ${task.prioridad ? `<span class="tag ${task.prioridad}">${task.prioridad}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

async function submitEvent() {
    try {
        const titulo = document.getElementById('eventTitle').value.trim();
        const descripcion = document.getElementById('eventDescription').value.trim();
        const fecha_inicio = document.getElementById('eventStart').value;
        const fecha_fin = document.getElementById('eventEnd').value;
        const prioridad = document.getElementById('eventPriority').value;
        const recordatorio = Number(document.getElementById('eventReminder').value);
        if (!titulo || !fecha_inicio || !fecha_fin) {
            alert('Título, fecha de inicio y fecha de fin son obligatorios');
            return;
        }
        await request('/api/calendar', {
            method: 'POST',
            body: JSON.stringify({ titulo, descripcion, fecha_inicio, fecha_fin, prioridad, recordatorio })
        });
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventStart').value = '';
        document.getElementById('eventEnd').value = '';
        document.getElementById('eventPriority').value = 'media';
        document.getElementById('eventReminder').value = 15;
        alert('Evento creado con éxito');
        await loadCalendarMonth(0);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function createTask() {
    try {
        const titulo = document.getElementById('taskTitle').value.trim();
        const prioridad = document.getElementById('taskPriority').value;
        const urgencia = document.getElementById('taskUrgency').value;
        const fecha_vencimiento = document.getElementById('taskDueDate').value;
        const tiempo_estimado = Number(document.getElementById('taskEstimatedTime').value);
        if (!titulo) {
            alert('El título de la tarea es obligatorio');
            return;
        }
        await request('/api/tasks', {
            method: 'POST',
            body: JSON.stringify({ titulo, prioridad, urgencia, fecha_vencimiento, tiempo_estimado })
        });
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskPriority').value = 'media';
        document.getElementById('taskUrgency').value = 'normal';
        document.getElementById('taskDueDate').value = '';
        document.getElementById('taskEstimatedTime').value = 30;
        alert('Tarea creada con éxito');
        await loadTasks(currentTaskView);
        await loadCalendarMonth(0);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function completeTask(taskId) {
    try {
        await request(`/api/tasks/${taskId}/complete`, { method: 'PATCH' });
        await loadTasks();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function deleteTask(taskId) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
        await request(`/api/tasks/${taskId}`, { method: 'DELETE' });
        await loadTasks();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function convertCalendarEventToTask(event) {
    return {
        id: `evento-${event.id}`,
        titulo: event.titulo,
        descripcion: event.descripcion,
        fecha_vencimiento: event.fecha_inicio.split('T')[0],
        fecha_inicio: event.fecha_inicio,
        fecha_fin: event.fecha_fin,
        prioridad: event.prioridad || 'media',
        urgencia: 'normal',
        tipo: 'evento',
        estado: 'evento'
    };
}

async function loadTasks(view = currentTaskView) {
    try {
        currentTaskView = view;
        let tasksPromise;
        let calendarPromise;

        if (view === 'today') {
            const today = new Date().toISOString().split('T')[0];
            tasksPromise = request(`/api/tasks?fecha_desde=${today}&fecha_hasta=${today}`);
            calendarPromise = request(`/api/calendar?date=${today}`);
        } else if (view === 'upcoming') {
            const start = new Date();
            const end = new Date();
            end.setDate(end.getDate() + 14);
            tasksPromise = request('/api/tasks/upcoming?dias=14');
            calendarPromise = request(`/api/calendar?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
        } else if (view === 'all') {
            tasksPromise = request('/api/tasks');
            calendarPromise = request('/api/calendar');
        } else {
            tasksPromise = request('/api/tasks');
            calendarPromise = request('/api/calendar');
        }

        const [tasksResult, calendarResult] = await Promise.all([tasksPromise, calendarPromise]);
        const taskItems = tasksResult.tareas || [];
        const eventItems = (calendarResult.eventos || []).map(convertCalendarEventToTask);
        const merged = [...taskItems, ...eventItems];
        merged.sort((a, b) => {
            const aDate = a.fecha_vencimiento || a.fecha_inicio || '';
            const bDate = b.fecha_vencimiento || b.fecha_inicio || '';
            if (aDate < bDate) return -1;
            if (aDate > bDate) return 1;
            return (a.titulo || '').localeCompare(b.titulo || '');
        });
        renderTasks(merged);
    } catch (err) {
        console.error(err);
    }
}

async function loadRecommendations() {
    if (isLoadingSection) return;
    isLoadingSection = true;
    try {
        const [recommendationsResult, rankedResult] = await Promise.all([
            request('/api/ai/recommendations'),
            request('/api/ai/ranked-tasks')
        ]);
        renderRecommendations(recommendationsResult.recomendaciones || []);
        renderRankedTasks(rankedResult.tareas || []);
        showSection('recommendations');
    } catch (err) {
        console.error(err);
    } finally {
        isLoadingSection = false;
    }
}

async function loadRankedTasks() {
    try {
        const result = await request('/api/ai/ranked-tasks');
        renderRankedTasks(result.tareas || []);
    } catch (err) {
        console.error(err);
    }
}

async function loadFocusPlan() {
    if (isLoadingSection) return;
    isLoadingSection = true;
    try {
        const result = await request('/api/ai/focus-plan');
        if (result.plan && result.plan.length) {
            focusPlanEl.innerHTML = result.plan.map(item => `
                <div class="card" style="margin-bottom: 12px;">
                    <h4 style="margin: 0 0 8px 0; color: var(--primary);">Paso ${item.paso}: ${item.titulo}</h4>
                    <p style="margin: 4px 0;"><strong>${item.duracion_minutos} min</strong></p>
                    <p style="margin: 4px 0; font-size: 12px; color: var(--text-muted);">${item.descripcion}</p>
                </div>
            `).join('');
        } else {
            focusPlanEl.innerHTML = '<div class="empty-state"><p>No hay un plan de enfoque disponible. Crea algunas tareas primero.</p></div>';
        }
        showSection('focusPlan');
    } catch (err) {
        console.error(err);
    } finally {
        isLoadingSection = false;
    }
}

function renderMonthlyCalendar(events, tasks, date) {
    const monthTitle = document.getElementById('calendarMonthTitle');
    monthTitle.textContent = `${date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`;
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const grid = document.getElementById('monthlyCalendarView');
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    let html = `<div class="calendar-grid">`;
    dayNames.forEach(d => {
        html += `<div class="calendar-day-header">${d}</div>`;
    });
    for (let blank = 0; blank < firstDay; blank++) {
        html += '<div class="calendar-day other-month"></div>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
        const dateKey = currentDate.toISOString().split('T')[0];
        const dayEvents = events.filter(e => e.fecha_inicio.startsWith(dateKey));
        const dayTasks = tasks.filter(t => t.fecha_vencimiento === dateKey);
        html += `<div class="calendar-day">
                <div class="calendar-day-number">${day}</div>
                ${dayEvents.slice(0, 1).map(ev => `<div class="calendar-event">${ev.titulo}</div>`).join('')}
                ${dayTasks.slice(0, 1).map(task => `<div class="calendar-event" style="background:#f0f4ff;color:#1e3a8a;">${task.titulo}</div>`).join('')}
                ${dayEvents.length + dayTasks.length > 2 ? `<div style="font-size: 10px; color: var(--text-muted);">+${dayEvents.length + dayTasks.length - 2}</div>` : ''}
            </div>`;
    }
    html += '</div>';
    grid.innerHTML = html;
}

async function renderEventsList(events, tasks) {
    const rows = [];
    if (tasks && tasks.length) {
        rows.push('<div><strong>Tareas con fecha:</strong></div>');
        tasks.forEach(task => {
            rows.push(`<div class="calendar-event" style="background: #f0f4ff; color: #1e3a8a; margin-bottom: 6px;">${task.titulo} (${task.fecha_vencimiento})</div>`);
        });
    }
    if (events && events.length) {
        rows.push('<div style="margin-top: 12px;"><strong>Eventos:</strong></div>');
        events.forEach(evento => {
            const fechaFormato = new Date(evento.fecha_inicio).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
            rows.push(`<div class="calendar-event">${evento.titulo} <span style="font-size:11px; color: var(--text-muted);">${fechaFormato}</span></div>`);
        });
    }
    if (!rows.length) {
        allEventsListEl.innerHTML = '<div class="empty-state"><p>No hay eventos o tareas programadas para este mes.</p></div>';
        return;
    }
    allEventsListEl.innerHTML = rows.join('');
}

async function loadCalendarMonth(direction = 0) {
    try {
        if (direction !== 0) {
            currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + direction);
        }
        const start = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 0, 23, 59, 59, 999);
        const [calendarResult, tasksResult] = await Promise.all([
            request(`/api/calendar?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`),
            request(`/api/tasks?fecha_desde=${start.toISOString().split('T')[0]}&fecha_hasta=${end.toISOString().split('T')[0]}`)
        ]);
        renderMonthlyCalendar(calendarResult.eventos || [], tasksResult.tareas || [], currentCalendarMonth);
        renderEventsList(calendarResult.eventos || [], tasksResult.tareas || []);
    } catch (err) {
        console.error(err);
    }
}

function changeCalendarMonth(direction) {
    loadCalendarMonth(direction);
}

async function suggestCalendarEvents() {
    try {
        await request('/api/calendar/suggest', { method: 'POST' });
        alert('Eventos sugeridos por IA agregados al calendario');
        await loadCalendarMonth(0);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function loadDashboard() {
    await Promise.all([
        loadTasks(),
        loadCalendarMonth(0)
    ]);
}

function showSection(section) {
    document.getElementById('todaySection').classList.add('hidden');
    document.getElementById('calendarSection').classList.add('hidden');
    document.getElementById('focusPlanSection').classList.add('hidden');
    document.getElementById('recommendationsSection').classList.add('hidden');

    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));

    if (section === 'today') {
        document.getElementById('todaySection').classList.remove('hidden');
        document.querySelectorAll('.sidebar-btn')[0].classList.add('active');
        loadTasks('today');
    } else if (section === 'upcoming') {
        document.getElementById('todaySection').classList.remove('hidden');
        document.querySelectorAll('.sidebar-btn')[1].classList.add('active');
        loadTasks('upcoming');
    } else if (section === 'all') {
        document.getElementById('todaySection').classList.remove('hidden');
        document.querySelectorAll('.sidebar-btn')[2].classList.add('active');
        loadTasks('all');
    } else if (section === 'calendar') {
        document.getElementById('calendarSection').classList.remove('hidden');
        document.querySelectorAll('.sidebar-btn')[3].classList.add('active');
    } else if (section === 'focusPlan') {
        document.getElementById('focusPlanSection').classList.remove('hidden');
        document.querySelectorAll('.sidebar-btn')[4].classList.add('active');
        loadFocusPlan();
    } else if (section === 'recommendations') {
        document.getElementById('recommendationsSection').classList.remove('hidden');
        document.querySelectorAll('.sidebar-btn')[5].classList.add('active');
        loadRecommendations();
    }
}

// Exponer funciones necesarias al contexto global (formularios y botones inline)
window.switchAuthTab = switchAuthTab;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.createTask = createTask;
window.submitEvent = submitEvent;
window.showSection = showSection;
window.changeCalendarMonth = changeCalendarMonth;
window.loadFocusPlan = loadFocusPlan;
window.loadRecommendations = loadRecommendations;
window.clearToken = clearToken;
window.completeTask = completeTask;
window.deleteTask = deleteTask;

setUser(getUser());
setToken(getToken());
verifySession();
