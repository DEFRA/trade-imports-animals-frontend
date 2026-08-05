// Elements are assembled node by node with textContent and explicit
// attributes. Nothing here ever writes innerHTML, so a filename or reference
// the user supplied can never become markup.
export const createEl = (
  tag,
  { className, text, attrs = {}, dataset, children = [] } = {}
) => {
  const el = document.createElement(tag)
  if (className) {
    el.className = className
  }
  if (text != null) {
    el.textContent = text
  }
  if (dataset) {
    Object.assign(el.dataset, dataset)
  }
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
  children.forEach((child) => el.appendChild(child))
  return el
}
