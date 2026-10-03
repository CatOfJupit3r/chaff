import { showToast } from '@~/components/toast/toast-store';

/** Copies text to the clipboard and says so, or says why it could not. */
export function useCopyText() {
  return async (text: string, confirmation = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(confirmation);
    } catch {
      showToast('Could not copy to the clipboard');
    }
  };
}
