# SpeakUp LMS — Admin Panel Development Rules

## CRITICAL: EXISTING LMS PROTECTION

The existing SpeakUp frontend website and LMS are considered LOCKED.

While developing the Admin Panel:

* DO NOT modify the existing LMS UI.
* DO NOT modify the existing frontend website UI.
* DO NOT change existing colors.
* DO NOT change typography.
* DO NOT change spacing, padding, margins, alignment, sizing, borders, radius, shadows, animations, icons, images, or layouts.
* DO NOT modify existing LMS components unless explicitly requested.
* DO NOT modify existing LMS routes or their behavior.
* DO NOT remove existing functionality.
* DO NOT add decorative elements, dots, particles, cards, animations, or visual effects to the existing LMS.
* DO NOT "improve" or redesign any existing LMS section automatically.
* DO NOT rename existing components, pages, routes, or files unless explicitly required.
* DO NOT replace the existing LMS design with an Admin Panel design.

---

## ADMIN PANEL IS A SEPARATE DEVELOPMENT AREA

The Admin Panel must be developed independently from the existing LMS interface.

The Admin Panel may share:

* Existing project infrastructure where technically necessary
* Authentication/session infrastructure
* Supabase/backend infrastructure
* Existing theme tokens/design language

However, Admin Panel development must not visually or functionally alter the existing LMS.

---

## ADMIN ACCESS

* There must NOT be a separate public Admin Login page.
* Administrators enter through the existing website/student authentication flow (`/auth/login`).
* Student credentials and Admin credentials must remain different.
* Admin credentials must be securely stored and must never be exposed in frontend code.
* After successful authentication, the system determines the user's role and grants the appropriate access.

---

## COURSE ACCESS MODEL

Registration and course access are separate concepts.

A newly registered student does NOT automatically receive access to every course.

A student may:

1. Register an account.
2. Request access/enrollment for a specific course.
3. Wait for course verification/approval.
4. Receive access to the approved course.

An administrator must also be able to manually grant a student access to one or multiple courses.

### Examples:

* Student requests B1 → Admin approves B1 → Student receives B1 access.
* Student requests English Course → Admin approves English Course → Student receives English Course access.
* Admin may directly grant B1 or another course without a student request.

---

## STUDENT RESTRICTIONS

Before a student has access to a course:

### Allowed:
* Dashboard
* Events
* Certificate/notification area
* Profile/Edit Profile
* Sign Out

### Restricted:
* Enrolled Courses
* Course lessons
* Learning content
* Protected course modules

Once a course is approved/granted, the student can access that specific course. Access to one course must NOT automatically grant access to unrelated courses.

---

## ADMIN CONTENT MANAGEMENT

The Admin Panel must eventually allow authorized administrators to manage website/LMS content at a granular level. The goal is controlled visual/content editing, similar in concept to a professional design editor.

Administrators should be able to manage, where supported:
* Text
* Headings
* Subheadings
* Font selection
* Font size
* Font weight
* Bold/normal styling
* Text alignment
* Theme-based text colors
* Background colors
* Borders
* Border radius
* Spacing
* Boxes/containers
* Buttons
* Button position
* Button text
* Button links
* Website links
* Phone/number links
* Images
* Course content
* Module content

The editor must use the SpeakUp design system and theme rather than introducing unrelated visual styles.

---

## BUTTON MANAGEMENT

Administrators must be able to:
* Add a button
* Edit button text
* Change button styling
* Move/reposition the button where supported
* Link the button to a website
* Link the button to a phone/number
* Link the button to an internal LMS page
* Edit an existing button

---

## PUBLISH SYSTEM

Every editable page/module should have a controlled publishing workflow.
Changes should NOT automatically become public merely because an administrator edits them.

### Required concept:
`Draft → Review → Publish`

Each applicable page/module should provide a Publish action. Publishing makes the approved changes live.

---

## COURSE VIDEO MANAGEMENT

Course modules should support video sources such as:
* YouTube links
* Google Drive links
* Uploaded/gallery media where technically supported

Video management must be connected to the appropriate course/module rather than hardcoded into the student UI.

---

## DATA SAFETY

* Do not delete existing LMS data.
* Do not overwrite existing data structures without checking their dependencies.
* Do not remove existing Supabase functionality.
* Do not expose private credentials, service-role keys, or secrets in client-side code.
* Use proper role-based authorization for Admin functionality.

---

## DEVELOPMENT WORKFLOW

Before every Admin Panel task:
1. Inspect the existing project structure.
2. Identify whether the requested change belongs to the Admin Panel.
3. Modify only Admin Panel/backend files required for that task.
4. Verify that existing LMS/frontend files were not unnecessarily changed.
5. Test the Admin Panel functionality.
6. Confirm existing LMS routes and functionality remain intact.
7. Do not perform unrelated UI improvements.

---

## MOST IMPORTANT RULE

> **If an Admin Panel task can be completed without changing the existing LMS/frontend, DO NOT CHANGE THE LMS/FRONTEND.**
> 
> **Preserve the existing SpeakUp LMS exactly as it currently exists.**
