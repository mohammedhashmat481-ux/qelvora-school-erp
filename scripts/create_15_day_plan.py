import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_plan_excel():
    wb = openpyxl.Workbook()
    
    # ----------------------------------------------------
    # STYLES & COLOR PALETTE (Enterprise SaaS)
    # ----------------------------------------------------
    c_navy_dark = "1E3A8A"     # Royal Navy primary
    c_navy_deep = "0F172A"     # Deep Slate header
    c_blue_subtle = "DBEAFE"   # Ice Blue highlight
    c_blue_light = "EFF6FF"    # Very light blue
    c_slate_head = "1E293B"    # Table header
    c_slate_sub = "475569"     # Subheaders
    c_zebra = "F8FAFC"         # Alternating row fill
    c_white = "FFFFFF"         # White
    c_border = "CBD5E1"        # Soft border
    c_border_dark = "94A3B8"   # Darker border
    c_emerald = "059669"       # Done / Green
    c_emerald_light = "D1FAE5"
    c_amber = "D97706"         # Progress / Amber
    c_amber_light = "FEF3C7"
    
    font_title = Font(name="Segoe UI", size=16, bold=True, color=c_white)
    font_subtitle = Font(name="Segoe UI", size=10, italic=True, color=c_blue_subtle)
    font_sec_head = Font(name="Segoe UI", size=12, bold=True, color=c_navy_dark)
    font_table_head = Font(name="Segoe UI", size=10, bold=True, color=c_white)
    font_bold = Font(name="Segoe UI", size=10, bold=True, color="0F172A")
    font_regular = Font(name="Segoe UI", size=10, color="1E293B")
    font_sm_muted = Font(name="Segoe UI", size=9, color="64748B")
    font_kpi_num = Font(name="Segoe UI", size=20, bold=True, color=c_navy_dark)
    font_kpi_lbl = Font(name="Segoe UI", size=9, bold=True, color="64748B")
    
    fill_navy_dark = PatternFill(start_color=c_navy_dark, end_color=c_navy_dark, fill_type="solid")
    fill_slate_head = PatternFill(start_color=c_slate_head, end_color=c_slate_head, fill_type="solid")
    fill_ice_blue = PatternFill(start_color=c_blue_light, end_color=c_blue_light, fill_type="solid")
    fill_zebra = PatternFill(start_color=c_zebra, end_color=c_zebra, fill_type="solid")
    fill_white = PatternFill(start_color=c_white, end_color=c_white, fill_type="solid")
    fill_emerald_badge = PatternFill(start_color=c_emerald_light, end_color=c_emerald_light, fill_type="solid")
    fill_amber_badge = PatternFill(start_color=c_amber_light, end_color=c_amber_light, fill_type="solid")
    
    thin_side = Side(border_style="thin", color=c_border)
    thick_bottom = Side(border_style="medium", color=c_navy_dark)
    box_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
    header_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thick_bottom)
    
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center")
    
    # ====================================================
    # SHEET 1: EXECUTIVE SUMMARY & ROADMAP
    # ====================================================
    ws1 = wb.active
    ws1.title = "Executive Summary"
    ws1.views.sheetView[0].showGridLines = True
    
    # Title Banner
    ws1.merge_cells("A1:G1")
    ws1["A1"] = "QELVORA SCHOOL CRM — 15-DAY PRODUCTION COMPLETION PLAN"
    ws1["A1"].font = font_title
    ws1["A1"].fill = fill_navy_dark
    ws1["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws1.row_dimensions[1].height = 40
    
    ws1.merge_cells("A2:G2")
    ws1["A2"] = "Daily Commitment: 6 Hours/Day  |  Total Budget: 90 Hours  |  Target: 100% Production Readiness, Multi-Portal Polish & Enterprise Deployment"
    ws1["A2"].font = font_subtitle
    ws1["A2"].fill = fill_navy_dark
    ws1["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws1.row_dimensions[2].height = 24
    
    # Summary KPI Cards
    kpis = [
        ("B4:B5", "B4", "15", "TOTAL DAYS"),
        ("C4:C5", "C4", "6 Hours", "DAILY EFFORT"),
        ("D4:D5", "D4", "90 Hours", "TOTAL HOURS"),
        ("E4:E5", "E4", "5", "CORE PHASES"),
        ("F4:F5", "F4", "100%", "TARGET STABILITY")
    ]
    for merge_range, top_left, val, label in kpis:
        cell_col = top_left[0]
        ws1[top_left] = val
        ws1[top_left].font = font_kpi_num
        ws1[top_left].alignment = align_center
        ws1[f"{cell_col}5"] = label
        ws1[f"{cell_col}5"].font = font_kpi_lbl
        ws1[f"{cell_col}5"].alignment = align_center
        for r in range(4, 6):
            ws1[f"{cell_col}{r}"].border = box_border
            ws1[f"{cell_col}{r}"].fill = fill_ice_blue
    ws1.row_dimensions[4].height = 28
    ws1.row_dimensions[5].height = 18

    # Phase Breakdown Table
    ws1["A7"] = "PROJECT PHASE ARCHITECTURE & EFFORT ALLOCATION"
    ws1["A7"].font = font_sec_head
    ws1.merge_cells("A7:G7")
    ws1.row_dimensions[7].height = 25
    
    phase_headers = ["Phase ID", "Phase Name", "Day Span", "Total Hours", "Primary Focus Area", "Key Deliverables", "Target Milestone"]
    for col_idx, h in enumerate(phase_headers, 1):
        cell = ws1.cell(row=8, column=col_idx, value=h)
        cell.font = font_table_head
        cell.fill = fill_slate_head
        cell.alignment = align_center if col_idx in [1, 3, 4] else align_left
        cell.border = header_border
    ws1.row_dimensions[8].height = 26
    
    phases_data = [
        ("Phase 1", "Database Hardening & Gateway Validation", "Days 1 – 3", 18, "Prisma schema constraints, index tuning, strict input DTO validation, sanitized error envelopes", "Locked DB schema, centralized error handlers, zero data leaks", "Core Backend Robustness"),
        ("Phase 2", "Role-Based Portals: Teacher, Student & Parent", "Days 4 – 7", 24, "Classroom roll-call, Gradebook/homework dispatch, student academic hub, parent daily live tracking", "Interactive Teacher Gradebook, Student Timetable view, Parent Ward Progress Card", "End-to-End User Experience"),
        ("Phase 3", "Safe Pickup & Real-Time Notification Pipeline", "Days 8 – 10", 18, "Guard gate QR camera scanner, WebSocket event dispatcher, multi-channel SMS & Email alert triggers", "Mobile security scanner page, instant parent absent/pickup notifications, live toast sync", "Campus Safety & Live Sync"),
        ("Phase 4", "AI Microservice Scaling & Enterprise Reporting", "Days 11 – 13", 18, "FastAPI facial embeddings vector cache, liveness detection, bus GPS route simulation, PDF report card engine", "Sub-150ms face verify speed, official PDF report cards, transport route tracker", "Intelligence & Reporting"),
        ("Phase 5", "Security Audit, Docker Containerization & Handover", "Days 14 – 15", 12, "Penetration audit, rate limiting, production Docker multi-stage build, automated DB backup cron, user manual", "Production docker-compose, SSL reverse proxy config, signed-off deployment handbook", "Production Launch")
    ]
    
    for row_idx, data in enumerate(phases_data, 9):
        fill_curr = fill_zebra if row_idx % 2 == 0 else fill_white
        ws1.row_dimensions[row_idx].height = 32
        for col_idx, val in enumerate(data, 1):
            cell = ws1.cell(row=row_idx, column=col_idx, value=val)
            cell.font = font_bold if col_idx in [1, 2] else font_regular
            cell.fill = fill_curr
            cell.border = box_border
            if col_idx in [1, 3]:
                cell.alignment = align_center
            elif col_idx == 4:
                cell.alignment = align_center
                cell.value = f"{val} hrs"
            else:
                cell.alignment = align_left

    # Total Row for Phases
    ws1.row_dimensions[14].height = 24
    ws1.merge_cells("A14:C14")
    ws1["A14"] = "TOTAL PROJECT EFFORT"
    ws1["A14"].font = font_bold
    ws1["A14"].alignment = Alignment(horizontal="right", vertical="center")
    ws1["A14"].fill = fill_ice_blue
    ws1["A14"].border = box_border
    ws1["B14"].border = box_border
    ws1["C14"].border = box_border

    ws1["D14"] = "90 hrs"
    ws1["D14"].font = font_bold
    ws1["D14"].alignment = align_center
    ws1["D14"].fill = fill_ice_blue
    ws1["D14"].border = box_border

    ws1.merge_cells("E14:G14")
    ws1["E14"] = "15 Consecutive Days @ 6.0 Hours per Working Day"
    ws1["E14"].font = font_bold
    ws1["E14"].alignment = align_left
    ws1["E14"].fill = fill_ice_blue
    ws1["E14"].border = box_border
    ws1["F14"].border = box_border
    ws1["G14"].border = box_border

    # ====================================================
    # SHEET 2: 15-DAY MASTER SCHEDULE
    # ====================================================
    ws2 = wb.create_sheet(title="15-Day Master Schedule")
    ws2.views.sheetView[0].showGridLines = True
    
    # Header Banner
    ws2.merge_cells("A1:I1")
    ws2["A1"] = "DAY-BY-DAY EXECUTION SCHEDULE (DAILY 6 WORKING HOURS)"
    ws2["A1"].font = font_title
    ws2["A1"].fill = fill_navy_dark
    ws2["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[1].height = 36
    
    ws2.merge_cells("A2:I2")
    ws2["A2"] = "Each day is strictly partitioned into Session 1 (3 Hours Core Dev) and Session 2 (3 Hours Integration & Testing)"
    ws2["A2"].font = font_subtitle
    ws2["A2"].fill = fill_navy_dark
    ws2["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[2].height = 22

    sched_headers = [
        "Day #", "Phase", "Daily Hours", "Session 1 (Morning: 3h)", "Session 2 (Afternoon: 3h)",
        "Key Deliverables & Code Changes", "Target Module", "Verification & Test Criteria", "Status"
    ]
    for col_idx, h in enumerate(sched_headers, 1):
        cell = ws2.cell(row=4, column=col_idx, value=h)
        cell.font = font_table_head
        cell.fill = fill_slate_head
        cell.alignment = align_center if col_idx in [1, 2, 3, 9] else align_left
        cell.border = header_border
    ws2.row_dimensions[4].height = 28

    schedule_data = [
        (
            "Day 1", "Phase 1", 6,
            "Audit all 17 Prisma models: verify foreign keys, cascading deletes, index performance on student/attendance tables",
            "Generate production Prisma migrations, write automated DB health check script, verify PostgreSQL port 5432 query plans",
            "Locked schema.prisma, automated migration scripts, schema integrity checker script",
            "Database / Prisma", "All relations validated with zero migration drift or missing foreign key errors", "Planned"
        ),
        (
            "Day 2", "Phase 1", 6,
            "Implement strict request validation middleware (Zod/Joi) across Auth, Admin, Faculty, and Timetable endpoints",
            "Sanitize error handlers (eliminate stack trace leakage in prod), standardize response format {status, data, message}",
            "Validation schemas for all POST/PUT routes, centralized API error interceptor",
            "Gateway API", "Bad inputs return clean 400 Bad Request with descriptive validation pointers", "Planned"
        ),
        (
            "Day 3", "Phase 1", 6,
            "Audit JWT access token expiration, refresh token rotation, and cookie security flags (httpOnly, sameSite, secure)",
            "Build role-guard middleware requireRole(['admin','teacher','student','parent']), test IDOR and route traversal",
            "Role authorization matrix middleware, automated auth test suite with 100% route coverage",
            "Security & Auth", "Unprivileged roles blocked with 403 Forbidden; zero route privilege escalation", "Planned"
        ),
        (
            "Day 4", "Phase 2", 6,
            "Build teacher roll-call UI in TeacherSectionPage.jsx: one-click Present, Absent, Late, Excused with batch submission",
            "Implement POST /api/attendance/bulk-student, compute live class attendance rates, trigger instant parent absence notice",
            "Interactive Teacher Roll-Call interface, batch attendance gateway route, live percentage gauge",
            "Teacher Section", "Teacher can mark 30 students in under 20 seconds; DB logs attendance timestamps", "Planned"
        ),
        (
            "Day 5", "Phase 2", 6,
            "Develop Gradebook module: assessment categories (Unit Test, Midterm, Final), tabular marks entry with auto-grade (A+, A, B)",
            "Build Homework Assignment Manager: attachment upload, deadline picker, student submission overview table",
            "Teacher Gradebook component, Homework dispatch API, student submission reviewer",
            "Academic Engine", "Grades calculate instantly without page refresh; homework files upload smoothly", "Planned"
        ),
        (
            "Day 6", "Phase 2", 6,
            "Refactor Student Dashboard: personal weekly timetable grid, assigned teachers contact card, daily attendance gauge",
            "Integrate recorded lectures player with chapter navigation, downloadable PDF study notes repository",
            "Responsive Student Portal UI, student timetable matrix viewer, lecture stream player",
            "Student Portal", "Logged-in student views only their standard/section schedule and study materials", "Planned"
        ),
        (
            "Day 7", "Phase 2", 6,
            "Develop Parent Dashboard: multi-child switcher, live daily attendance punch status (In School / Left School)",
            "Build Ward Academic Progress Card: subject-wise marks breakdown, teacher remarks, attendance percentage progress ring",
            "Dedicated Parent Portal interface, child selector state manager, downloadable term report card",
            "Parent Portal", "Parents with multiple enrolled children seamlessly switch profiles and track records", "Planned"
        ),
        (
            "Day 8", "Phase 3", 6,
            "Build mobile-responsive QR camera scanner component using HTML5 camera stream for school security gate wardens",
            "Verification engine: match scanned student QR with authorized pickup guardian photos and emergency contacts",
            "Gate Scanner interface, instant guardian identity card modal, audit logging for gate dismissals",
            "Safe Pickup", "Camera scans QR in <500ms; displays verified guardian photo and dismissal button", "Planned"
        ),
        (
            "Day 9", "Phase 3", 6,
            "Set up Socket.io / WebSocket server in gateway for instantaneous system events (attendance punch, bus alert, notices)",
            "Build frontend WebSocket client listener with interactive toast alerts and notification bell dropdown in Navbar",
            "WebSocket event bridge, live notification drawer component, unread counter badge",
            "Real-Time Sync", "Admin/Parent receives immediate push notification when student punches in/out", "Planned"
        ),
        (
            "Day 10", "Phase 3", 6,
            "Build notification dispatcher service: email notifications (Nodemailer/SendGrid template) and SMS stubs (Twilio)",
            "Configure automated event triggers: student marked absent at 08:45 AM triggers instant parent SMS/Email alert",
            "Configurable notification template engine, background job queue for async dispatches",
            "Alerts System", "Automated email/SMS payload verified via mock webhook and local logging", "Planned"
        ),
        (
            "Day 11", "Phase 4", 6,
            "Optimize Python FastAPI face recognition service: implement embedding vector indexing for sub-150ms verification",
            "Add basic blink / liveness detection heuristic to prevent photo spoofing during face verification punches",
            "High-throughput face verification benchmark (<150ms), anti-spoofing confidence score filter",
            "AI Microservice", "System rejects printed photos and verifies live human face with 98%+ confidence", "Planned"
        ),
        (
            "Day 12", "Phase 4", 6,
            "Build Transport Management UI: bus routes, driver profile card (Ramesh Pawar), capacity counter, simulated GPS route",
            "Develop Parent Bus Tracker: estimated arrival time (ETA) to ward pickup stop, driver emergency call button",
            "Transport management dashboard, interactive route stop tracker, driver dispatch status",
            "Fleet Transport", "Simulated bus route moves smoothly along designated stops; parent sees live ETA", "Planned"
        ),
        (
            "Day 13", "Phase 4", 6,
            "Build official PDF generator service (Puppeteer/PDFKit) for School Report Cards, Student ID cards with barcode",
            "Enhance Excel export engine with multi-tab workbooks (Monthly Attendance Matrix, Fee Dues, Syllabus Completion)",
            "Pixel-perfect PDF student report card template, branded multi-tab Excel export engine",
            "Reporting Engine", "Downloads crisp PDF report cards and Excel sheets that open cleanly in MS Excel", "Planned"
        ),
        (
            "Day 14", "Phase 5", 6,
            "Security hardening: express-rate-limit on /api/auth/*, Helmet headers, CORS strict whitelist, SQL/XSS penetration test",
            "Cross-browser and mobile responsive testing (Chrome, Safari, Edge, Firefox), fix viewport edge cases and touch targets",
            "Zero high-severity security vulnerabilities, verified mobile responsive layouts across all 15 screens",
            "QA & Security", "Automated penetration audit passes with zero critical or high-severity vulnerabilities", "Planned"
        ),
        (
            "Day 15", "Phase 5", 6,
            "Write multi-stage production Dockerfiles (Web Nginx, Gateway Node, AI Python slim); write docker-compose.prod.yml",
            "Configure automated DB backup cron script (pg_dump), write production deployment handbook & final UAT sign-off",
            "Complete Docker deployment bundle, automated backup utility, production-ready system handover",
            "DevOps / Deploy", "Single command 'docker compose up' boots all 4 containers cleanly in production mode", "Planned"
        )
    ]

    for row_idx, d in enumerate(schedule_data, 5):
        fill_curr = fill_zebra if row_idx % 2 == 0 else fill_white
        ws2.row_dimensions[row_idx].height = 42
        for col_idx, val in enumerate(d, 1):
            cell = ws2.cell(row=row_idx, column=col_idx, value=val)
            cell.font = font_bold if col_idx in [1, 2] else font_regular
            cell.fill = fill_curr
            cell.border = box_border
            if col_idx in [1, 2]:
                cell.alignment = align_center
            elif col_idx == 3:
                cell.alignment = align_center
                cell.value = f"{val}h"
            elif col_idx == 9:
                cell.alignment = align_center
                cell.font = Font(name="Segoe UI", size=9, bold=True, color=c_amber)
                cell.fill = fill_amber_badge
            else:
                cell.alignment = align_left

    # ====================================================
    # SHEET 3: MODULE CHECKLIST & ACCEPTANCE CRITERIA
    # ====================================================
    ws3 = wb.create_sheet(title="Module Scope & Checklist")
    ws3.views.sheetView[0].showGridLines = True
    
    ws3.merge_cells("A1:G1")
    ws3["A1"] = "QELVORA SCHOOL CRM — MODULE SCOPE & ACCEPTANCE CHECKLIST"
    ws3["A1"].font = font_title
    ws3["A1"].fill = fill_navy_dark
    ws3["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws3.row_dimensions[1].height = 36

    mod_headers = ["Module ID", "Module Name", "Current Status", "Remaining Production Tasks", "Effort (Hrs)", "Priority", "Acceptance Criteria"]
    for col_idx, h in enumerate(mod_headers, 1):
        cell = ws3.cell(row=3, column=col_idx, value=h)
        cell.font = font_table_head
        cell.fill = fill_slate_head
        cell.alignment = align_center if col_idx in [1, 3, 5, 6] else align_left
        cell.border = header_border
    ws3.row_dimensions[3].height = 28

    modules_data = [
        ("MOD-01", "Core Auth & Roles", "90% Complete", "Add refresh token rotation, strict cookie policies, rate limiting", 6, "Critical", "Secure JWT login, zero session hijacking risk, brute force protection"),
        ("MOD-02", "School Settings & Geofence", "95% Complete", "Lock production GPS geofence radius validation, add audit log on changes", 4, "High", "School identity persists and geofence calculates user distance accurately"),
        ("MOD-03", "Faculty & Staff Management", "95% Complete", "Add bulk CSV import for new teachers, PDF contract generation", 6, "High", "Admin can view, edit, credential, and bulk-import academic faculty"),
        ("MOD-04", "Classes, Sections & Subjects", "100% Complete", "Finalize ICSE/State board curriculum mapping tags", 4, "Medium", "Full CRUD operations for all 13 class sections and subjects"),
        ("MOD-05", "Academic Timetable Matrix", "95% Complete", "Lock timetable publish button, conflict alert if teacher double-booked", 6, "Critical", "Class and Teacher grid views render with zero slot conflicts"),
        ("MOD-06", "Student Admission & Enrollment", "90% Complete", "Add parent-student linking verification, emergency blood group fields", 6, "High", "Student records link seamlessly to parents, roll numbers generated"),
        ("MOD-07", "Teacher Roll-Call & Gradebook", "75% Complete", "Build roll-call bulk UI, marks entry matrix, automated grade calculator", 10, "Critical", "Teachers submit daily attendance in <20s and enter exam marks smoothly"),
        ("MOD-08", "Student Academic Portal", "80% Complete", "Integrate recorded video lecture stream, downloadable study repository", 8, "High", "Students access personalized schedules, report cards, and video lessons"),
        ("MOD-09", "Parent Live Tracking Portal", "80% Complete", "Multi-child switcher, live punch in/out feed, ward report card download", 8, "High", "Parents observe child daily attendance status and progress reports"),
        ("MOD-10", "Safe Pickup & QR Verification", "80% Complete", "Build gate warden camera scanner, match authorized guardian photos", 6, "Critical", "Security guards verify guardian identity in under 2 seconds via QR scan"),
        ("MOD-11", "AI Facial Attendance & Liveness", "85% Complete", "Index embeddings in memory, add liveness check against photo spoofing", 8, "High", "Facial punch verifies in <150ms with zero photo spoof vulnerabilities"),
        ("MOD-12", "Real-Time WebSocket & Alerts", "70% Complete", "Set up Socket.io bridge, automated SMS/Email absence alerts", 8, "Critical", "Parents receive instant absent notices when child misses morning roll-call"),
        ("MOD-13", "School Transport & Bus Fleet", "75% Complete", "Simulated bus route tracker, driver emergency call button, ETA display", 6, "Medium", "Parents track bus location and receive ETA updates on route stops"),
        ("MOD-14", "PDF & Excel Reporting Suite", "85% Complete", "Puppeteer PDF generator for official school report cards and ID cards", 6, "High", "Instant download of official PDF report cards and Excel monthly tables"),
        ("MOD-15", "Docker Deployment & DevOps", "60% Complete", "Production multi-stage Dockerfiles, docker-compose.prod.yml, backup cron", 8, "Critical", "Whole stack boots with 'docker compose up' and runs with SSL enabled")
    ]

    for row_idx, m in enumerate(modules_data, 4):
        fill_curr = fill_zebra if row_idx % 2 == 0 else fill_white
        ws3.row_dimensions[row_idx].height = 28
        for col_idx, val in enumerate(m, 1):
            cell = ws3.cell(row=row_idx, column=col_idx, value=val)
            cell.font = font_bold if col_idx in [1, 2] else font_regular
            cell.fill = fill_curr
            cell.border = box_border
            if col_idx in [1, 3]:
                cell.alignment = align_center
            elif col_idx == 5:
                cell.alignment = align_center
                cell.value = f"{val}h"
            elif col_idx == 6:
                cell.alignment = align_center
                cell.font = Font(name="Segoe UI", size=9, bold=True, color="B91C1C" if val=="Critical" else ("B45309" if val=="High" else "15803D"))
            else:
                cell.alignment = align_left

    # ====================================================
    # SHEET 4: DAILY TIME TRACKING LOG (Interactive Template)
    # ====================================================
    ws4 = wb.create_sheet(title="Daily Time Tracking Log")
    ws4.views.sheetView[0].showGridLines = True
    
    ws4.merge_cells("A1:H1")
    ws4["A1"] = "DAILY 6-HOUR TIME TRACKING & TASK COMPLETION LOG"
    ws4["A1"].font = font_title
    ws4["A1"].fill = fill_navy_dark
    ws4["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws4.row_dimensions[1].height = 36

    ws4.merge_cells("A2:H2")
    ws4["A2"] = "Fill in your actual hours, completed tasks, and blockers daily to monitor project velocity."
    ws4["A2"].font = font_subtitle
    ws4["A2"].fill = fill_navy_dark
    ws4["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws4.row_dimensions[2].height = 22

    log_headers = ["Day #", "Planned Date", "Planned Hrs", "Actual Hrs Spent", "Session 1 Output (3h)", "Session 2 Output (3h)", "Blockers / Impediments", "Daily Sign-Off"]
    for col_idx, h in enumerate(log_headers, 1):
        cell = ws4.cell(row=4, column=col_idx, value=h)
        cell.font = font_table_head
        cell.fill = fill_slate_head
        cell.alignment = align_center if col_idx in [1, 2, 3, 4, 8] else align_left
        cell.border = header_border
    ws4.row_dimensions[4].height = 28

    for d in range(1, 16):
        row_idx = 4 + d
        fill_curr = fill_zebra if d % 2 == 0 else fill_white
        ws4.row_dimensions[row_idx].height = 30
        
        ws4.cell(row=row_idx, column=1, value=f"Day {d}").alignment = align_center
        ws4.cell(row=row_idx, column=2, value=f"Day {d} Date").alignment = align_center
        ws4.cell(row=row_idx, column=3, value=6.0).alignment = align_center
        ws4.cell(row=row_idx, column=4, value="").alignment = align_center  # User will fill
        ws4.cell(row=row_idx, column=5, value="").alignment = align_left
        ws4.cell(row=row_idx, column=6, value="").alignment = align_left
        ws4.cell(row=row_idx, column=7, value="None").alignment = align_left
        ws4.cell(row=row_idx, column=8, value="Pending").alignment = align_center

        for col_idx in range(1, 9):
            c = ws4.cell(row=row_idx, column=col_idx)
            c.font = font_regular
            c.fill = fill_curr
            c.border = box_border

    # Total row in Log
    ws4.row_dimensions[20].height = 26
    ws4.merge_cells("A20:B20")
    ws4["A20"] = "TOTAL HOURS:"
    ws4["A20"].font = font_bold
    ws4["A20"].alignment = Alignment(horizontal="right", vertical="center")
    ws4["A20"].fill = fill_ice_blue
    ws4["A20"].border = box_border
    ws4["B20"].border = box_border

    ws4["C20"] = "=SUM(C5:C19)"
    ws4["C20"].font = font_bold
    ws4["C20"].alignment = align_center
    ws4["C20"].fill = fill_ice_blue
    ws4["C20"].border = box_border

    ws4["D20"] = "=SUM(D5:D19)"
    ws4["D20"].font = font_bold
    ws4["D20"].alignment = align_center
    ws4["D20"].fill = fill_ice_blue
    ws4["D20"].border = box_border

    ws4.merge_cells("E20:H20")
    ws4["E20"] = "Target: 90.0 Total Working Hours across 15 Days"
    ws4["E20"].font = font_bold
    ws4["E20"].alignment = align_left
    ws4["E20"].fill = fill_ice_blue
    for col_c in ["E", "F", "G", "H"]:
        ws4[f"{col_c}20"].border = box_border

    # ----------------------------------------------------
    # COLUMN WIDTH AUTO-ADJUSTMENT FOR ALL SHEETS
    # ----------------------------------------------------
    col_widths = {
        "Executive Summary": { "A": 14, "B": 28, "C": 14, "D": 16, "E": 44, "F": 44, "G": 28 },
        "15-Day Master Schedule": { "A": 10, "B": 14, "C": 12, "D": 42, "E": 42, "F": 38, "G": 20, "H": 40, "I": 12 },
        "Module Scope & Checklist": { "A": 12, "B": 30, "C": 18, "D": 42, "E": 14, "F": 14, "G": 45 },
        "Daily Time Tracking Log": { "A": 10, "B": 16, "C": 14, "D": 16, "E": 35, "F": 35, "G": 30, "H": 18 }
    }

    for sheetname, widths in col_widths.items():
        ws = wb[sheetname]
        for col_letter, width in widths.items():
            ws.column_dimensions[col_letter].width = width

    output_path = "SCHOOL_CRM_15_Day_Completion_Plan.xlsx"
    wb.save(output_path)
    print(f"Successfully generated: {output_path} (Size: {os.path.getsize(output_path)} bytes)")

if __name__ == "__main__":
    build_plan_excel()
