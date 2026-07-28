# Recommendation Engine

Rule-based, explainable recommendations for the Government Job Portal.

## Setup

1. Run `recommendation-schema.sql` in the existing Supabase project.
2. Configure the API:

   ```text
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

3. Start the API with `npm run api`.
4. Configure both frontends with their existing `VITE_API_URL`.

The recommendation tables have RLS enabled and no public policies. Only the
server-side service role can access them. Never expose `SUPABASE_SERVICE_KEY`
to either Vite frontend.

## Identity

Personalized endpoints require:

```http
X-User-ID: 550e8400-e29b-41d4-a716-446655440000
```

Until authentication exists, the public portal stores a random UUID on the
device. After login is implemented, send the authenticated user's stable UUID
instead. `X-User-ID` alone is not authentication and should be replaced by
verified token identity before storing sensitive user preferences.

## Endpoints

### GET `/api/recommendations`

Returns ranked recommendations.

Query parameters:

- `page` (default `1`)
- `limit` (default `20`, maximum `100`)
- `mode`: `personalized`, `trending`, `recent`, or `expiring`
- `category`
- `organization`
- `qualification`

Requires `X-User-ID`.

```sh
curl -H "X-User-ID: 550e8400-e29b-41d4-a716-446655440000" \
  "http://localhost:3000/api/recommendations?mode=personalized&limit=10"
```

Each personalized job includes `recommendation_score`,
`recommendation_reasons`, and `unavailable_factors`.

### GET `/api/recommendations/similar/:jobId`

Returns jobs similar by category, organization, and text overlap.

```sh
curl "http://localhost:3000/api/recommendations/similar/1842?limit=6"
```

### POST `/api/preferences`

Requires `X-User-ID`.

```json
{
  "qualification": "B.Tech",
  "skills": ["civil engineering", "AutoCAD"],
  "experience_years": 2,
  "preferred_states": ["Delhi", "Rajasthan"],
  "preferred_organizations": ["ISRO", "RBI"],
  "preferred_categories": ["job"],
  "preferred_salary_min": 40000,
  "preferred_salary_max": 90000
}
```

### POST `/api/recommendations/interactions`

Records recommendation signals. Requires `X-User-ID`.

```json
{
  "job_id": 1842,
  "interaction": "viewed"
}
```

`interaction` is `viewed` or `saved`.

### GET `/api/recommendations/analytics`

Returns:

- most viewed jobs;
- most saved jobs;
- top categories;
- top organizations.

## Response format

```json
{
  "success": true,
  "total": 1,
  "page": 1,
  "pages": 1,
  "data": [],
  "meta": {}
}
```

## Scoring

Personalized scores use:

| Factor | Maximum points |
|---|---:|
| Qualification match | 25 |
| Preferred category | 20 |
| Preferred organization | 20 |
| Skills match | 15 |
| Interaction history | 15 |
| Recency | 15 |
| Preferred state | 10 |

Scores are capped at 100. Reasons are returned with each job.

Experience and salary preferences are stored, but the existing `posts` table
does not provide structured experience, state, or salary fields. State is
matched conservatively against available job text. Experience and salary are
reported in `unavailable_factors` and do not affect the score.

## Caching and performance

- Recommendation responses are cached in memory for five minutes.
- Preference and interaction changes invalidate that user's cached responses.
- Up to 500 recent published jobs are scored per request.
- Responses are paginated and filterable.
- In a multi-instance deployment, replace the in-memory cache with a shared
  cache such as Redis without changing the scoring contract.
