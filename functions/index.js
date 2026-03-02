/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require('firebase-functions')
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')

const admin = require('firebase-admin')
const { DEFAULT_ACHIEVEMENTS } = require('./achievements/defaults')

admin.initializeApp()

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 })

async function getAchievementBackfillKey() {
	// This doc is not readable by clients (rules default deny), but can be set by
	// a developer in the Firebase console for one-time maintenance.
	const snap = await admin.firestore().doc('_maintenance/achievements').get()
	if (!snap.exists) return null
	const data = snap.data() || {}
	const key = data.backfillKey != null ? String(data.backfillKey) : ''
	return key.trim() || null
}

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.isPublic = onCall({ cors: true }, async (request) => {
	const projectId = request?.data?.project_id
	if (typeof projectId !== 'string' || !projectId.trim()) {
		throw new HttpsError('invalid-argument', 'Missing project_id')
	}

	const snap = await admin
		.firestore()
		.collection('projects')
		.doc(projectId.trim())
		.get()

	if (!snap.exists) {
		return { allowed: false, reason: 'not-found' }
	}

	const data = snap.data() || {}
	const isPublic = data.is_public === true
	const uid = request?.auth?.uid
	const isAuthor = Boolean(uid && data.authorId && uid === data.authorId)

	return {
		allowed: isPublic || isAuthor,
		is_public: isPublic,
		is_author: isAuthor,
	}
})

/**
 * One-time utility: backfill `publishedDate` for achievements that are missing it.
 *
 * Security: requires an authenticated caller with custom claim `admin: true`.
 *
 * Params:
 * - dryRun?: boolean
 * - limit?: number (default 500)
 */
exports.backfillAchievementPublishMetadata = onCall({ cors: true }, async (request) => {
	if (!request?.auth?.uid) {
		throw new HttpsError('unauthenticated', 'Authentication required')
	}
	if (request?.auth?.token?.admin !== true) {
		const expectedKey = await getAchievementBackfillKey()
		const providedKey = request?.data?.key != null ? String(request.data.key) : ''
		if (!expectedKey || providedKey !== expectedKey) {
			throw new HttpsError('permission-denied', 'Admin only')
		}
	}

	const dryRun = Boolean(request?.data?.dryRun)
	const limitRaw = request?.data?.limit
	const limit = Math.max(1, Math.min(5000, Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 500))

	const col = admin.firestore().collection('achievements')
	const snap = await col.limit(limit).get()

	let checked = 0
	let toUpdate = 0

	const batch = admin.firestore().batch()

	for (const docSnap of snap.docs) {
		checked += 1
		const data = docSnap.data() || {}
		const hasPublished = Boolean(
			data.publishedDate || data.publishedAt || data.published_at || data.published_date
		)
		if (hasPublished) continue
		toUpdate += 1

		if (!dryRun) {
			batch.set(
				docSnap.ref,
				{
					publishedDate: admin.firestore.FieldValue.serverTimestamp(),
				},
				{ merge: true }
			)
		}
	}

	if (!dryRun && toUpdate > 0) {
		await batch.commit()
	}

	return {
		checked,
		updated: toUpdate,
		dryRun,
		limit,
	}
})

/**
 * HTTP variant for maintenance (easy to run via curl).
 * Security: requires `ACHIEVEMENT_BACKFILL_KEY` in `?key=` or `x-backfill-key` header.
 */
exports.backfillAchievementPublishMetadataHttp = onRequest({ cors: true }, async (req, res) => {
	if (req.method !== 'POST') {
		res.status(405).json({ ok: false, error: 'method-not-allowed' })
		return
	}

	const expectedKey = await getAchievementBackfillKey()
	const providedKey = (req.query?.key != null ? String(req.query.key) : '') || String(req.get('x-backfill-key') || '')
	if (!expectedKey || providedKey !== expectedKey) {
		res.status(403).json({ ok: false, error: 'forbidden' })
		return
	}

	const dryRun = String(req.query?.dryRun || '').toLowerCase() === 'true'
	const limitRaw = req.query?.limit
	const limit = Math.max(1, Math.min(5000, Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 500))

	const col = admin.firestore().collection('achievements')
	const snap = await col.limit(limit).get()

	let checked = 0
	let toUpdate = 0

	const batch = admin.firestore().batch()

	for (const docSnap of snap.docs) {
		checked += 1
		const data = docSnap.data() || {}
		const hasPublished = Boolean(
			data.publishedDate || data.publishedAt || data.published_at || data.published_date
		)
		if (hasPublished) continue
		toUpdate += 1

		if (!dryRun) {
			batch.set(
				docSnap.ref,
				{
					publishedDate: admin.firestore.FieldValue.serverTimestamp(),
				},
				{ merge: true }
			)
		}
	}

	if (!dryRun && toUpdate > 0) {
		await batch.commit()
	}

	res.json({ ok: true, checked, updated: toUpdate, dryRun, limit })
})

/**
 * Seed initial achievements.
 *
 * Why: `/achievements` is read-only from clients (by rules). If you have no
 * achievement documents yet, users cannot earn anything.
 *
 * Security: requires maintenance key stored in Firestore doc `_maintenance/achievements`:
 *   { backfillKey: "..." }
 *
 * Usage:
 *  POST /seedAchievementsHttp?key=...&force=true
 */
exports.seedAchievementsHttp = onRequest({ cors: true }, async (req, res) => {
	if (req.method !== 'POST') {
		res.status(405).json({ ok: false, error: 'method-not-allowed' })
		return
	}

	const expectedKey = await getAchievementBackfillKey()
	const providedKey = (req.query?.key != null ? String(req.query.key) : '') || String(req.get('x-backfill-key') || '')
	if (!expectedKey || providedKey !== expectedKey) {
		res.status(403).json({ ok: false, error: 'forbidden' })
		return
	}

	const force = String(req.query?.force || '').toLowerCase() === 'true'

	let requested = null
	try {
		requested = req.body && typeof req.body === 'object' ? req.body.achievements : null
	} catch {
		requested = null
	}

	const list = Array.isArray(requested) && requested.length ? requested : DEFAULT_ACHIEVEMENTS

	function buildPayload(raw) {
		return {
			category: raw?.category != null ? String(raw.category) : (raw?.categoryId != null ? String(raw.categoryId) : ''),
			tier: raw?.tier != null ? String(raw.tier) : '',
			nameKey: raw?.nameKey != null ? String(raw.nameKey) : (raw?.name_key != null ? String(raw.name_key) : ''),
			descriptionKey: raw?.descriptionKey != null ? String(raw.descriptionKey) : (raw?.description_key != null ? String(raw.description_key) : ''),
			name: raw?.name != null ? String(raw.name) : '',
			description: raw?.description != null ? String(raw.description) : '',
			iconUrl: raw?.iconUrl != null ? String(raw.iconUrl) : '',
			conditionType: raw?.conditionType != null ? String(raw.conditionType) : '',
			conditionValue: raw?.conditionValue != null ? Number(raw.conditionValue) : null,
			conditionUnit: raw?.conditionUnit != null ? String(raw.conditionUnit) : '',
			version: raw?.version != null ? Number(raw.version) : null,
		}
	}

	const col = admin.firestore().collection('achievements')
	const batch = admin.firestore().batch()

	let checked = 0
	let created = 0
	let skipped = 0
	let updated = 0

	for (const raw of list) {
		checked += 1
		const id = raw?.id != null ? String(raw.id).trim() : ''
		if (!id) {
			skipped += 1
			continue
		}

		const ref = col.doc(id)
		const existing = await ref.get()
		if (existing.exists && !force) {
			skipped += 1
			continue
		}

		const payload = {
			...buildPayload(raw),
			// Important for scan gating:
			publishedDate: admin.firestore.FieldValue.serverTimestamp()
		}

		batch.set(ref, payload, { merge: true })
		if (existing.exists) updated += 1
		else created += 1
	}

	await batch.commit()
	res.json({ ok: true, checked, created, updated, skipped, force })
})

async function syncAchievementCatalogFromCode({ force = false, dryRun = false } = {}) {
	const col = admin.firestore().collection('achievements')

	function buildPayload(raw) {
		return {
			category: raw?.category != null ? String(raw.category) : (raw?.categoryId != null ? String(raw.categoryId) : ''),
			tier: raw?.tier != null ? String(raw.tier) : '',
			nameKey: raw?.nameKey != null ? String(raw.nameKey) : (raw?.name_key != null ? String(raw.name_key) : ''),
			descriptionKey: raw?.descriptionKey != null ? String(raw.descriptionKey) : (raw?.description_key != null ? String(raw.description_key) : ''),
			name: raw?.name != null ? String(raw.name) : '',
			description: raw?.description != null ? String(raw.description) : '',
			iconUrl: raw?.iconUrl != null ? String(raw.iconUrl) : '',
			conditionType: raw?.conditionType != null ? String(raw.conditionType) : '',
			conditionValue: raw?.conditionValue != null ? Number(raw.conditionValue) : null,
			conditionUnit: raw?.conditionUnit != null ? String(raw.conditionUnit) : '',
			version: raw?.version != null ? Number(raw.version) : null,
		}
	}

	const list = Array.isArray(DEFAULT_ACHIEVEMENTS) ? DEFAULT_ACHIEVEMENTS : []

	let checked = 0
	let created = 0
	let updated = 0
	let skipped = 0
	let bumpedPublished = 0

	const batch = admin.firestore().batch()

	for (const raw of list) {
		checked += 1
		const id = raw?.id != null ? String(raw.id).trim() : ''
		if (!id) {
			skipped += 1
			continue
		}

		const ref = col.doc(id)
		const existingSnap = await ref.get()
		const incomingVersion = raw?.version != null && Number.isFinite(Number(raw.version)) ? Number(raw.version) : null

		if (!existingSnap.exists) {
			created += 1
			if (!dryRun) {
				batch.set(
					ref,
					{
						...buildPayload(raw),
						publishedDate: admin.firestore.FieldValue.serverTimestamp(),
					},
					{ merge: true }
				)
			}
			continue
		}

		const existing = existingSnap.data() || {}
		const existingVersion = existing.version != null && Number.isFinite(Number(existing.version))
			? Number(existing.version)
			: null

		// Only bump `publishedDate` when the version increases (or force=true).
		const shouldBumpPublished = Boolean(
			force ||
			(incomingVersion != null && (existingVersion == null || incomingVersion > existingVersion))
		)

		updated += 1
		if (shouldBumpPublished) bumpedPublished += 1

		if (!dryRun) {
			const payload = buildPayload(raw)
			if (shouldBumpPublished) {
				payload.publishedDate = admin.firestore.FieldValue.serverTimestamp()
			}
			batch.set(ref, payload, { merge: true })
		}
	}

	if (!dryRun) {
		await batch.commit()
	}

	return { checked, created, updated, skipped, bumpedPublished, force, dryRun }
}

/**
 * Sync achievement catalog from code -> Firestore.
 *
 * Use this when you update DEFAULT_ACHIEVEMENTS (name/description/conditions) and want
 * Firestore `/achievements` to reflect the latest catalog.
 *
 * Security: requires maintenance key in `?key=` or `x-backfill-key` header.
 *
 * Query:
 * - force=true   => overwrite and bump `publishedDate` for all entries
 * - dryRun=true  => don't write, just report counts
 */
exports.syncAchievementsFromCodeHttp = onRequest({ cors: true }, async (req, res) => {
	if (req.method !== 'POST') {
		res.status(405).json({ ok: false, error: 'method-not-allowed' })
		return
	}

	const expectedKey = await getAchievementBackfillKey()
	const providedKey = (req.query?.key != null ? String(req.query.key) : '') || String(req.get('x-backfill-key') || '')
	if (!expectedKey || providedKey !== expectedKey) {
		res.status(403).json({ ok: false, error: 'forbidden' })
		return
	}

	const force = String(req.query?.force || '').toLowerCase() === 'true'
	const dryRun = String(req.query?.dryRun || '').toLowerCase() === 'true'

	const result = await syncAchievementCatalogFromCode({ force, dryRun })
	res.json({ ok: true, ...result })
})

/**
 * Scheduled sync (automatic): keeps `/achievements` aligned with code.
 *
 * Notes:
 * - Runs daily; safe and idempotent.
 * - Only bumps `publishedDate` when `version` increases.
 */
exports.syncAchievementsFromCodeDaily = onSchedule('every day 03:00', async () => {
	await syncAchievementCatalogFromCode({ force: false, dryRun: false })
})
