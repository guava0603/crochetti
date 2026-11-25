import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src')

/** Longest-first so partial paths do not match incorrectly. */
const replacements = [
  ['@/components/HomeView/index.vue', '@/components/features/home/HomePage.vue'],
  ['@/components/ProjectView/index.vue', '@/components/features/project/ProjectPage.vue'],
  ['@/components/RecordView/index.vue', '@/components/features/record/RecordPage.vue'],
  ['@/components/UserView/index.vue', '@/components/features/user/UserPage.vue'],
  ['@/components/AddProjectView/index.vue', '@/components/features/add-project/AddProjectPage.vue'],
  ['@/components/AddProjectView/AddProjectDesign.vue', '@/components/features/add-project/AddProjectDesign.vue'],
  ['@/components/AddProjectView/AddProjectInfo.vue', '@/components/features/add-project/AddProjectInfo.vue'],
  ['@/components/EditProjectView/index.vue', '@/components/features/project/edit-project/EditProjectPage.vue'],
  ['@/components/LoginView/index.vue', '@/components/features/auth/LoginPage.vue'],
  ['@/components/AboutView/index.vue', '@/components/features/about/AboutPage.vue'],
  ['@/components/WishPoolView/index.vue', '@/components/features/wish/WishPoolPage.vue'],
  ['@/components/QuickStartRecordView/index.vue', '@/components/features/quick-start/QuickStartRecordPage.vue'],
  ['@/components/DebugAchievementToastView/index.vue', '@/components/features/debug/DebugAchievementToastPage.vue'],
  ['@/components/projects/DesignPrintView/index.vue', '@/components/features/project/design-print/DesignPrintPage.vue'],
  ['@/components/records/RecordPrintView/index.vue', '@/components/features/record/record-print/RecordPrintPage.vue'],
  ['@/components/cards/ComponentCard.vue/', '@/components/features/project/component-card/'],
  ['@/components/cards/ComponentMaterialField.vue', '@/components/features/project/ComponentMaterialField.vue'],
  ['@/components/modals/ModalShell/', '@/components/modals/shell/ModalShell/'],
  ['@/components/modals/GlobalConfirmationModal.vue', '@/components/modals/global/GlobalConfirmationModal.vue'],
  ['@/components/modals/GlobalHelpModal.vue', '@/components/modals/global/GlobalHelpModal.vue'],
  ['@/components/modals/ConfirmationModal.vue', '@/components/modals/global/ConfirmationModal.vue'],
  ['@/components/modals/SystemSettingsModal.vue', '@/components/modals/global/SystemSettingsModal.vue'],
  ['@/components/modals/AddProjectStartModeModal.vue', '@/components/modals/project/AddProjectStartModeModal.vue'],
  ['@/components/modals/DesignPrintSettingsModal.vue', '@/components/modals/project/DesignPrintSettingsModal.vue'],
  ['@/components/modals/AvatarPickerModal.vue', '@/components/modals/user/AvatarPickerModal.vue'],
  ['@/components/modals/ProfileSettingsModal.vue', '@/components/modals/user/ProfileSettingsModal.vue'],
  ['@/components/modals/SearchUserByIdModal.vue', '@/components/modals/user/SearchUserByIdModal.vue'],
  ['@/components/modals/AddRecordFeedbackModal.vue', '@/components/modals/record/AddRecordFeedbackModal.vue'],
  ['@/components/modals/AddRecordFromUserModal.vue', '@/components/modals/record/AddRecordFromUserModal.vue'],
  ['@/components/modals/RecordSelectionModal.vue', '@/components/modals/record/RecordSelectionModal.vue'],
  ['@/components/modals/RecordPrintSettingsModal.vue', '@/components/modals/record/RecordPrintSettingsModal.vue'],
  ['@/components/modals/UpdateStatus.vue', '@/components/modals/record/UpdateStatus.vue'],
  ['@/components/modals/PrintCompletedTimePrecisionSection.vue', '@/components/modals/print/PrintCompletedTimePrecisionSection.vue'],
  ['@/components/modals/PrintImageOptionsSection.vue', '@/components/modals/print/PrintImageOptionsSection.vue'],
  ['@/components/projects/', '@/components/features/project/'],
  ['@/components/records/', '@/components/features/record/'],
  ['@/components/CrochetTable/', '@/components/features/crochet-editor/CrochetTable/'],
  ['@/components/BottomToolbar/', '@/components/features/crochet-editor/BottomToolbar/'],
  ['@/components/Wizard/', '@/components/features/crochet-editor/Wizard/'],
  ['@/components/AddProject/', '@/components/features/add-project/form/'],
  ['@/components/achievements/', '@/components/features/achievements/'],
  ['@/components/User/', '@/components/features/user/'],
  ['@/components/Wish/', '@/components/features/wish/'],
  ['@/components/layout/', '@/components/shell/layout/'],
  ['@/components/Footer/', '@/components/shell/Footer/'],
  ['@/components/footbar/', '@/components/shell/footbar/'],
  ['@/components/buttons/', '@/components/shared/buttons/'],
  ['@/components/Input/', '@/components/shared/inputs/'],
  ['@/components/Selection/', '@/components/shared/selection/'],
  ['@/components/ui/', '@/components/shared/ui/'],
  ['@/components/Image/', '@/components/shared/image/'],
  ['@/components/Carousel/', '@/components/shared/carousel/'],
  ['@/components/icons/', '@/components/shared/icons/'],
  ['@/components/help/', '@/components/shared/help/'],
  ['@/components/tools/', '@/components/shared/tools/'],
  ["'../cards/ComponentCard.vue/index.vue'", "'@/components/features/project/component-card/index.vue'"],
  ["'../cards/ComponentCard.vue/index.vue';", "'@/components/features/project/component-card/index.vue';"],
]

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, files)
    else if (/\.(vue|js|ts|mjs)$/.test(ent.name)) files.push(p)
  }
  return files
}

let changed = 0
for (const file of walk(root)) {
  let text = fs.readFileSync(file, 'utf8')
  const before = text
  for (const [from, to] of replacements) {
    text = text.split(from).join(to)
  }
  if (text !== before) {
    fs.writeFileSync(file, text)
    changed += 1
  }
}

console.log(`Updated ${changed} files`)
