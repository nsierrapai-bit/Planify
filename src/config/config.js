require('dotenv').config();

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    database: {
        path: process.env.DB_PATH || './database.db',
        timeout: process.env.DB_TIMEOUT || 5000
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-key'
    },
    apis: {
        openai: { key: process.env.OPENAI_API_KEY, model: 'gpt-4', maxTokens: 2000 },
        claude: { key: process.env.CLAUDE_API_KEY, model: 'claude-3-sonnet', maxTokens: 2000 }
    },
    logging: { level: process.env.LOG_LEVEL || 'info' },
    ai: { enableRulesEngine: true, enableExternalAPIs: true, confidenceThreshold: 0.7 }
};
