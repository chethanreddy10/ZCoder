const blockedTags = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form"]);
const blockedAttributes = new Set(["style", "srcdoc"]);

export function sanitizeProblemHtml(html) {
  const document = new DOMParser().parseFromString(html || "", "text/html");
  document.querySelectorAll("*").forEach((element) => {
    if (blockedTags.has(element.tagName.toLowerCase())) return element.remove();
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || blockedAttributes.has(name) || ((name === "href" || name === "src") && !/^(https?:|mailto:|#|\/)/.test(value))) element.removeAttribute(attribute.name);
    });
  });
  return document.body.innerHTML;
}
