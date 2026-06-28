// ───────────────────────────────────────────────────────────────
//  Sky-lagring for Vektreisen (Supabase)
// ───────────────────────────────────────────────────────────────
//  Fyll inn verdiene fra ditt eget Supabase-prosjekt for å slå PÅ
//  sky-lagring med e-post-innlogging og automatisk synk mellom enheter.
//
//  La feltene stå tomme ("") for å beholde ren lokal lagring på enheten.
//
//  Steg-for-steg: se SKY-OPPSETT.md i denne mappen.
//  (anon-nøkkelen er laget for å ligge i frontend – den er trygg her,
//   så lenge "Row Level Security" er på, som beskrevet i oppsettet.)
// ───────────────────────────────────────────────────────────────
window.SUPABASE_CONFIG = {
  url: "",      // f.eks. "https://abcdefgh.supabase.co"
  anonKey: ""   // din "anon public" API-nøkkel
};
