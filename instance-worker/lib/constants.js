export const CONFIG_STORAGE_KEY = 'config_json'
export const WORKSPACE_STORAGE_PREFIX = 'workspace:'

export const CRON_BACKUP_ALARM_MS = 5 * 60 * 1000
export const AUTO_RESTART_DELAY_MS = 3 * 1000

export const PENDING_RESTART_KEY = 'pendingRestart'
export const USER_REQUESTED_STOP_KEY = 'userRequestedStop'
export const PERSIST_STORAGE_PREFIX = 'persist:'

// Keep-alive (mirrors sandbox-sdk's keepAlive flag behavior)
export const KEEPALIVE_ENABLED_KEY = 'keepAliveEnabled'
export const KEEPALIVE_INTERVAL_MS = 30 * 1000
export const KEEPALIVE_NEXT_AT_KEY = 'keepAliveNextAt'
export const BACKUP_NEXT_AT_KEY = 'backupNextAt'
export const FIXED_PERSIST_PATHS = [
    'cron/jobs.json',
    'state/state.json',
    'auth.json',
]
