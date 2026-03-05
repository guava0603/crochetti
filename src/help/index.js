import AddProjectTableHeaderPage1 from './addProjectTableHeader/PageStitch.vue'
import AddProjectTableHeaderPage2 from './addProjectTableHeader/PageTotalStitches.vue'
import AddProjectTableHeaderPage3 from './addProjectTableHeader/PageTotalStitchesStatusGreen.vue'
import AddProjectTableHeaderPage4 from './addProjectTableHeader/PageTotalStitchesStatusRed.vue'
import AddProjectTableHeaderPage5 from './addProjectTableHeader/PageTotalStitchesStatusYellow.vue'
import AddProjectTableHeaderPage6 from './addProjectTableHeader/PageTotalStitchesNote.vue'

import CrochetTableBasicsPage1 from './crochetTableBasics/PageIntro.vue'
import CrochetTableBasicsPage2 from './crochetTableBasics/PageRowNumber.vue'
import CrochetTableBasicsPage3 from './crochetTableBasics/PageStitch.vue'
import CrochetTableBasicsPage4 from './crochetTableBasics/PageTotalStitches.vue'

import EditCrochetBasicsPage1 from './editCrochetBasics/PageIntro.vue'
import EditCrochetBasicsPage2 from './editCrochetBasics/PageChangeStitch.vue'
import EditCrochetBasicsPage3 from './editCrochetBasics/PageAddToBundle.vue'
import EditCrochetBasicsPage4 from './editCrochetBasics/PageWorkflowTips.vue'
import EditCrochetBasicsPage5 from './editCrochetBasics/PageBasicStitches.vue'
import EditCrochetBasicsPage6 from './editCrochetBasics/PageDecorativeStitches.vue'
import EditCrochetBasicsPage7 from './editCrochetBasics/PageIncrease.vue'
import EditCrochetBasicsPage8 from './editCrochetBasics/PageDecrease.vue'
import EditCrochetBasicsPage9 from './editCrochetBasics/PageCustom.vue'

import EditCrochetHowToPage1 from './editCrochetHowTo/PageMenu.vue'
import EditCrochetHowToPage2 from './editCrochetHowTo/PageAddBundle.vue'
import EditCrochetHowToPage3 from './editCrochetHowTo/PageDeleteBundle.vue'
import EditCrochetHowToPage4 from './editCrochetHowTo/PageIncrease.vue'
import EditCrochetHowToPage5 from './editCrochetHowTo/PageDecrease.vue'
import EditCrochetHowToPage6 from './editCrochetHowTo/PagePosition.vue'
import EditCrochetHowToPage7 from './editCrochetHowTo/PageCustom.vue'

import EditRowHowToPage1 from './editRowHowTo/PageMenu.vue'
import EditRowHowToPage2 from './editRowHowTo/PageAddRow.vue'
import EditRowHowToPage3 from './editRowHowTo/PageAddFromOldRow.vue'
import EditRowHowToPage4 from './editRowHowTo/PageRepeatMultipleRows.vue'
import EditRowHowToPage5 from './editRowHowTo/PageMoveRow.vue'
import EditRowHowToPage6 from './editRowHowTo/PageDeleteRow.vue'
import EditRowHowToPage7 from './editRowHowTo/PageMultiRowActions.vue'

import RecordHowToPage1 from './recordHowTo/Page1.vue'
import RecordHowToPage2 from './recordHowTo/Page2.vue'
import RecordHowToPage3 from './recordHowTo/Page3.vue'
import RecordHowToPage4 from './recordHowTo/Page4.vue'
import RecordHowToPage5 from './recordHowTo/Page5.vue'
import RecordHowToPage6 from './recordHowTo/Page6.vue'
import RecordHowToPage7 from './recordHowTo/Page7.vue'
import RecordHowToPage8 from './recordHowTo/Page8.vue'
import RecordHowToPage9 from './recordHowTo/Page9.vue'
import RecordHowToPage10 from './recordHowTo/Page10.vue'

export const HELP_TOPICS = Object.freeze({
  addProjectTableHeader: {
    pages: [
      AddProjectTableHeaderPage1,
      AddProjectTableHeaderPage2,
      AddProjectTableHeaderPage3,
      AddProjectTableHeaderPage4,
      AddProjectTableHeaderPage5,
      AddProjectTableHeaderPage6
    ]
  },
  crochetTableBasics: {
    pages: [
      CrochetTableBasicsPage1,
      CrochetTableBasicsPage2,
      CrochetTableBasicsPage3,
      CrochetTableBasicsPage4
    ]
  },
  addProjectTableHeaderStitch: {
    pages: [AddProjectTableHeaderPage1]
  },
  addProjectTableHeaderTotalStitches: {
    pages: [
      AddProjectTableHeaderPage2,
      AddProjectTableHeaderPage3,
      AddProjectTableHeaderPage4,
      AddProjectTableHeaderPage5,
      AddProjectTableHeaderPage6
    ]
  },
  editCrochetBasics: {
    pages: [
      EditCrochetBasicsPage1,
      EditCrochetBasicsPage2,
      EditCrochetBasicsPage3,
      EditCrochetBasicsPage5,
      EditCrochetBasicsPage6,
      EditCrochetBasicsPage7,
      EditCrochetBasicsPage8,
      EditCrochetBasicsPage9,
      EditCrochetBasicsPage4
    ]
  },
  editCrochetHowTo: {
    pages: [
      EditCrochetHowToPage1,
      EditCrochetHowToPage2,
      EditCrochetHowToPage3,
      EditCrochetHowToPage4,
      EditCrochetHowToPage5,
      EditCrochetHowToPage6,
      EditCrochetHowToPage7
    ]
  },
  editRowHowTo: {
    pages: [
      EditRowHowToPage1,
      EditRowHowToPage2,
      EditRowHowToPage3,
      EditRowHowToPage4,
      EditRowHowToPage5,
      EditRowHowToPage6,
      EditRowHowToPage7
    ]
  },
  recordHowTo: {
    pages: [
      RecordHowToPage1,
      RecordHowToPage2,
      RecordHowToPage3,
      RecordHowToPage4,
      RecordHowToPage5,
      RecordHowToPage6,
      RecordHowToPage7,
      RecordHowToPage8,
      RecordHowToPage9,
      RecordHowToPage10
    ]
  }
})
