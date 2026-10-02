export function createLink(href: string, text: string): HTMLAnchorElement {
  return Object.assign(document.createElement('a'), { href, textContent: text });
}
