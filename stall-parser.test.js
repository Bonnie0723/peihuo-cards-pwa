const assert = require("node:assert/strict");
const { extractStallCodeFromSku } = require("./stall-parser");

const cases = new Map([
  ["TH-A12345", "A"],
  ["VN_B123", "B"],
  ["XX-AA001", "AA"],
  ["TH-AB-CD123", "CD"],
  ["pc99", "PC"],
  ["  VN_b007  ", "B"],
  ["NO-DIGITS", ""],
  ["12345", ""],
  ["", ""],
]);

for (const [sku, expected] of cases) {
  assert.equal(extractStallCodeFromSku(sku), expected, sku);
}

console.log(`Passed ${cases.size} SKU-to-stall parser cases`);
