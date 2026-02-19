// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-09-19',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@kgierke/nuxt-basic-auth', 'nitro-cloudflare-dev', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'cloudflare_pages',
    prerender: {
      autoSubfolderIndex: false,
    },
  },
})