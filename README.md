# Planify - Calendario IA

Instrucciones rápidas:

1. Instalar dependencias:

```bash
npm install
```

2. Crear un `.env` (opcional):

```
PORT=3000
HOST=localhost
DB_PATH=./database.db
JWT_SECRET=tu_secreto
```

3. Iniciar servidor:

```bash
npm start
```

4. Abrir en el navegador:

```text
http://localhost:3000
```

La aplicación mostrará una interfaz para registrar, iniciar sesión y crear eventos.

Si la base de datos está vacía, se crea automáticamente un usuario inicial:
- Email: `admin@planify.app`
- Contraseña: `123456`

Endpoints principales:
- `POST /api/auth/register` - registrar
- `POST /api/auth/login` - login
- `GET /api/calendar` - obtener eventos
- `POST /api/calendar` - crear evento
- `POST /api/calendar/suggest` - crear sugerencias IA
