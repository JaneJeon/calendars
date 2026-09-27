import process from 'node:process'

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const token = process.env.CLOUDFLARE_API_TOKEN
const worker = 'calendars-frontend'

if (!accountId || !token) {
  throw new Error(
    'Cloudflare account credentials are required for the smoke test'
  )
}

const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}`

async function readCloudflare(path) {
  const response = await globalThis.fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!response.ok) {
    throw new Error(`Cloudflare API returned HTTP ${response.status}`)
  }
  const body = await response.json()
  if (!body.success) {
    throw new Error('Cloudflare API rejected the deployment lookup')
  }
  return body.result
}

const deployments = await readCloudflare(
  `/workers/scripts/${worker}/deployments`
)
const latest = deployments?.deployments?.[0]
const active = latest?.versions?.filter(version => version.percentage === 100)
if (active?.length !== 1 || !active[0]?.version_id) {
  throw new Error('Expected one fully deployed frontend version')
}

const version = await readCloudflare(
  `/workers/workers/${worker}/versions/${active[0].version_id}`
)
const versionUrl = version?.urls?.find(value => {
  try {
    const url = new globalThis.URL(value)
    return url.protocol === 'https:' && url.hostname.endsWith('.workers.dev')
  } catch {
    return false
  }
})
if (!versionUrl) {
  throw new Error(
    'The deployed frontend version has no workers.dev Version URL'
  )
}

globalThis.console.log(versionUrl)
