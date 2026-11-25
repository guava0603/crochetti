#!/usr/bin/env node
/* global process */
// One-off migration: rewrite every stored row into the "count on every anchor" model
// (see src/utils/crochetValidate.js) — e.g. a one-stitch pattern `[X] × 6` becomes
// `X (count 6)`, neighbours that only differ by count are merged, count 0 is removed.
//
// Scope: `projects/*` and `users/*/records/*` → component_list[].content.row_list[]
//        .content.stitch_node_list. Record progress (`end_at.crochet_count`) is a stitch
//        count within the row, so it stays valid as long as each row's totals are equal —
//        which the script checks for every row before writing anything.
//
// Safety:
// - Dry run by default: reads only, prints a summary and sample diffs.
// - `--apply` writes. Before writing, every document that will change is saved to a
//   local backup JSON (see --backup-dir), which `--restore <file>` can write back.
// - A document is skipped (and reported) if any of its rows would change consume/generate.
// - Components typed `component-knitting` are skipped.
//
// Usage (needs Firebase Admin credentials, e.g. `gcloud auth application-default login`
// or GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json):
//   node scripts/migrate-stitch-counts.mjs                       # dry run
//   node scripts/migrate-stitch-counts.mjs --apply               # write
//   node scripts/migrate-stitch-counts.mjs --restore <backup.json>
// Options: --project <id> (default from .firebaserc), --limit <n>, --backup-dir <dir>,
//          --only projects|records, --samples <n>

import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BasicStitch } from '../src/constants/basicStitches.js'
import { crochetValidate } from '../src/utils/crochetValidate.js'
import { calculateConsumeGenerateCore } from '../src/utils/crochetStatsCore.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// firebase-admin is installed for Cloud Functions; reuse it from there.
const require = createRequire(join(ROOT, 'functions', 'package.json'))
const admin = require('firebase-admin')

// ---------- args ----------
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const defaultProject = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, '.firebaserc'), 'utf8')).projects.default
  } catch {
    return undefined
  }
})()
const PROJECT_ID = opt('project', defaultProject)
const APPLY = flag('apply')
const RESTORE = opt('restore', '')
const LIMIT = Number(opt('limit', 0)) || 0
const ONLY = opt('only', '')
const SAMPLES = Number(opt('samples', 5))
const BACKUP_DIR = resolve(opt('backup-dir', join(ROOT, 'migration-backups')))

if (!PROJECT_ID) {
  console.error('No Firebase project id. Pass --project <id>.')
  process.exit(1)
}

admin.initializeApp({ projectId: PROJECT_ID })
const db = admin.firestore()

// ---------- migration logic (pure) ----------
function buildLookup(selfDefined) {
  const lookup = {}
  for (const s of BasicStitch) lookup[s.index] = s
  for (const s of Array.isArray(selfDefined) ? selfDefined : []) {
    const id = Number(s?.stitch_id)
    if (Number.isFinite(id)) lookup[id] = { consume: Number(s.consume) || 0, generate: Number(s.generate) || 0 }
  }
  return lookup
}

/** Returns { changed, componentList, problems[] } without mutating the input. */
function migrateComponentList(componentList, lookup) {
  const list = Array.isArray(componentList) ? componentList : []
  const problems = []
  let changed = false
  const next = list.map((component, cIdx) => {
    const rows = component?.content?.row_list
    if (!Array.isArray(rows)) return component
    if (component?.type === 'component-knitting') {
      problems.push(`component ${cIdx}: knitting component skipped`)
      return component
    }
    const nextRows = rows.map((row, rIdx) => {
      const before = row?.content?.stitch_node_list
      if (!Array.isArray(before)) return row
      const after = crochetValidate(before)
      if (JSON.stringify(after) === JSON.stringify(before)) return row
      const a = calculateConsumeGenerateCore(before, 1, lookup)
      const b = calculateConsumeGenerateCore(after, 1, lookup)
      if (a.consume !== b.consume || a.generate !== b.generate) {
        problems.push(`component ${cIdx} row ${rIdx}: totals ${JSON.stringify(a)} → ${JSON.stringify(b)}`)
        return row
      }
      changed = true
      return { ...row, content: { ...row.content, stitch_node_list: after } }
    })
    return { ...component, content: { ...component.content, row_list: nextRows } }
  })
  return { changed, componentList: next, problems }
}

// ---------- scanning ----------
async function* scanDocs() {
  if (ONLY !== 'records') {
    const snap = await db.collection('projects').get()
    for (const d of snap.docs) yield { kind: 'project', doc: d, selfDefined: d.get('self_defined_stitches') }
  }
  if (ONLY !== 'projects') {
    const snap = await db.collectionGroup('records').get()
    for (const d of snap.docs) {
      // Only private records hold rows; public summaries live under artifacts/.
      if (!d.ref.path.startsWith('users/')) continue
      yield { kind: 'record', doc: d, selfDefined: null }
    }
  }
}

async function run() {
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} on project ${PROJECT_ID}${LIMIT ? ` (limit ${LIMIT})` : ''}`)
  const stats = { scanned: 0, changed: 0, skipped: 0, unchanged: 0 }
  const toWrite = []
  const samples = []
  const problemsAll = []
  const projectSelfDefined = new Map()

  for await (const item of scanDocs()) {
    if (LIMIT && stats.scanned >= LIMIT) break
    stats.scanned += 1
    const data = item.doc.data()
    if (item.kind === 'project') projectSelfDefined.set(item.doc.id, item.selfDefined)
    const selfDefined = item.kind === 'project'
      ? item.selfDefined
      : projectSelfDefined.get(String(data.project_id)) ?? null
    const result = migrateComponentList(data.component_list, buildLookup(selfDefined))

    if (result.problems.some((p) => p.includes('totals'))) {
      stats.skipped += 1
      problemsAll.push({ path: item.doc.ref.path, problems: result.problems })
      continue
    }
    if (result.problems.length) problemsAll.push({ path: item.doc.ref.path, problems: result.problems })
    if (!result.changed) {
      stats.unchanged += 1
      continue
    }
    stats.changed += 1
    toWrite.push({ ref: item.doc.ref, before: data.component_list, after: result.componentList })
    if (samples.length < SAMPLES) samples.push(sampleDiff(item.doc.ref.path, data.component_list, result.componentList))
  }

  console.log(JSON.stringify(stats, null, 2))
  for (const s of samples) console.log(s)
  for (const p of problemsAll) console.log(`! ${p.path}\n  ${p.problems.join('\n  ')}`)

  if (!APPLY) {
    console.log(`\nDry run only. Re-run with --apply to write ${toWrite.length} document(s).`)
    return
  }
  if (!toWrite.length) return

  mkdirSync(BACKUP_DIR, { recursive: true })
  const backupFile = join(BACKUP_DIR, `stitch-counts-${PROJECT_ID}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(backupFile, JSON.stringify(toWrite.map((w) => ({ path: w.ref.path, component_list: w.before })), null, 1))
  console.log(`Backup of ${toWrite.length} document(s): ${backupFile}`)

  for (let i = 0; i < toWrite.length; i += 400) {
    const batch = db.batch()
    for (const w of toWrite.slice(i, i + 400)) batch.update(w.ref, { component_list: w.after })
    await batch.commit()
    console.log(`Wrote ${Math.min(i + 400, toWrite.length)} / ${toWrite.length}`)
  }
}

function sampleDiff(path, before, after) {
  const lines = [`\n~ ${path}`]
  before.forEach((c, ci) => {
    (c?.content?.row_list || []).forEach((row, ri) => {
      const a = JSON.stringify(row?.content?.stitch_node_list)
      const b = JSON.stringify(after[ci]?.content?.row_list?.[ri]?.content?.stitch_node_list)
      if (a !== b && lines.length < 7) lines.push(`  c${ci} r${ri}\n    - ${a}\n    + ${b}`)
    })
  })
  return lines.join('\n')
}

async function restore(file) {
  const entries = JSON.parse(readFileSync(resolve(file), 'utf8'))
  console.log(`Restoring ${entries.length} document(s) on ${PROJECT_ID} from ${file}`)
  for (let i = 0; i < entries.length; i += 400) {
    const batch = db.batch()
    for (const e of entries.slice(i, i + 400)) batch.update(db.doc(e.path), { component_list: e.component_list })
    await batch.commit()
  }
  console.log('Restore done.')
}

;(RESTORE ? restore(RESTORE) : run()).catch((e) => {
  console.error(e)
  process.exit(1)
})
