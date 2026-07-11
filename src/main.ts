import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { vPermission } from './directives/permission'
import './assets/main.css'

const app = createApp(App)

app.directive('permission', vPermission)
app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
