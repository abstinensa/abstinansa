# Slå på sky-lagring for Vektreisen ☁️

Med sky-lagring lagres fremgangen din automatisk på nett og synkes mellom alle
enhetene dine (telefon, PC, ny telefon). Du logger inn med e-post – ingen passord.

Det koster **0 kr** for én person, og den statiske siden forblir statisk: den
snakker direkte med Supabase fra nettleseren. Hele oppsettet tar ca. **5 minutter**.

> Til den tekniske: vi bruker Supabase (gratisnivå). Den statiske siden laster
> `@supabase/supabase-js` fra CDN, autentiserer med magic-link OTP, og lagrer
> hele app-tilstanden som én `jsonb`-rad per bruker, beskyttet av Row Level
> Security. Uten utfylt `supabase-config.js` faller appen tilbake til ren
> `localStorage` (offline-first) – ingenting knekker.

---

## 1. Lag et gratis Supabase-prosjekt
1. Gå til **https://supabase.com** → **Start your project** → logg inn (GitHub funker).
2. **New project** → gi det et navn (f.eks. `vektreisen`), velg region (Frankfurt),
   sett et database-passord (du trenger det ikke senere). Vent ~1 min.

## 2. Lag tabellen + sikkerhetsregler
1. I prosjektet: venstre meny → **SQL Editor** → **New query**.
2. Lim inn alt under og trykk **Run**:

```sql
create table if not exists public.vektreisen (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.vektreisen enable row level security;

create policy "egne data – les"      on public.vektreisen
  for select using (auth.uid() = user_id);
create policy "egne data – sett inn" on public.vektreisen
  for insert with check (auth.uid() = user_id);
create policy "egne data – oppdater" on public.vektreisen
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Dette sørger for at **kun du** kan se og endre dine egne data.

## 3. Tillat innlogging fra siden
1. Venstre meny → **Authentication** → **URL Configuration**.
2. **Site URL**: `https://abstinensa.no/weight/`
3. **Redirect URLs** → legg til (begge):
   - `https://abstinensa.no/weight/`
   - `https://abstinensa.no/weightloss`
4. (E-post-innlogging / "Email OTP" er på som standard – ingenting å gjøre.)

## 4. Hent nøklene og lim dem inn
1. Venstre meny → **Project Settings** → **API**.
2. Kopier:
   - **Project URL** (f.eks. `https://abcdefgh.supabase.co`)
   - **anon public** nøkkelen (den lange under "Project API keys")
3. Åpne `weight/supabase-config.js` og lim inn:

```js
window.SUPABASE_CONFIG = {
  url: "https://abcdefgh.supabase.co",
  anonKey: "DIN_ANON_PUBLIC_NØKKEL"
};
```

4. Lagre, commit og push. Når GitHub Pages har publisert, dukker
   **«Sky-lagring»** opp i appen med e-post-innlogging.

---

## Slik kjennes det
- Skriv e-posten din → trykk lenken du får på mail → du er innlogget.
- Alt du har logget lokalt **slås sammen** med skyen (ingen veiinger forsvinner).
- Logg inn med samme e-post på en ny enhet → hele reisen er der.

Er feltene i `supabase-config.js` tomme, fungerer appen akkurat som før, med
lokal lagring + nedlastbar sikkerhetskopi.
