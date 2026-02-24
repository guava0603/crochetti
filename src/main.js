import './assets/main.css'

import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'

if (Capacitor.isNativePlatform() || window.location.protocol === 'capacitor:') {
	document.documentElement.classList.add('is-app')
}

// Prevent double-click / double-tap zoom.
// Note: This also reduces some default browser zoom behaviors on iOS Safari.
document.addEventListener(
	'dblclick',
	(event) => {
		event.preventDefault()
	},
	{ passive: false }
)

// iOS Safari (and WKWebView) gesture-based zoom events.
document.addEventListener(
	'gesturestart',
	(event) => {
		event.preventDefault()
	},
	{ passive: false }
)
document.addEventListener(
	'gesturechange',
	(event) => {
		event.preventDefault()
	},
	{ passive: false }
)
document.addEventListener(
	'gestureend',
	(event) => {
		event.preventDefault()
	},
	{ passive: false }
)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
