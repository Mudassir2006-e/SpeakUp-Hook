# LMS Development Restrictions & Architectural Isolation

## Strict Boundary Rules

### 1. Architectural Isolation
> LMS development must remain isolated from the main website. Do not add, remove, redesign, restyle, reposition, or modify any element of the main website while working on the LMS panel unless explicitly requested by the user.

### 2. Design Hygiene & Restraint
> Do not add unnecessary UI elements, decorative dots, decorative shapes, new buttons, new cards, new rounded containers, or unrelated design elements.

### 3. Feature Encapsulation
> If a requested LMS feature can be implemented without modifying the main website, implement it only inside the LMS.

---

## Protected Main Website Surfaces

When working on any LMS panel task (such as `/lms`, `/lms/learn`, `/lms/courses`, `/lms/dashboard`):
* **Do NOT change homepage design.**
* **Do NOT change Course Panel design.**
* **Do NOT change Pricing & Enrollment.**
* **Do NOT change About page.**
* **Do NOT change Methodology page.**
* **Do NOT change Reviews page.**
* **Do NOT change Demo page.**
* **Do NOT change Privacy page.**
* **Do NOT change main website navigation or footers.**

LMS features, routes, states, and modals must remain self-contained within `/src/app/lms/*` unless explicit authorization is provided by the user.
