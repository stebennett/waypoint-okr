import { PrismaClient } from "@prisma/client"
import { readFileSync } from "node:fs"

// Normalise CSV squad names to whatever already exists in the DB.
const SQUAD_ALIASES = {
  Zerogravity: "Zero Gravity",
}

function parseCsv(text) {
  const rows = []
  let field = ""
  let row = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ",") {
        row.push(field)
        field = ""
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++
        row.push(field)
        rows.push(row)
        row = []
        field = ""
      } else {
        field += c
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

async function main() {
  const csvPath = process.argv[2] ?? "/tmp/KeyResults.csv"
  const text = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "")
  const rows = parseCsv(text)
  const [header, ...data] = rows
  const idx = (name) => header.indexOf(name)
  const iKr = idx("KeyResult")
  const iObj = idx("ObjectiveName")
  const iPeriod = idx("PeriodName")
  const iSquad = idx("SquadName")

  const prisma = new PrismaClient()
  try {
    const periodName = "FY26Q4"
    const quarter = await prisma.quarter.findUnique({ where: { name: periodName } })
    if (!quarter) throw new Error(`Quarter ${periodName} not found`)

    const teamCache = new Map()
    const objCache = new Map()
    let teamsCreated = 0
    let objectivesCreated = 0
    let krsCreated = 0
    let krsSkipped = 0

    for (const row of data) {
      if (!row[iKr] || !row[iObj] || !row[iSquad]) continue
      const krTitle = row[iKr].trim()
      const objTitle = row[iObj].trim()
      const rawSquad = row[iSquad].trim()
      const teamName = SQUAD_ALIASES[rawSquad] ?? rawSquad

      let team = teamCache.get(teamName)
      if (!team) {
        team = await prisma.team.findUnique({ where: { name: teamName } })
        if (!team) {
          team = await prisma.team.create({ data: { name: teamName } })
          teamsCreated++
          console.log(`[team] created ${teamName}`)
        }
        teamCache.set(teamName, team)
      }

      const objKey = `${team.id}::${objTitle}`
      let objective = objCache.get(objKey)
      if (!objective) {
        objective = await prisma.objective.findFirst({
          where: { title: objTitle, quarterId: quarter.id, teamId: team.id },
        })
        if (!objective) {
          objective = await prisma.objective.create({
            data: {
              title: objTitle,
              level: "team",
              status: "active",
              quarterId: quarter.id,
              teamId: team.id,
            },
          })
          objectivesCreated++
          console.log(`[obj] created (${teamName}) ${objTitle}`)
        }
        objCache.set(objKey, objective)
      }

      const existingKr = await prisma.keyResult.findFirst({
        where: { title: krTitle, objectiveId: objective.id },
      })
      if (existingKr) {
        krsSkipped++
        continue
      }
      await prisma.keyResult.create({
        data: { title: krTitle, objectiveId: objective.id },
      })
      krsCreated++
      console.log(`[kr]  created ${krTitle.slice(0, 80)}`)
    }

    console.log(
      `\nDone. teams +${teamsCreated}, objectives +${objectivesCreated}, KRs +${krsCreated}, KRs skipped ${krsSkipped}`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
