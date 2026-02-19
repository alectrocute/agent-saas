export const DEFAULT_INSTANCE_CONFIG = {
  agents: {
    defaults: {
      model: 'openrouter/openrouter/aurora-alpha',
      workspace: '~/.nanobot/workspace',
      maxTokens: 16384 * 4,
      temperature: 0.7,
      maxToolIterations: 40,
      restrictToWorkspace: false,
    },
  },
  providers: {
    openrouter: {
      apiKey: '',
    },
  },
  channels: {
    telegram: {
      enabled: true,
      token: '',
      proxy: '',
      allowFrom: [
        '8260812981'
      ],
    },
    discord: {
      enabled: false,
      token: 'YOUR_DISCORD_BOT_TOKEN',
      allowFrom: [],
    },
    maixcam: {
      enabled: false,
      host: '0.0.0.0',
      port: 18790,
      allowFrom: [],
    },
    whatsapp: {
      enabled: false,
      bridge_url: 'ws://localhost:3001',
      allowFrom: [],
    },
    feishu: {
      enabled: false,
      appId: '',
      appSecret: '',
      encryptKey: '',
      verificationToken: '',
      allowFrom: [],
    },
    dingtalk: {
      enabled: false,
      clientId: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET',
      allowFrom: [],
    },
    slack: {
      enabled: false,
      botToken: 'xoxb-YOUR-BOT-TOKEN',
      appToken: 'xapp-YOUR-APP-TOKEN',
      allowFrom: [],
    },
    line: {
      enabled: false,
      channelSecret: 'YOUR_LINE_CHANNEL_SECRET',
      channelAccessToken: 'YOUR_LINE_CHANNEL_ACCESS_TOKEN',
      webhookHost: '0.0.0.0',
      webhookPort: 18791,
      webhookPath: '/webhook/line',
      allowFrom: [],
    },
    onebot: { 
      enabled: false,
      wsUrl: 'ws://127.0.0.1:3001',
      accessToken: '',
      reconnectInterval: 5,
      groupTriggerPrefix: [],
      allowFrom: [],
    },
  },
  gateway: {
    port: 18790,
    host: '0.0.0.0',
  },
  tools: {
    cron: {
      execTimeoutMinutes: 10,
    },
    web: {
      brave: {
        enabled: false,
        apiKey: '',
        maxResults: 5,
      },
      duckduckgo: {
        enabled: true,
        maxResults: 5,
      },
    },
  },
} as const

export const DEFAULT_CONFIG_JSON = JSON.stringify(DEFAULT_INSTANCE_CONFIG, null, 2)

export const configHiddenPaths = new Set([
  'agents.defaults.workspace',
  'agents.defaults.model',
  'agents.defaults.maxTokens',
  'agents.defaults.maxToolIterations',
  'agents.defaults.restrictToWorkspace',
  'gateway.host',
  'gateway.port',
  'channels.line',
  'channels.onebot',
  'channels.maixcam',
  'channels.whatsapp',
  'providers.openrouter'
])
