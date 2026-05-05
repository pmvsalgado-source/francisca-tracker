import react from '@vitejs/plugin-react'
import { parseCLI, startVitest } from 'vitest/node'

const parsed = parseCLI(['vitest', ...process.argv.slice(2)], { allowUnknownOptions: true })

await startVitest(
  'test',
  parsed.filter,
  {
    ...parsed.options,
    run: true,
    pool: 'threads',
  },
  {
    configFile: false,
    plugins: [react()],
    resolve: {
      preserveSymlinks: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/tests/setup.js'],
      deps: {
        inline: true,
      },
    },
  },
)
