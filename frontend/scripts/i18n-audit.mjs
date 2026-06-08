#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const root = process.cwd()
const enPath = path.join(root, "lib/i18n/dictionaries/en.ts")
const trPath = path.join(root, "lib/i18n/dictionaries/tr.ts")

const enKeys = extractQuotedStrings(fs.readFileSync(enPath, "utf8"))
const trKeys = extractDictionaryKeys(fs.readFileSync(trPath, "utf8"))
const enSet = new Set(enKeys)
const trSet = new Set(trKeys)

const missingInTr = enKeys.filter((key) => !trSet.has(key))
const extraInTr = trKeys.filter((key) => !enSet.has(key))
const identicalSuspicious = enKeys.filter((key) => {
  const translation = extractTranslationValue(trPath, key)
  return translation === key && !isLanguageNeutral(key)
})

console.log("ClinMira AI i18n audit")
console.log(`English keys: ${enSet.size}`)
console.log(`Turkish keys: ${trSet.size}`)
console.log(`Missing Turkish keys: ${missingInTr.length}`)
console.log(`Extra Turkish keys: ${extraInTr.length}`)
console.log(`Suspicious identical translations: ${identicalSuspicious.length}`)

if (missingInTr.length) {
  console.log("\nMissing Turkish keys:")
  missingInTr.forEach((key) => console.log(`- ${key}`))
}

if (extraInTr.length) {
  console.log("\nExtra Turkish keys:")
  extraInTr.forEach((key) => console.log(`- ${key}`))
}

if (identicalSuspicious.length) {
  console.log("\nSuspicious identical translations:")
  identicalSuspicious.forEach((key) => console.log(`- ${key}`))
}

if (missingInTr.length || extraInTr.length || identicalSuspicious.length) {
  process.exitCode = 1
}

function extractQuotedStrings(source) {
  return [...source.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) => unescapeString(match[1]))
}

function extractDictionaryKeys(source) {
  return [...source.matchAll(/^\s*"((?:[^"\\]|\\.)*)":/gm)].map((match) => unescapeString(match[1]))
}

function extractTranslationValue(filePath, key) {
  const source = fs.readFileSync(filePath, "utf8")
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = source.match(new RegExp(`"${escapedKey}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))
  return match ? unescapeString(match[1]) : null
}

function unescapeString(value) {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\")
}

function isLanguageNeutral(value) {
  return /^(ClinMira AI|CBCT|CRP|CBC|BP|OSCE|EN|TR|English|Türkçe|Risk|Program|Persona|\d+|\d+ min|\d+ hr)$/.test(value)
}
