/**
 * Get the application's base URL
 * Uses AUTH_URL if set, falls back to RENDER_EXTERNAL_URL on Render,
 * or defaults to localhost for development
 */
export function getAppUrl(): string {
    return (
        process.env.AUTH_URL ||
        (process.env.RENDER_EXTERNAL_URL
            ? `https://${process.env.RENDER_EXTERNAL_URL}`
            : null) ||
        'http://localhost:3000'
    );
}
