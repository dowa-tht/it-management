import { run } from 'node:test'
import { spec } from 'node:test/reporters'

const stream = run({
  globPatterns: ['tests/**/*.test.js'],
})

stream.compose(spec).pipe(process.stdout)
