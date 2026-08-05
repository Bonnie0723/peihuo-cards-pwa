(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.StallParser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  function extractStallCodeFromSku(value) {
    const sku = value == null ? "" : String(value).trim().toUpperCase();
    if (!sku) return "";
    const matches = [...sku.matchAll(/([A-Z]+)(?=\d)/g)];
    return matches.length ? matches.at(-1)[1] : "";
  }

  return { extractStallCodeFromSku };
});
