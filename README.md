# RadConnect – Forschungs- & SHK-Koordination (Radiologie)

Plattform zur Koordination von Forschungsprojekten, SHK-Kapazitäten, Meilensteinen und SOPs für Ärzte, studentische Hilfskräfte und Koordination.

🔗 **Live-Demo:** [https://radconnect-radiologie.surge.sh](https://radconnect-radiologie.surge.sh)

---

## Schnellstart (z. B. in Antigravity / VS Code)

1. **Repository klonen oder Ordner in Antigravity öffnen:**
   ```bash
   git clone <REPO-URL>
   cd RadConnect
   ```
2. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```
3. **Entwicklungsserver starten:**
   ```bash
   npm run dev
   ```
   *(Ohne `.env`-Datei startet RadConnect automatisch im **Demo-Modus** mit vorbereiteten Testdaten und 1-Klick-Schnellzugang für Koordinator, Arzt und SHK.)*

---

## Wichtige Befehle

- `npm run dev` – Lokalen Entwicklungsserver starten
- `npm run build` – TypeScript-Prüfung & Produktions-Build (`./dist`)
- `npm run deploy:surge` – Produktions-Build erstellen und auf Surge.sh veröffentlichen

## Optional: Supabase Live-Backend
1. `.env.example` zu `.env` kopieren und `VITE_SUPABASE_URL` sowie `VITE_SUPABASE_ANON_KEY` eintragen.
2. Das SQL-Schema aus [`supabase/schema.sql`](./supabase/schema.sql) einmalig im Supabase SQL-Editor ausführen.
