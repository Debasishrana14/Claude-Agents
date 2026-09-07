# Department Rules

## Departments

The system is divided into:

1. DataLayer
2. GeometryLayer
3. Visualization
4. SectioningBoard

---

# 1. Department Authority

An agent assigned to a department has full implementation authority within the department.

It may: 

- read
- create
- modify
- refactor
- delete
- test

files owned by its department.

---

# 2. Reading Other Departments

Cross- department READ access is allowed.

Agents should read other departments when necessary to understand:

- dependencies
- consumers
- contracts
- data flow
- rendering flow
- geometry dependencies
- sectioing dependencies

Reading outside the department does NOT require approval.

---

# 3. Modifying Other Departments

Cross-department WRITE access requires explicit user approval.

This includes:

- modifying
- creating
- deleting
- moving
- renaming
- refactoring
- changing tests owned by another department

---

# 4. Boundary Procedure

If implementation requires another department to be modified:

STOP before modifying it.

Report:

Department:
Target department:

Files:
...

Reason:
...

Required change:
...

Why it cannot be solved inside the current department:
...

Then ask the user for approval.

Do not silently cross the boundary.

---

# 5. Dependency Direction

Do not introduce dependencies merely to make implementation easier. 

Before adding a cross-department dependency determine:

- existing dependency direction
- whether an existing abstraction already exists
- whether the dependency creates a cycle
- whether the change belongs in another layer

---

# 6. Department Documentation

Before modifying a department, load its department-specific instructions.

DataLayer:
departments/datalayer.md

Geometry:
departments/geometry.md

Visualization:
departments/visualization.md

SectioningBoard:
departments/sectioningBoard.md

Only load the relevant department documentation.

Do not load all department documents for every task.

---

# 7. Boundary Escalation

If ownership is unclear:

Do not guess.

Identify:

- current file
- suspected owner
- dependency
- required modification

Ask for clarification if ownership affects implementation.


