/** Brief inline success pause before form close/navigation (POL-14). */
export const FORM_SAVE_SUCCESS_MS = 600;

export function formSaveSuccessDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, FORM_SAVE_SUCCESS_MS));
}
