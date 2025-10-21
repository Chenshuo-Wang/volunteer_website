import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
// 引入我们的路由配置
import router from './router'

const app = createApp(App)

// 在应用挂载前使用路由
app.use(router)

app.mount('#app')