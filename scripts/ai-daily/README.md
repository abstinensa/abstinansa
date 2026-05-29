# AI Daily

Daglig AI-nyhetsoppsummering for AI-strateger og tech leads i nordiske banker.
Aggregerer RSS-feeds, grupperer per region, og publiserer på
`https://abstinensa.no/ai-daily/`. Ingen LLM, ingen API-kostnader, ingen
secrets.

## Oppsett

Ingen secrets kreves. Workflowen kjører rett ut av boksen så snart filene er
på `main`.

- `.github/workflows/ai-daily.yml` kjører cron `30 5 * * *` (06:30 CET vinter
  / 07:30 CEST sommer). Manuell kjøring: Actions → AI Daily Newsletter →
  Run workflow. Sett `dry_run: true` for å teste uten å skrive eller committe
  filer.
- `.github/workflows/ai-daily-healthcheck.yml` kjører hver mandag morgen og
  åpner en GitHub Issue om en eller flere feeds har vært tomme eller døde i
  30+ dager.

## Hvordan kuratoren fungerer

`curate.py` er nå deterministisk Python — ingen LLM. Per region:

1. Filtrer på alder (24 timer) og keywords (`fetch.py`, `sources.yaml`).
2. Sorter etter `tier` (1 = høyest prioritet) og dato.
3. Dedupliser på normalisert tittel.
4. Plukk topp 3.
5. Kutt sammendraget til de første 1-2 setningene.

Det betyr ingen "Dagens take", ingen verdict-linjer, ingen omskrivning fra
pressemelding-språk. Til gjengjeld: 0 kr per kjøring, ingen API-feil, ingen
hemmeligheter å rotere.

Hvis du senere vil ha LLM-kuratering tilbake, gjenopprett den gamle
`curate.py` fra git-historikken, sett `ANTHROPIC_API_KEY` (eller annen LLM-
nøkkel) som secret, og legg env-koblingen tilbake i workflowen.

## Lokal testing

```bash
cd scripts/ai-daily
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python main.py --dry-run         # ingen filer skrevet, printer HTML
python main.py                   # full kjøring
```

## Filer

- `main.py` — orkestrering (fetch → aggregate → render → write).
- `fetch.py` — RSS-henting, 24-timersfilter, per-kilde keyword-filter, global
  exclude-liste.
- `curate.py` — deterministisk aggregering per region.
- `render.py` — Jinja2-templates pluss regenerering av indeks og Atom-feed.
- `healthcheck.py` — feedstatus, åpner GitHub Issue ved døde feeds.
- `sources.yaml` — kildelisten (Norge, Europa, USA), tier og keyword-filter.
- `templates/` — `web.html.j2`, `index.html.j2`.

## Output

Hver kjøring skriver:

- `ai-daily/YYYY/MM/DD.html` — dagens utgave.
- `ai-daily/index.html` — siste 30 utgaver.
- `ai-daily/feed.xml` — Atom 1.0 med siste 30 utgaver.

Workflow-en commiter disse til `main` og GitHub Pages publiserer dem.

## Endringer

- Endre kilder: rediger `sources.yaml`. Per kilde kan `filter_keywords`
  brukes for å bare slippe gjennom relevante poster.
- Justere antall saker per region: endre `ITEMS_PER_REGION` i `curate.py`.
- `noindex` ligger i `templates/web.html.j2` og `templates/index.html.j2`.
  Fjern `<meta name="robots" ...>` for å åpne for indeksering.
