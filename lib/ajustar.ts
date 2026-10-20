/** Textarea que cresce com o texto, para nada ficar cortado. Use como ref e no onChange. */
export function ajustar(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
