# Examination & Assessment System Module Documentation

## 1. Overview
The Examination & Assessment Module is a comprehensive, production-ready system implemented inside the Qelvora School CRM School Management System. It handles exam definitions, scheduling, class roster marks entry, CSV template import/export, audit trails for marks modification, printable marks cards (report cards), individual multi-term marks profiles, CCE (Continuous and Comprehensive Evaluation) co-scholastic skills, score sheet allocation, configurable grading scales, and analytics dashboards.

---

## 2. Access Control & Security (RBAC)

### Strict Role-Based Permissions
- **Admin / Principal**: Full access to all features. Can define exam types, create exam instances, allocate score sheets, lock/unlock marks, audit-modify locked marks, and toggle result publication to students and parents.
- **Teacher / Faculty**: Can enter and update marks only for allocated classes/sections and subjects, while the marks sheet is not locked.
- **Students & Parents**: Strictly forbidden from accessing the Examination management dashboard or any administrative REST endpoints (enforced via HTTP 403 Forbidden on both frontend and backend).
- **Individual Marks Access**: Students and parents have access **ONLY** to their own individual verified and published marks via `GET /api/examination/my-marks`, seamlessly embedded inside the Student & Parent workspace ([`SafePickupPage.jsx`](file:///d:/school-crm/apps/web/src/pages/SafePickupPage.jsx) sub-tab `5. 🎯 Exam Marks & Report`).

---

## 3. Database Schema Models (Prisma ORM)

| Model | Description |
|---|---|
| `ExamType` | Master exam types (FA1, FA2, Mid Term, FA3, FA4, Final) with full marks, pass marks, sequence, weightage %, and assessment type (`CCE` or `Term/Semester`). |
| `ExamName` | Named exam instances (e.g., "Mid Term 2026-27") linked to an `ExamType`, start/end dates, academic year, lock flag, and publish flag. |
| `ExamSchedule` | Subject-wise schedule slots per class/section with date, start time, end time, room no, and max marks. |
| `ExamAllocation` | Links exam, class, section, subject, sequence, and assigned faculty member. |
| `ExamMarks` | Student-level marks records containing marks obtained, max marks, min marks, absent flag, grade, remarks, entered/modified by, locked status. Unique constraint on `(examNameId, studentId, subjectName)`. |
| `ExamAuditLog` | Audit records capturing old marks vs new marks, timestamp, modifier name, role, and mandatory modification reason. |
| `GradeScale` | Configurable grade brackets (A+, A, B+, B, C, D, F) with min/max percentages, grade point, and remarks. |
| `ExamWeightage` | Academic year aggregation weightages (e.g., FA1-FA4 = 40%, Mid Term = 20%, Final = 40%). |
| `CCESkill` | Co-scholastic skills master (Creativity, Discipline, Teamwork, Sports, Art) with letter or 1-5 scale. |
| `CCETestType` | Formative evaluation modes (Oral, Project, Practical, Written assignment). |
| `StudentCCEGrade` | Term-wise student grades on co-scholastic skills. |

---

## 4. Backend REST API Endpoints (`/api/examination/...`)

### Student & Parent Protected Endpoint
- `GET /api/examination/my-marks`: Returns the authenticated student's published marks, subject breakdown, and consolidated percentage.

### Faculty & Admin Endpoints (`authorize('admin', 'principal', 'teacher')`)
- `GET /api/examination/types`: Retrieve exam types for the academic year.
- `POST /api/examination/types`: Create new exam type.
- `PUT /api/examination/types/:id`: Update exam type.
- `DELETE /api/examination/types/:id`: Delete exam type (blocked if marks exist).
- `GET /api/examination/names`: Retrieve exam instances.
- `POST /api/examination/names`: Create exam instance.
- `POST /api/examination/schedules`: Add schedule slot.
- `GET /api/examination/allocations`: Retrieve allocated score sheets.
- `POST /api/examination/allocations`: Allocate score sheet to faculty.
- `DELETE /api/examination/allocations/:id`: Deallocate score sheet.
- `GET /api/examination/marks`: Fetch student roster and entered marks for Class + Section + Exam + Subject.
- `POST /api/examination/marks/bulk`: Bulk save multiple rows in a single transaction.
- `PUT /api/examination/marks/modify/:id`: Modify marks with mandatory audit trail reason.
- `GET /api/examination/audit-logs`: View all audit log entries.
- `POST /api/examination/toggle-lock`: Lock / unlock marks sheet (Admin only).
- `POST /api/examination/toggle-publish`: Publish / unpublish marks to students/parents (Admin only).
- `GET /api/examination/report-cards`: Generate student and class report card data with ranks.
- `GET /api/examination/analytics`: Class average, pass percentage, subject stats, leaderboard, and pending teacher tracker.
- `GET /api/examination/cce-skills`: Retrieve CCE skills.
- `POST /api/examination/cce-skills`: Create CCE skill.
- `GET /api/examination/grades`: Retrieve grade scales.
- `POST /api/examination/grades`: Save grade scale.

---

## 5. Frontend UI Structure & Submodules

The frontend UI is hosted at route `/examination` in [`ExaminationPage.jsx`](file:///d:/school-crm/apps/web/src/pages/ExaminationPage.jsx):
1. **Define Exam Type**: Master table with edit, delete (with marks existence guard), and add modal.
2. **Exam Names / Description & Schedule**: Instances list with start/end dates, published badges, and timetable slots.
3. **Marks Entry**: Filter by Class, Section, Exam, Subject, Faculty. Student roster table with checkboxes, Absent toggle, row edit, CSV template download, CSV import, and Bulk Save.
4. **Modify Marks & Audit Trail**: Search, edit with mandatory reason modal, and audit log drawer.
5. **Marks Card (Printable Report Card)**: Official school header, student details, subject marks, percentage, grade, rank, attendance, teacher remarks, signatures, and browser print layout.
6. **Individual Marks Details**: Multi-term consolidated student marks profile with weighted summary.
7. **CCE Skills & Test Types**: Master tables for co-scholastic skills and formative test categories.
8. **Score Sheet Allocation**: Allocate and deallocate exam sheets to faculty members with sequence numbers.
9. **Grading Engine**: Configurable grade scale table (A+ to F).
10. **Result Analytics**: 4 KPI cards (Class average, pass rate, highest marks, tested count), class rank leaderboard, and faculty pending submission tracker.

### Navigation Integration
- Added to **Admin Sidebar** under "Examination System" with quick links.
- Added to **Teacher Sidebar** under "Teacher Portal" -> "Examination System".
- Hidden completely from Student and Parent views.
- Added quick action banner tiles to **Dashboard** ([`DashboardPage.jsx`](file:///d:/school-crm/apps/web/src/pages/DashboardPage.jsx)).
- Embedded individual published marks inside [`SafePickupPage.jsx`](file:///d:/school-crm/apps/web/src/pages/SafePickupPage.jsx) sub-tab `5. 🎯 Exam Marks & Report`.

---

## 6. Verification & Automated Test Results

The test suite executed via `node services/gateway/scripts/verifyExaminationSystem.js` passed **10 out of 10 tests**:
1. Unauthenticated request to `/types` -> **401 Unauthorized** (PASS)
2. Student access to management `/types` -> **403 Forbidden** (PASS)
3. Student access to `/my-marks` -> **200 OK** (PASS)
4. Admin access to `/types` -> **200 OK** (6 types returned)
5. Admin access to `/names` -> **200 OK** (4 instances returned)
6. Marks roster retrieval -> **200 OK**
7. Report card data generation -> **200 OK**
8. Analytics metrics calculation -> **200 OK**
9. CCE skills retrieval -> **200 OK** (6 skills returned)
10. Grade scales retrieval -> **200 OK** (7 grade tiers returned)
