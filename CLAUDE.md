# CLAUDE.md

Panduan untuk Claude Code saat bekerja di repository ini.

## Project

**Project Management System** — SPA Vue 3 untuk mengelola project, milestone, task, dan Kanban board. Semua data dari **GraphQL** (tidak ada REST). Lihat konteks produk di [.docs/project-context.md](.docs/project-context.md) dan [.docs/PRD.md](.docs/PRD.md) — **baca itu sebelum menambah/ubah fitur** (ada MVP scope & out-of-scope yang tidak boleh dilanggar).

## Perintah

```bash
npm run dev       # Vite dev server
npm run build      # build produksi — pakai ini untuk verifikasi perubahan
npm run format     # prettier --write src/
```

Belum ada test/lint runner. **Verifikasi perubahan dengan `npm run build`**, lalu `npm run format` pada file yang diubah.

## Tech stack

Vue 3 (`<script setup>`, Composition API) · JavaScript (**bukan TypeScript**) · Vite · Tailwind CSS · Pinia · Vue Router · Apollo Client (`@apollo/client/core`).

## Arsitektur & konvensi

**Struktur feature-based:** `src/app` (main, router, layouts), `src/shared` (base components, composables, utils, graphql client), `src/features/<feature>`. Tiap feature punya: `pages/`, `components/`, `stores/` (Pinia), `graphql/index.js`, kadang `composables/` & `services/` (mock).

**Aturan tetap (dari .docs, patuhi):**
- Selalu Composition API + `<script setup>` + JavaScript. Jangan TypeScript.
- Pisahkan GraphQL Query/Mutation dari component → di `features/<feature>/graphql/index.js`.
- Global state di Pinia; jangan simpan data API di component kalau dipakai banyak halaman.
- Utamakan reusable component & readability. Pecah component yang kebesaran.
- Jangan tambah dependency baru atau ubah struktur folder tanpa alasan jelas.
- Tidak ada dummy data di production code; mock harus mudah diganti GraphQL.

### GraphQL

- Client: [src/shared/graphql/apolloClient.js](src/shared/graphql/apolloClient.js). Dev meng-hit `/api-gateway` (diproxy Vite ke `API_GATEWAY`), prod ke gateway langsung. Bearer token dibaca dari `localStorage['pm_token']` per-request.
- **Envelope respons seragam: `data.<operation>.data`.** List berpaginasi mengembalikan `{ count, currentPage, hasNext, hasPrev, totalPages, results }`.
- Pola store: fungsi async membungkus `apolloClient.query/mutate`, map error via helper `toMessage(err, fallback)`, lempar `Error` dengan pesan ramah. Mutasi umumnya `fetchPolicy: 'network-only'`.
- Id ke API bertipe `Int` → **selalu `Number(id)`** (route params & value dari `<select>` itu string). Field enum dari API sering **lowercase** (mis. `npl`, `collaboration`, `high`) sementara opsi enum dari introspeksi uppercase → cocokkan **case-insensitive**.
- Beberapa feature masih pakai mock (`services/mock*.js`) dan bermigrasi bertahap ke GraphQL. Feature `auth` & master-data (`project-role`, `project-status`, `task-status`, `default-task`) sudah GraphQL nyata.

### Base components (`src/shared/components/base`)

Selalu pakai ini, jangan bikin ulang: `BaseButton`, `BaseInput`, `BaseTextarea`, `BaseSelect`, `BaseSearchSelect` (single-select server-search, prop `fetcher` + `initialItem`), `BaseMultiSelect`, `BaseModal`, `ConfirmDialog`, `BaseCard`, `BaseBadge` (prop `color`: slate/primary/info/success/warning/danger, `size`, `dot`), `BaseTable` (slot `cell-<key>`, `row-actions`), `BasePagination`, `BaseAvatar` (inisial dari `name`), `BaseEmpty`.

**Gotcha `BaseSelect`:** untuk prefill nilai dengan opsi async, tiap `<option>` pakai `:selected` (bukan hanya `:value` di `<select>`), karena native select tidak menampilkan value yang option-nya belum ter-render. Sudah ditangani — pertahankan.

## Domain model

`Project` (entitas utama) → punya banyak `Milestone` → punya banyak `Task`. Task wajib milik satu Project, opsional terikat satu Milestone (`TaskInput` **tidak punya `projectId`** — task diasosiasikan lewat milestone/parent). Project melibatkan banyak `Unit` (many-to-many, tiap unit punya `role`).

- **Status project:** Draft, Active, On Hold, Completed, Cancelled (dari `currentStatus`, dan `activities[].status`).
- **Status task:** dari master `listTaskStatus` (dinamis) — jadi kolom Kanban.
- **Priority task:** Low, Medium, High, Critical.

## Feature `projects` (paling matang — acuan pola)

- **Create** ([ProjectCreatePage.vue](src/features/projects/pages/ProjectCreatePage.vue)): alur bertahap — buat project dulu → lalu builder Milestone & Task terbuka. Setelah create, default milestone/task dari backend di-prefill (`fetchProject`) dan bisa diedit/hapus.
- **Edit** ([ProjectEditPage.vue](src/features/projects/pages/ProjectEditPage.vue)): prefill penuh; milestone & task bisa create/update/delete di satu halaman.
- **Builders** (`MilestoneBuilder`, `InitialTaskBuilder`, `ProjectUnitBuilder`): baris tersimpan ditandai `_id`/`_saved`; submit = **create-or-update** (baris ber-`_id` → update, baru → create). Prop `allowEdit` bikin baris tersimpan tetap editable. Hapus baris tersimpan → emit `delete-saved` (dipanggil ke mutation). Setelah delete, **bump `:key` builder** supaya remount & baca ulang model (builder hanya menyalin `modelValue` saat mount).
- **Query getProject dipecah demi performa:**
  - `GET_PROJECT` (penuh) — Edit & isi-default setelah Create.
  - `GET_PROJECT_DETAIL` (ringan, task cuma id/title/priority) — [ProjectDetailPage.vue](src/features/projects/pages/ProjectDetailPage.vue).
  - `GET_PROJECT_BOARD` (fokus kanban, task + `currentStatus`) — [ProjectBoardPage.vue](src/features/projects/pages/ProjectBoardPage.vue).
  - Store: `fetchProject` / `fetchProjectDetail` / `fetchProjectBoard`.
- **Board/Kanban** ([ProjectTaskBoard.vue](src/features/projects/components/ProjectTaskBoard.vue)): kolom dari `listTaskStatus` (urut `ordering`); task dari project (milestones→tasks) dikelompokkan by `currentStatus.id`; drag & drop + quick-add per kolom. Komponen board lama di `features/tasks/*` + `useTaskStore` mock **tidak dipakai lagi** oleh board ini.
- `taskType` adalah **input teks manual** (bukan enum/select).

### Belum selesai (perlu backend)
- Drag & drop board masih **optimistic** (belum persist) — butuh mutation ubah status task.
- Create task di board mengirim `currentStatusId` (nama field belum dikonfirmasi backend).

## Memori & preferensi

Simpan keputusan/preferensi yang bertahan antar-sesi lewat sistem memory. Konvensi non-obvious sebaiknya berakhir di file ini.
