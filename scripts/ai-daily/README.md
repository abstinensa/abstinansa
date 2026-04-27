# AI Daily

Daglig AI-nyhetsbrev for AI-strateger og tech leads i nordiske banker.
Kuratert av Claude Sonnet 4.6, publisert på `https://abstinensa.no/ai-daily/`.

## Oppsett

1. Sett følgende GitHub Secret på repoet:
   - `ANTHROPIC_API_KEY` — Anthropic API-nøkkel.

2. Workflow-en `.github/workflows/ai-daily.yml` kjører cron `30 5 * * *`
   (06:30 CET vinter / 07:30 CEST sommer). Manuell kjøring: Actions →
   AI Daily Newsletter → Run workflow. Sett `dry_run: true` for å teste
   uten å skrive eller committe filer.

3. Healthcheck-en `.github/workflows/ai-daily-healthcheck.yml` kjører hver
   mandag morgen og åpner en GitHub Issue om en eller flere feeds har vært
   tomme eller døde i 30+ dager.

## Lokal testing

```bash
cd scripts/ai-daily
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export ANTHROPIC_API_KEY=sk-ant-...
python main.py --dry-run         # ingen filer skrevet, printer HTML
python main.py                   # full kjøring
```

## Filer

- `main.py` — orkestrering (fetch → curate → render → write).
- `fetch.py` — RSS-henting, 24-timersfilter, per-kilde keyword-filter, global
  exclude-liste.
- `curate.py` — sender artikkellisten til Claude med `prompts/curator.md` som
  systemprompt; en retry, deretter fallback til rå titler.
- `render.py` — Jinja2-templates pluss regenerering av indeks og Atom-feed.
- `healthcheck.py` — feedstatus, åpner GitHub Issue ved døde feeds.
- `sources.yaml` — kildelisten (Norge, Europa, USA), tier og keyword-filter.
- `prompts/curator.md` — systemprompt for kuratoren.
- `templates/` — `web.html.j2`, `index.html.j2`.

## Output

Hver kjøring skriver:

- `ai-daily/YYYY/MM/DD.html` — dagens utgave.
- `ai-daily/index.html` — siste 30 utgaver.
- `ai-daily/feed.xml` — Atom 1.0 med siste 30 utgaver.

Workflow-en commiter disse til `main` og GitHub Pages publiserer dem.

## Endringer

- Bytt modell: oppdater `MODEL` i `curate.py`.
- Endre kilder: rediger `sources.yaml`. Per kilde kan `filter_keywords`
  brukes for å bare slippe gjennom relevante poster.
- Endre stemme/struktur: rediger `prompts/curator.md`.
- `noindex` ligger i `templates/web.html.j2` og `templates/index.html.j2`.
  Fjern `<meta name="robots" ...>` for å åpne for indeksering.
