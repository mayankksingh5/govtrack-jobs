# CLI help

## Discover a source

Discovery fetches one enabled source and prints the links that the existing
scraper would harvest. It does not write to the database.

```sh
npm run discover -- <source-id>
```

Valid examples:

```sh
npm run discover -- isro
npm run discover -- ibps
npm run discover -- rbi
```

## Common errors

### Missing source ID

Running `npm run discover` without an ID prints the command usage and exits
with code 1. It does not start the scraper.

### Invalid or disabled source ID

An unknown or disabled ID prints the available enabled source IDs and exits
with code 1. It does not start the scraper or modify data.

Use an ID exactly as it appears in the displayed enabled-source list.
