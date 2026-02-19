import { Container } from '@cloudflare/containers'
import {
  AUTO_RESTART_DELAY_MS,
  BACKUP_NEXT_AT_KEY,
  CONFIG_STORAGE_KEY,
  CRON_BACKUP_ALARM_MS,
  KEEPALIVE_ENABLED_KEY,
  KEEPALIVE_INTERVAL_MS,
  KEEPALIVE_NEXT_AT_KEY,
  PENDING_RESTART_KEY,
  USER_REQUESTED_STOP_KEY,
} from './constants.js'
import { backupAllPersisted, restoreAllPersisted } from './persist.js'
import { handlers } from './index.js'
import { injectConfig } from './helpers.js'

export class InstanceContainer extends Container {
  defaultPort = 3000
  enableInternet = true

  proxy(request) {
    return super.fetch(request)
  }

  async getKeepAliveEnabled() {
    const stored = await this.ctx.storage.get(KEEPALIVE_ENABLED_KEY)
    return typeof stored === 'boolean' ? stored : true
  }

  async setKeepAliveEnabled(enabled) {
    await this.ctx.storage.put(KEEPALIVE_ENABLED_KEY, Boolean(enabled))

    if (!this.container?.running) return

    if (enabled) {
      await this.ctx.storage.put(KEEPALIVE_NEXT_AT_KEY, Date.now() + KEEPALIVE_INTERVAL_MS)
    } else {
      await this.ctx.storage.delete(KEEPALIVE_NEXT_AT_KEY)
    }

    await this.scheduleNextAlarm()
  }

  async injectConfigIfPresent() {
    const config = await this.ctx.storage.get(CONFIG_STORAGE_KEY)
    if (typeof config === 'string' && config.length > 0) {
      injectConfig(this, config)
    }
  }

  async keepAlivePing() {
    try {
      await this.injectConfigIfPresent()
      await this.proxy(new Request('http://localhost/health', { method: 'GET' }))
    } catch (err) {
      console.error('KeepAlive ping failed:', err)
    }
  }

  async scheduleNextAlarm() {
    if (!this.container?.running) return

    const now = Date.now()

    let backupNextAt = await this.ctx.storage.get(BACKUP_NEXT_AT_KEY)
    if (typeof backupNextAt !== 'number') {
      backupNextAt = now + CRON_BACKUP_ALARM_MS
      await this.ctx.storage.put(BACKUP_NEXT_AT_KEY, backupNextAt)
    }

    const keepAliveEnabled = await this.getKeepAliveEnabled()
    let keepAliveNextAt = keepAliveEnabled ? await this.ctx.storage.get(KEEPALIVE_NEXT_AT_KEY) : null
    if (keepAliveEnabled && typeof keepAliveNextAt !== 'number') {
      keepAliveNextAt = now + KEEPALIVE_INTERVAL_MS
      await this.ctx.storage.put(KEEPALIVE_NEXT_AT_KEY, keepAliveNextAt)
    }

    const nextAt = Math.min(
      backupNextAt,
      keepAliveEnabled && typeof keepAliveNextAt === 'number' ? keepAliveNextAt : Number.POSITIVE_INFINITY,
    )

    if (Number.isFinite(nextAt)) {
      await this.ctx.storage.setAlarm(nextAt)
    }
  }

  async fetch(request) {
    for (const handler of handlers) {
      const response = await handler(request, this)
      if (response !== null) return response
    }
    return new Response('Not found', { status: 404 })
  }

  async alarm() {
    if (await this.ctx.storage.get(PENDING_RESTART_KEY)) {
      await this.ctx.storage.delete(PENDING_RESTART_KEY)

      try {
        await this.startAndWaitForPorts()
        await restoreAllPersisted(this, 'http://localhost/internal/persist')
        await this.proxy(new Request('http://localhost/internal/start-gateway', { method: 'POST' }))
        const now = Date.now()
        await this.ctx.storage.put(BACKUP_NEXT_AT_KEY, now + CRON_BACKUP_ALARM_MS)
        if (await this.getKeepAliveEnabled()) {
          await this.ctx.storage.put(KEEPALIVE_NEXT_AT_KEY, now + KEEPALIVE_INTERVAL_MS)
        }
        await this.scheduleNextAlarm()
      } catch (err) {
        console.error('Auto-restart failed:', err)
      }
      
      return
    }

    const now = Date.now()

    if (this.container?.running) {
      const keepAliveEnabled = await this.getKeepAliveEnabled()

      if (keepAliveEnabled) {
        const keepAliveNextAt = await this.ctx.storage.get(KEEPALIVE_NEXT_AT_KEY)
        if (typeof keepAliveNextAt !== 'number' || now >= keepAliveNextAt) {
          await this.keepAlivePing()
          await this.ctx.storage.put(KEEPALIVE_NEXT_AT_KEY, now + KEEPALIVE_INTERVAL_MS)
        }
      }

      const backupNextAt = await this.ctx.storage.get(BACKUP_NEXT_AT_KEY)
      if (typeof backupNextAt !== 'number' || now >= backupNextAt) {
        await backupAllPersisted(this)
        await this.ctx.storage.put(BACKUP_NEXT_AT_KEY, now + CRON_BACKUP_ALARM_MS)
      }

      await this.scheduleNextAlarm()
    }
  }

  async onActivityExpired() {
    if (await this.getKeepAliveEnabled()) {
      console.log('Instance activity expired but keepAlive is enabled', { container: this.container })
      return
    }

    await super.onActivityExpired()
  }

  async onError(error) {
    console.log('Instance error:', {
      error,
      container: this.container,
    })
  }

  async onStop(stopParams) {
    const userRequestedStop = await this.ctx.storage.get(USER_REQUESTED_STOP_KEY)

    console.log('Instance stopped with params:', {
      ...stopParams,
      userRequestedStop,
      container: this.container,
    })

    if (userRequestedStop) {
      await this.ctx.storage.delete(USER_REQUESTED_STOP_KEY)
      await this.ctx.storage.delete(BACKUP_NEXT_AT_KEY)
      await this.ctx.storage.delete(KEEPALIVE_NEXT_AT_KEY)
      return
    }

    await this.ctx.storage.put(PENDING_RESTART_KEY, true)
    await this.ctx.storage.setAlarm(Date.now() + AUTO_RESTART_DELAY_MS)
  }
}
