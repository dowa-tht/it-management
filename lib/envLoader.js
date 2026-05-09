const getEnvValues = () => {
  if (typeof window !== 'undefined') return {}

  try {
    const fs = require('fs')
    const path = require('path')
    const envPath = 'c:\\Users\\Lenovo\\dowa-it-system\\.env.local'
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const env = {}
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return
        const [k, ...v] = trimmed.split('=')
        if (k && v.length > 0) env[k.trim()] = v.join('=').trim()
      })
      return env
    }
  } catch (e) {
    console.error('EnvLoader Error:', e)
  }
  return {}
}

const envValues = getEnvValues()

export const getEnv = (key) => {
  return process.env[key] || envValues[key]
}
