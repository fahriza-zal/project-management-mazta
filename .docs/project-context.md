# Project Context

## Project Name

Project Management System

---

# Project Overview

Project Management System adalah aplikasi web berbasis Vue 3 yang digunakan untuk mengelola project dan task dalam sebuah organisasi atau tim.

Aplikasi ini berfokus pada pengelolaan project, monitoring progress, pembagian tugas kepada anggota tim, serta visualisasi task menggunakan Kanban Board.

Board **bukan merupakan entity utama**, melainkan tampilan (view) yang mengelompokkan task berdasarkan statusnya.

Seluruh data aplikasi berasal dari GraphQL API.

Frontend hanya bertugas sebagai client yang mengonsumsi GraphQL Query, Mutation, dan nantinya Subscription.

---

# Project Goals

Tujuan utama aplikasi adalah:

- Mempermudah monitoring project.
- Mempermudah pembagian task.
- Mempermudah melihat progress project.
- Menyediakan tampilan Kanban yang sederhana.
- Menjadi aplikasi yang cepat, ringan, dan mudah digunakan.

---

# MVP Scope

Versi pertama aplikasi hanya memiliki fitur berikut.

## Authentication

- Login
- Logout

## Dashboard

- Project Summary
- Task Summary
- Recent Project

## Project

- List Project
- **Create Project (Advanced Form)**:
  Proses pembuatan project baru yang bersifat *all-in-one form*, mencakup:
  * *Project Info*: Nama, Deskripsi, Status, dan **Pilih Unit (Multiple/Multi-select)**.
  * *Milestone Builder*: Form dinamis untuk menambah beberapa Milestone sekaligus (Multiple Create).
  * *Initial Task Builder*: Form dinamis untuk langsung membuat task-task awal di dalam project tersebut sebelum project disimpan.
- Update Project
- Delete Project
- Detail Project

## Board

Board merupakan tampilan visual dari Task.

Kolom Board:

- Todo
- In Progress
- Review
- Done

Task dapat dipindahkan menggunakan Drag & Drop.

Perubahan posisi task akan mengubah status task.

## Task

- Create
- Read
- Update
- Delete
- Assign PIC
- Due Date
- Priority
- Description

---

# Out of Scope

Versi pertama tidak mencakup:

- Workspace
- Multiple Board
- Comment
- Checklist
- Attachment
- Activity Timeline
- Notification
- Chat
- Calendar
- Timeline
- Gantt Chart
- AI Assistant
- Time Tracking
- Label
- Subtask

Jangan mengimplementasikan fitur di atas kecuali diminta secara eksplisit.

---

# Tech Stack

Frontend:

- Vue 3
- JavaScript
- Vite
- Tailwind CSS
- Pinia
- Vue Router
- Apollo Client

Backend:

- GraphQL API

Seluruh komunikasi data harus menggunakan GraphQL.

REST API tidak digunakan.

---

# Architecture Principle

Entity aplikasi terdiri dari:
- **Project**: Entitas utama yang memiliki Milestone, Task, dan terkait dengan beberapa Unit.
- **Milestone**: Sub-bagian dari Project untuk mengelompokkan fase kerja. Satu Project memiliki banyak Milestone.
- **Task**: Unit kerja terkecil yang wajib terikat pada satu Project, dan secara opsional dapat dikaitkan dengan satu Milestone.
- **Unit**: Entitas master organisasi/divisi yang mengerjakan project. Satu Project dapat melibatkan banyak Unit (Many-to-Many).

Board tetap bukan entity database, melainkan representasi visual dari Task berdasarkan status.

---

# Project Structure

- Satu Project dapat memilih/melibatkan **lebih dari satu Unit**.
- Satu Project memiliki banyak **Milestone** (Multiple).
- Satu Project memiliki banyak **Task**.
- Hubungan Task: Task selalu dimiliki oleh satu Project, dan bisa dipilih apakah masuk ke Milestone tertentu atau tidak.

---

# Status Project

Project memiliki status:

- Draft
- Active
- On Hold
- Completed
- Cancelled

---

# Status Task

Task memiliki status:

- Todo
- In Progress
- Review
- Done

Status digunakan sebagai kolom Kanban.

---

# Priority Task

Task memiliki priority:

- Low
- Medium
- High
- Critical

---

# UI Philosophy

UI harus:

- Modern
- Clean
- Minimal
- Professional

Mengutamakan keterbacaan daripada dekorasi.

Tidak menggunakan animasi yang berlebihan.

Whitespace harus cukup.

Gunakan card sebagai elemen utama.

---

# Responsive Strategy

Desktop First.

Harus tetap nyaman digunakan pada:

- Desktop
- Tablet
- Mobile

---

# Data Source

Semua data berasal dari GraphQL.

Tidak boleh menggunakan data dummy pada production code.

Jika backend belum tersedia, gunakan Mock Data yang mudah diganti dengan GraphQL.

---

# State Management

Global state menggunakan Pinia.

Data lokal menggunakan ref() atau reactive().

Jangan menyimpan data API di dalam component jika data digunakan oleh banyak halaman.

---

# Routing

Gunakan Vue Router.

Semua halaman berada pada folder pages.

Gunakan nested route jika diperlukan.

---

# Code Philosophy

Project harus mudah dipelihara.

Prioritaskan:

- Readability
- Reusability
- Maintainability
- Scalability

Daripada membuat kode yang terlalu kompleks.

---

# Component Philosophy

Component harus memiliki satu tanggung jawab.

Jika component mulai terlalu besar, pecah menjadi component yang lebih kecil.

Hindari duplicate code.

---

# Design Philosophy

Gunakan Design System yang konsisten.

Spacing, typography, warna, radius, shadow, button, input, dan modal harus memiliki standar yang sama.

---

# AI Instructions

Selalu ikuti PRD sebelum menghasilkan kode.

Jangan membuat fitur di luar MVP kecuali diminta.

Jangan menambahkan dependency baru tanpa alasan yang jelas.

Jangan mengubah struktur folder tanpa persetujuan.

Selalu gunakan reusable component.

Selalu gunakan Composition API.

Selalu gunakan `<script setup>`.

Selalu gunakan JavaScript.

Jangan menggunakan TypeScript.

Selalu gunakan Tailwind CSS.

Selalu gunakan Pinia untuk global state.

Selalu gunakan Apollo Client untuk GraphQL.

Selalu pisahkan GraphQL Query, Mutation, dan Subscription dari component.

Utamakan clean code dibandingkan shortcut.

---

# Future Development

Versi berikutnya dapat menambahkan:

- Comment
- Attachment
- Notification
- Activity Log
- GraphQL Subscription
- Calendar View
- Timeline View
- Gantt Chart
- Time Tracking
- Dashboard Analytics

Namun fitur tersebut tidak termasuk dalam MVP saat ini.
