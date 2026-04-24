import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const latencyP95 = new Trend('latency_p95')

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3847'
const API_KEY = __ENV.API_KEY || ''

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      startTime: '0s',
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      startTime: '30s',
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 },
        { duration: '20s', target: 200 },
        { duration: '10s', target: 0 },
      ],
      startTime: '2m30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.01'],
  },
}

const headers = { 'X-API-Key': API_KEY }

const endpoints = [
  { path: '/api/v1/predictions?limit=20', weight: 3 },
  { path: '/api/v1/teams', weight: 2 },
  { path: '/api/v1/matches?limit=20', weight: 2 },
  { path: '/api/v1/standings', weight: 2 },
  { path: '/api/v1/players?limit=20', weight: 2 },
  { path: '/api/v1/signals?limit=20', weight: 1 },
  { path: '/api/v1/value-bets', weight: 1 },
]

function weightedRandom(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[0]
}

export default function () {
  const endpoint = weightedRandom(endpoints)
  const res = http.get(`${BASE_URL}${endpoint.path}`, { headers })

  const correctness = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => {
      try { return JSON.parse(r.body).status === 'ok' }
      catch { return false }
    },
  })

  check(res, {
    'response under 500ms': (r) => r.timings.duration < 500,
  })

  errorRate.add(!correctness)
  latencyP95.add(res.timings.duration)

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers['Retry-After'] || '5', 10)
    sleep(retryAfter)
  } else {
    sleep(0.1 + Math.random() * 0.2)
  }
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify({
      p50: data.metrics.http_req_duration.values['p(50)'],
      p95: data.metrics.http_req_duration.values['p(95)'],
      p99: data.metrics.http_req_duration.values['p(99)'],
      errorRate: data.metrics.errors?.values?.rate ?? 0,
      totalRequests: data.metrics.http_reqs?.values?.count ?? 0,
    }, null, 2),
  }
}
