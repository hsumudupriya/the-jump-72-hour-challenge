import { appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs');

/**
 * Get the log file path for today (daily rotation)
 */
function getLogFilePath(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return join(LOG_DIR, `db-queries-${today}.log`);
}

async function ensureLogDir() {
    if (!existsSync(LOG_DIR)) {
        await mkdir(LOG_DIR, { recursive: true });
    }
}

/**
 * Log a database query with its duration and query string
 * Only logs in development mode
 */
export async function logDbQuery(
    query: string,
    params: string,
    duration: number
) {
    // Only log in development mode
    if (process.env.NODE_ENV === 'production') {
        return;
    }

    try {
        await ensureLogDir();
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            durationMs: Math.round(duration * 100) / 100,
            query,
            params,
        };
        await appendFile(getLogFilePath(), JSON.stringify(logEntry) + '\n');
    } catch (error) {
        // Silently fail logging to avoid breaking the app
        console.error('Failed to log db query:', error);
    }
}
