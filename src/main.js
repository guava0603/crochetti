import './assets/main.css'

import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { useAchievementStore } from '@/stores/achievementStore'

// Hash-router deep-link normalization:
// If the app is opened at a path URL like `/user/123` (no hash), Vue Router (hash mode)
// will treat it as `/` and then append `#/home`, resulting in `/user/123#/home`.
// This converts path-based deep links into hash-based ones before the router boots:
// `/user/123` -> `/#/user/123`
// `/user/123#/home` -> `/#/user/123`
try {
	const base = import.meta.env.BASE_URL || '/'
	const normalizedBase = base.endsWith('/') ? base : `${base}/`
	const { origin, pathname, search, hash } = window.location

	const isBasePath = pathname === normalizedBase || pathname === normalizedBase.slice(0, -1)
	const isIndexHtml = pathname === `${normalizedBase}index.html`
	if (!isBasePath && !isIndexHtml) {
		const isLikelyBrokenHash = hash === '#home' || hash === '#/home' || hash === '#'
		const hasNoHashRoute = !hash || hash === '' || hash === '#'

		// If we have a non-base pathname and no meaningful hash route (or a broken #home),
		// prefer the pathname as the route and move it into the hash.
		if (hasNoHashRoute || isLikelyBrokenHash) {
			const innerPath = pathname.startsWith(normalizedBase)
				? pathname.slice(normalizedBase.length - 1)
				: pathname

			if (innerPath && innerPath !== '/' && innerPath !== '/index.html') {
				window.location.replace(`${origin}${normalizedBase}#${innerPath}${search}`)
			}
		}
	}
} catch {
	// ignore
}

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

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)

// Start background stores that need to react to auth state.
useAchievementStore(pinia).start()

app.mount('#app')
