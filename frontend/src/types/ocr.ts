export type OcrSummaryResponse = {
  text: string
  reviewLevel?: 'none' | 'warning' | 'error' | null
}
