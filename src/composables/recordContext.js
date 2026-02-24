import { inject, provide } from 'vue'

const RecordContextKey = Symbol('RecordContext')

export function provideRecordContext(ctx) {
  provide(RecordContextKey, ctx)
}

export function useRecordContext() {
  return inject(RecordContextKey, null)
}
