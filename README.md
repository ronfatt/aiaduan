# e-Aduan Tawau AI Demo

Prototaip demo untuk **e-Aduan Tawau AI** (sistem triage aduan perbandaran).

## Pasang
```bash
npm install
```

## Jalan Secara Tempatan
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000)

## Sambung OpenAI API
1. Salin fail contoh env:
```bash
cp .env.example .env.local
```

2. Isi kunci API anda dalam `.env.local`:
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

3. Mulakan aplikasi:
```bash
npm run dev
```

4. Di halaman `/submit`:
- Jika `OPENAI_API_KEY` wujud dan `Demo Mode` dimatikan, sistem akan guna **OpenAI API sebenar**
- Jika kunci tiada, atau panggilan API gagal, sistem akan guna **triage mock deterministik**
- Jika `Demo Mode` dihidupkan, sistem akan **paksa guna mock** walaupun kunci API wujud

5. Pilihan lain:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## Tingkah Laku AI
- API route: `/api/triage`
- Status AI: `/api/ai-status`
- Model lalai: `gpt-4.1-mini`
- Output triage menggunakan structured JSON:
  - `category`
  - `urgency`
  - `confidence`
  - `summary`
  - `department`
  - `eta_hours`
  - `reasoning`
  - `topCategoryTileSuggestion`
  - `rasmiJenisAduanSuggestion`
  - `officialMappingConfidence`

## Demo Mode vs AI Langsung
- `Demo Mode` sesuai untuk pitch tanpa internet / tanpa API key
- `AI Langsung` sesuai untuk tunjuk klasifikasi sebenar melalui OpenAI API
- Pada halaman `/submit`, panel `Ringkasan Kes` akan tunjuk sama ada sistem sedang menggunakan:
  - `OpenAI API`
  - atau `Peraturan demo tempatan`

## Laluan Utama
- `/` halaman utama
- `/submit` borang aduan rakyat + cadangan AI masa nyata
- `/track` semakan kod jejak
- `/track/[id]` status aduan + timeline
- `/assistant` demo WhatsApp / voice bot
- `/admin` ruang kerja jabatan
- `/insights` analitik bandar
- `/president` papan pemuka presiden

## Aliran Demo
1. Buka `/submit`
2. Taip aduan seperti `Lampu jalan di Jalan Apas tidak menyala sejak 3 hari`
3. Lihat cadangan AI dikemas kini secara masa nyata
4. Hantar aduan dan simpan kod jejak
5. Buka `/admin`, cari kes dan ubah status
6. Kembali ke `/track/[id]` untuk lihat perubahan status
7. Buka `/insights` dan `/president` untuk tunjuk peta risiko, KPI, dan ringkasan AI
