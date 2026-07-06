# Product Requirement Document (PRD)

# Project Management System

**Version:** 1.0
**Status:** Draft
**Frontend:** Vue 3 + JavaScript + Tailwind CSS + Pinia + Apollo GraphQL

---

# 1. Product Overview

## Deskripsi

Project Management System adalah aplikasi web yang digunakan untuk mengelola project dan task dalam satu tempat.

Aplikasi ini membantu tim dalam membuat project, mengelola task, memonitor progres project, dan melihat perkembangan pekerjaan melalui tampilan Kanban Board.

Board bukan merupakan data utama, melainkan representasi visual dari task berdasarkan statusnya.

Seluruh data berasal dari GraphQL API.

---

# 2. Tujuan Produk

Menyediakan aplikasi project management yang sederhana, cepat, dan mudah digunakan untuk mengelola pekerjaan tim tanpa kompleksitas aplikasi enterprise.

---

# 3. Goals

* Mengelola daftar project.
* Mengelola task pada setiap project.
* Menampilkan task dalam tampilan Kanban.
* Mengetahui progress project secara otomatis.
* Memudahkan monitoring pekerjaan tim.

---

# 4. Out of Scope (Versi 1)

Fitur berikut **tidak** termasuk dalam MVP:

* Workspace
* Multiple Board
* Checklist
* Attachment
* Comment
* Activity Timeline
* Notification
* Chat
* Calendar
* Timeline
* Gantt Chart
* Time Tracking
* AI Assistant
* Automation
* Label
* Sub Task

---

# 5. Target User

## Project Manager

* Mengelola seluruh project.
* Membuat project.
* Mengelola task.

## Head Departemen

* Membuat project.
* Menentukan PIC.
* Mengatur deadline.


## Member

* Melihat project yang ditugaskan.
* Mengubah status task.
* Memperbarui informasi task.

---

# 6. Tech Stack

## Frontend

* Vue 3
* JavaScript
* Vite
* Tailwind CSS
* Pinia
* Vue Router
* Apollo Client

## Backend

GraphQL API

Semua komunikasi data menggunakan GraphQL.

Tidak menggunakan REST API.

---

# 6.1 Arsitektur Folder (Feature-Based)

Project ini menggunakan **struktur folder feature-based** (bukan type-based).

Kode dikelompokkan berdasarkan **fitur/domain** (auth, dashboard, projects, tasks, account), bukan berdasarkan jenis file. Setiap fitur memuat sendiri komponen, halaman, store, service, dan operasi GraphQL miliknya, sehingga fitur menjadi modular, mudah dirawat, dan mudah dikembangkan.

## Prinsip

* **`app/`** — entry point dan kerangka aplikasi: `main.js`, `App.vue`, router, dan layouts.
* **`features/<nama-fitur>/`** — seluruh kode milik satu fitur dikumpulkan di sini (`components/`, `pages/`, `stores/`, `services/`, `graphql/`).
* **`shared/`** — kode yang dipakai lintas fitur: base component (UI), layout component, composables, utils, constants, styles, store global, dan setup Apollo Client.

## Struktur

```
src/
  app/
    App.vue
    main.js
    router/                 # konfigurasi Vue Router + guard
    layouts/                # AppLayout, AuthLayout
  features/
    auth/
      pages/                # LoginPage
      stores/               # auth store
      graphql/              # operasi GraphQL auth (placeholder)
    dashboard/
      components/
      pages/                # DashboardPage
      services/             # mock data dashboard
    projects/
      components/           # ProjectCard, ProjectHeader, ProjectProgress, ...
      pages/                # List, Create, Detail, Board
      stores/               # project store
      services/             # mock data project
      graphql/
    tasks/
      components/           # TaskCard, TaskBoard, TaskColumn, TaskModal, ...
      stores/               # task store
      services/             # mock data task
      graphql/
    account/
      pages/                # ProfilePage, SettingsPage
  shared/
    components/
      base/                 # BaseButton, BaseInput, BaseModal, ... (UI reusable)
      layout/               # Sidebar, Navbar, Breadcrumb, Footer
      common/               # ToastHost
    composables/
    constants/
    utils/
    styles/
    stores/                 # store global (mis. UI/sidebar)
    services/               # mock data lintas-fitur (mis. users)
    graphql/                # apolloClient + subscriptions
    pages/                  # NotFoundPage
```

## Aturan

* Komponen di dalam sebuah fitur **tidak boleh** mengimpor file internal fitur lain secara dalam; gunakan apa yang ada di `shared/` untuk kebutuhan bersama.
* Komponen `base/` (UI) harus generik dan bebas dari logika domain.
* Operasi GraphQL diletakkan **berdampingan (co-located)** di dalam folder `graphql/` masing-masing fitur.
* Alias `@` menunjuk ke `src/`, sehingga import berbentuk `@/features/...`, `@/shared/...`, atau `@/app/...`.

---

# 7. Modul Aplikasi

## Authentication

* Login
* Logout

---

## Dashboard

Dashboard menampilkan ringkasan project.

Informasi yang ditampilkan:

* Total Project
* Project Active
* Project Completed
* Total Task
* Task Todo
* Task In Progress
* Task Review
* Task Done

---

## Project

Fitur:

* List Project
* Detail Project
* Create Project
* Edit Project
* Delete Project
* Search Project

---

## Board

Board merupakan tampilan visual dari task.

Kolom board terdiri dari:

* Todo
* In Progress
* Review
* Done

Task dapat dipindahkan menggunakan Drag & Drop.

Perubahan posisi task akan mengubah status task.

---

## Task

Task berada di dalam Project.

Task memiliki informasi:

* Title
* Description
* Status
* Priority
* Assigned User
* Due Date
* Created Date
* Updated Date

---

# 8. Struktur Navigasi

Login

↓

Dashboard

↓

Project List

↓

Project Detail

↓

Board

↓

Task Detail

---

# 9. Struktur Data

## Project

| Field       | Type     |
| ----------- | -------- |
| id          | UUID     |
| code        | String   |
| name        | String   |
| description | Text     |
| status      | Enum     |
| progress    | Integer  |
| startDate   | Date     |
| endDate     | Date     |
| createdAt   | DateTime |
| updatedAt   | DateTime |

---

## Task

| Field       | Type     |
| ----------- | -------- |
| id          | UUID     |
| projectId   | UUID     |
| title       | String   |
| description | Text     |
| status      | Enum     |
| priority    | Enum     |
| assignedTo  | User     |
| dueDate     | Date     |
| createdAt   | DateTime |
| updatedAt   | DateTime |

---

# 10. Status Project

Status project terdiri dari:

* Draft
* Active
* On Hold
* Completed
* Cancelled
* Over due

---

# 11. Status Task

Status task terdiri dari:

* Todo
* In Progress
* Review
* Done
* Over due

Status ini digunakan sebagai kolom pada Kanban Board.

---

# 12. Priority Task

Priority:

* Low
* Medium
* High
* Critical

---

# 13. Perhitungan Progress Project

Progress project dihitung otomatis berdasarkan jumlah task yang telah selesai.

Rumus:

Progress = (Jumlah Task Done / Total Task) × 100%

Contoh:

Total Task = 20

Task Done = 15

Progress = 75%

Progress tidak dapat diinput secara manual.

---

# 14. Business Flow

1. User Login.
2. Dashboard ditampilkan.
3. User memilih Project.
4. User masuk ke Detail Project.
5. User melihat Board.
6. User membuat Task.
7. User mengubah status Task.
8. Progress Project diperbarui secara otomatis.

---

# 15. Functional Requirements

## Authentication

* Login
* Logout

## Dashboard

* Menampilkan ringkasan project.
* Menampilkan statistik task.

## Project

* Membuat project.
* Mengubah project.
* Menghapus project.
* Melihat detail project.
* Mencari project.

## Board

* Menampilkan task berdasarkan status.
* Drag & Drop task.
* Memindahkan task antar status.

## Task

* Membuat task.
* Mengubah task.
* Menghapus task.
* Mengubah status.
* Mengubah priority.
* Mengubah PIC.
* Mengubah due date.

---

# 16. Non Functional Requirements

* Responsive Desktop.
* Responsive Tablet.
* Responsive Mobile.
* Clean UI.
* Modern Design.
* Fast Loading.
* Reusable Component.
* Lazy Loading.
* Pagination.
* Search.
* Filter.

---

# 17. UI Concept

Style:

* Modern
* Clean
* Minimalist
* Dashboard Style

Theme:

* Light Mode

Icon:

* Heroicons

Layout:

Sidebar kiri:

* Dashboard
* Project

Navbar atas:

* Search
* User Profile

---

# 18. Acceptance Criteria

Aplikasi dianggap selesai apabila:

* Login berjalan.
* Dashboard berjalan.
* CRUD Project berjalan.
* CRUD Task berjalan.
* Kanban Board berjalan.
* Drag & Drop berjalan.
* Progress Project otomatis.
* Seluruh data berasal dari GraphQL.
* Menggunakan Vue 3 Composition API.
* Menggunakan JavaScript.
* Menggunakan Pinia.
* Menggunakan Tailwind CSS.
* Menggunakan Apollo Client.
* Tidak menggunakan REST API.

---

# 19. Roadmap

## Version 1

* Authentication
* Dashboard
* Project
* Kanban Board
* Task

## Version 2

* Comment
* Attachment
* Notification
* Activity Log
* Realtime GraphQL Subscription

## Version 3

* Calendar View
* Gantt Chart
* Time Tracking
* AI Assistant
