#!/usr/bin/env node

import { parseCliArgs, printHelp, runApiFootballIngest } from './lib/api-football-ingest.mjs'

async function main() {
  const options = parseCliArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  const summary = await runApiFootballIngest(options)
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
