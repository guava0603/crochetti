/**
 * Remove the last node from the editable pattern list shown in EditCrochet.
 * @returns {{ nextList: object[], becameEmpty: boolean }}
 */
export function removeLastPatternNode(patternList) {
  const list = Array.isArray(patternList) ? patternList.map((n) => ({ ...n })) : []
  if (!list.length) {
    return { nextList: [], becameEmpty: true }
  }
  list.pop()
  return { nextList: list, becameEmpty: list.length === 0 }
}
