import { PrismaClient } from "@prisma/client"
import { readFileSync } from "node:fs"

const SQUAD_ALIASES = { Zerogravity: "Zero Gravity" }
const PERIOD_NAME = "FY26Q4"
const WEEK1_DATE = new Date("2026-02-02T09:00:00Z")

function parseCsv(text) {
  const rows = []
  let field = ""
  let row = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ",") { row.push(field); field = "" }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++
        row.push(field); rows.push(row); row = []; field = ""
      } else field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

function parsePct(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const n = parseInt(s.replace("%", ""), 10)
  return Number.isFinite(n) ? n : null
}

async function main() {
  const csvPath = process.argv[2] ?? "/tmp/KeyResults.csv"
  const userEmail = process.argv[3] ?? "okrmanager@example.com"
  const text = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "")
  const rows = parseCsv(text)
  const [header, ...data] = rows
  const idx = (name) => header.indexOf(name)
  const iKr = idx("KeyResult")
  const iObj = idx("ObjectiveName")
  const iSquad = idx("SquadName")

  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) throw new Error(`User ${userEmail} not found`)
    const quarter = await prisma.quarter.findUnique({ where: { name: PERIOD_NAME } })
    if (!quarter) throw new Error(`Quarter ${PERIOD_NAME} not found`)

    let created = 0
    let skipped = 0
    let missingKr = 0

    for (const row of data) {
      if (!row[iKr] || !row[iObj]) continue
      const krTitle = row[iKr].trim()
      const objTitle = row[iObj].trim()
      const teamName = SQUAD_ALIASES[row[iSquad].trim()] ?? row[iSquad].trim()

      const team = await prisma.team.findUnique({ where: { name: teamName } })
      if (!team) { missingKr++; continue }
      const objective = await prisma.objective.findFirst({
        where: { title: objTitle, quarterId: quarter.id, teamId: team.id },
      })
      if (!objective) { missingKr++; continue }
      const kr = await prisma.keyResult.findFirst({
        where: { title: krTitle, objectiveId: objective.id },
      })
      if (!kr) { missingKr++; continue }

      for (let week = 1; week <= 12; week++) {
        const pIdx = 6 + 2 * week
        const cIdx = 7 + 2 * week
        const progress = parsePct(row[pIdx])
        const confidence = parsePct(row[cIdx])
        if (progress == null || confidence == null) continue

        const createdAt = new Date(WEEK1_DATE)
        createdAt.setUTCDate(createdAt.getUTCDate() + 7 * (week - 1))

        const existing = await prisma.checkIn.findFirst({
          where: { keyResultId: kr.id, createdAt },
        })
        if (existing) { skipped++; continue }

        await prisma.checkIn.create({
          data: {
            keyResultId: kr.id,
            userId: user.id,
            progress,
            confidence,
            createdAt,
          },
        })
        created++
      }
    }

    console.log(`Done. created=${created} skipped=${skipped} krNotFound=${missingKr}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
