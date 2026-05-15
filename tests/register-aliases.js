import Module from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const originalResolve = Module._resolveFilename
const projectRoot = process.cwd()

Module._resolveFilename = function patchedResolve(specifier, parent, ...rest) {
  if (specifier.startsWith('@/')) {
    const absolutePath = path.join(projectRoot, specifier.slice(2))
    return originalResolve.call(this, pathToFileURL(absolutePath).href, parent, ...rest)
  }

  return originalResolve.call(this, specifier, parent, ...rest)
}
