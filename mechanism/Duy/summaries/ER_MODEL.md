Optimizing tool selection...Below is a **conceptual ER model (Chen notation)** derived from your tables, focusing on **real-world business concepts** (not tables), **excluding technical/audit/auth fields**, and converting FKs into **relationships**.  
Convention: **Primary keys are underlined** (shown here with underlined text using combining low line).

---

## **Entities (Rectangles) and Attributes (Ovals)**

### **PERSON** (supertype)
- **P̲e̲r̲s̲o̲n̲I̲D̲**
- PersonCode (student/staff code)
- FamilyName
- GivenName
- Email
- Phone
- IdentityCardNumber
- BirthDate
- Gender
- MembershipStatus (Đoàn/Hội status)

### **STUDENT** (subtype of PERSON)
- AdmissionYear
- CurriculumYear
- FacultyCode
- TrainingSystem
- TrainingLevel
- CTXHDaysTotal
- CTXHDaysFromOldSystem

### **STAFF** (subtype of PERSON)
- (no extra business attributes given beyond PERSON)

---

### **DEPARTMENT**
- **D̲e̲p̲a̲r̲t̲m̲e̲n̲t̲I̲D̲**
- DepartmentCode
- DepartmentName
- Description

### **CLASS**
- **C̲l̲a̲s̲s̲I̲D̲**
- ClassName
- AcademicYear

---

### **ORGANIZATION**
- **O̲r̲g̲a̲n̲i̲z̲a̲t̲i̲o̲n̲I̲D̲**
- OrganizationCode
- OrganizationName
- OrganizationType
- Description

---

### **ROLE**
- **R̲o̲l̲e̲I̲D̲**
- RoleName
- Description

### **PERMISSION**
- **P̲e̲r̲m̲i̲s̲s̲i̲o̲n̲I̲D̲**
- PermissionCode
- PermissionName
- Description
- Category
- Context (System vs Organization)

---

### **CTXH_CATEGORY** (Social Activity Category)
- **C̲T̲X̲H̲C̲a̲t̲e̲g̲o̲r̲y̲I̲D̲**
- CategoryName
- Description

### **CTXH_ACTIVITY** (Social Activity)
- **C̲T̲X̲H̲A̲c̲t̲i̲v̲i̲t̲y̲I̲D̲**
- ActivityName
- Description
- StartDate
- EndDate
- Location
- PlannedTotalDays
- ActivityStatus

### **CTXH_LIMIT_POLICY** (CTXH days limit per term/period)
- **L̲i̲m̲i̲t̲P̲o̲l̲i̲c̲y̲I̲D̲**
- MaxDays
- PolicyStatus
- Description

### **PARTICIPATION** (Weak Entity - Student participation in CTXH activity)
- **P̲a̲r̲t̲i̲c̲i̲p̲a̲t̲i̲o̲n̲I̲D̲** (weak key)
- ParticipationStatus
- ActualDays
- Note

---

### **TEMPLATE** (Template Document)
- **T̲e̲m̲p̲l̲a̲t̲e̲I̲D̲**
- TemplateName
- Description
- TemplateStatus

### **TEMPLATE_FIELD**
- **F̲i̲e̲l̲d̲I̲D̲**
- FieldName
- DisplayName
- FieldType
- Placeholder
- HelpText
- DefaultValue
- DisplayOrder
- IsVisible

### **TEMPLATE_SUBMISSION**
- **S̲u̲b̲m̲i̲s̲s̲i̲o̲n̲I̲D̲**
- SubmissionStatus
- SubmittedDate (business event)

### **GENERATED_DOCUMENT** (Output document produced from a submission)
- **G̲e̲n̲D̲o̲c̲I̲D̲**
- FileName
- FileSize

---

### **PAYMENT_CAMPAIGN**
- **C̲a̲m̲p̲a̲i̲g̲n̲I̲D̲**
- CampaignName
- Description
- StartDate
- EndDate
- CampaignStatus

### **FEE_LEVEL**
- **F̲e̲e̲L̲e̲v̲e̲l̲I̲D̲**
- LevelName
- Amount
- Description

### **FEE_ASSIGNMENT** (an obligation assigned to a person)
- **A̲s̲s̲i̲g̲n̲m̲e̲n̲t̲I̲D̲**
- AssignmentStatus
- DueDate
- Note

### **PAYMENT_TRANSACTION** (a payment attempt/record)
- **T̲r̲a̲n̲s̲a̲c̲t̲i̲o̲n̲I̲D̲**
- Amount
- TransactionStatus
- PaymentMethod
- OrderCode
- PaidDate

---

## **Specialization (ISA)**
### PERSON ISA {STUDENT, STAFF}
- **Constraint:** **Disjoint (d)** (a person is either student or staff)
- **Completeness:** **Total** (every PERSON is exactly one of the subtypes)

ASCII view:
```
            PERSON
              |
           ISA (d, total)
          /             \
     STUDENT            STAFF
```

---

## **Relationships (Diamonds) with Cardinalities**

### **Academic structure**
1) **DEPARTMENT —(HasClasses)— CLASS**
- Cardinality: DEPARTMENT **1–N** CLASS  
  (A department has many classes; each class belongs to one department)

2) **STUDENT —(EnrolledIn)— CLASS**
- Cardinality: CLASS **1–N** STUDENT, STUDENT **N–1** CLASS  
  (Each student is in one class; a class has many students)

3) **PERSON —(DepartmentAffiliation)— DEPARTMENT**
- Cardinality: PERSON **N–1** DEPARTMENT (optional on PERSON side)  
- Relationship attribute: AffiliationType {Training, Management}  
  (Models both “training department” and “management department” as a single business concept)

---

### **Organization structure and membership**
4) **ORGANIZATION —(ParentOf)— ORGANIZATION** (recursive)
- Cardinality: Parent ORGANIZATION **1–N** Child ORGANIZATION  
  (A parent has many children; a child has at most one parent)

5) **PERSON —(Membership)— ORGANIZATION**
- Cardinality: **N–N**
- Relationship attributes: MemberRole {Member, Admin, SuperAdmin}, JoinedDate (optional)  
  (This is the conceptual form of “user_organizations”)

---

### **Authorization (business access model)**
6) **ROLE —(Grants)— PERMISSION**
- Cardinality: **N–N**  
  (A role grants many permissions; a permission can be granted by many roles)

7) **PERSON, ROLE, ORGANIZATION —(RoleAssignment)— (ternary)**
- Meaning: Assign a role to a person, optionally scoped to an organization
- Cardinality (conceptual):
  - PERSON **1–N** RoleAssignment
  - ROLE **1–N** RoleAssignment
  - ORGANIZATION **0–N** RoleAssignment (**optional participation**)  
  (This captures “system-wide role” vs “organization-scoped role” without storing FK attributes.)

---

### **CTXH (Social activities)**
8) **CTXH_CATEGORY —(Classifies)— CTXH_ACTIVITY**
- Cardinality: CTXH_CATEGORY **1–N** CTXH_ACTIVITY

9) **ORGANIZATION —(Organizes)— CTXH_ACTIVITY**
- Cardinality: ORGANIZATION **1–N** CTXH_ACTIVITY

10) **STUDENT ══(Registers)══ PARTICIPATION** (identifying relationship, double diamond)
- Cardinality: STUDENT **1–N** PARTICIPATION  
  (Each student can register for many participations; each participation belongs to exactly one student)
- Note: PARTICIPATION is a **weak entity** that depends on STUDENT

11) **PARTICIPATION ══(ForActivity)══ CTXH_ACTIVITY** (identifying relationship, double diamond)
- Cardinality: CTXH_ACTIVITY **1–N** PARTICIPATION  
  (Each activity has many participations; each participation is for exactly one activity)
- Note: PARTICIPATION is **existence-dependent** on CTXH_ACTIVITY

12) **STAFF —(Grades)— PARTICIPATION**
- Cardinality: STAFF **0–N** PARTICIPATION, PARTICIPATION **0–1** STAFF  
  (A staff member can grade many participations; each participation may optionally be graded by one staff)
- Note: This is an **optional relationship** - not all participations are graded

13) **ORGANIZATION —(HasLimitPolicy)— CTXH_LIMIT_POLICY**
- Cardinality: ORGANIZATION **1–N** CTXH_LIMIT_POLICY  
  (Optionally add constraint: “at most one ACTIVE policy at a time” as a business rule.)

---

### **Templates and submissions**
14) **ORGANIZATION —(Owns)— TEMPLATE**
- Cardinality: ORGANIZATION **1–N** TEMPLATE  
  (If templates can be system-wide, ORGANIZATION participation can be optional: TEMPLATE **0–1** ORGANIZATION.)

15) **TEMPLATE —(Defines)— TEMPLATE_FIELD**
- Cardinality: TEMPLATE **1–N** TEMPLATE_FIELD

16) **PERSON —(Submits)— TEMPLATE_SUBMISSION**
- Cardinality: PERSON **1–N** TEMPLATE_SUBMISSION

17) **TEMPLATE —(ReceivesSubmissionFor)— TEMPLATE_SUBMISSION**
- Cardinality: TEMPLATE **1–N** TEMPLATE_SUBMISSION

18) **TEMPLATE_SUBMISSION —(ProvidesAnswer)— TEMPLATE_FIELD**
- Cardinality: **N–N**
- Relationship attribute: AnswerValue  
  (Conceptually models the form responses without storing JSON.)

19) **TEMPLATE_SUBMISSION —(Generates)— GENERATED_DOCUMENT**
- Cardinality: TEMPLATE_SUBMISSION **0–1** GENERATED_DOCUMENT  
  (A submission may or may not produce an output document.)

---

### **Payments**
20) **ORGANIZATION —(Runs)— PAYMENT_CAMPAIGN**
- Cardinality: ORGANIZATION **1–N** PAYMENT_CAMPAIGN

21) **PAYMENT_CAMPAIGN —(HasFeeLevels)— FEE_LEVEL**
- Cardinality: PAYMENT_CAMPAIGN **1–N** FEE_LEVEL

22) **PERSON —(HasAssignment)— FEE_ASSIGNMENT**
- Cardinality: PERSON **1–N** FEE_ASSIGNMENT

23) **PAYMENT_CAMPAIGN —(Issues)— FEE_ASSIGNMENT**
- Cardinality: PAYMENT_CAMPAIGN **1–N** FEE_ASSIGNMENT

24) **FEE_LEVEL —(Categorizes)— FEE_ASSIGNMENT**
- Cardinality: FEE_LEVEL **1–N** FEE_ASSIGNMENT  
  (Each assignment is for exactly one level; a level applies to many assignments.)

25) **FEE_ASSIGNMENT —(HasTransactions)— PAYMENT_TRANSACTION**
- Cardinality: FEE_ASSIGNMENT **1–N** PAYMENT_TRANSACTION (or **0–N** if no payment yet)

---

## **Notes on intentionally excluded items (per your rules)**
- Excluded: passwords, refresh tokens, OAuth IDs, created/updated timestamps, audit “created_by/updated_by/deleted_by”, and storage/secret credential fields (AWS keys, PayOS keys).
- Excluded: `ctxh_embeddings` (vector/search infrastructure) as it’s implementation-level rather than a core business concept.

If you want, I can also provide a **compact Chen-style ASCII sketch** (rectangles/diamonds/ovals) for the core modules (Org–Membership–Roles, CTXH, Templates, Payments) to make it easier to draw in a diagramming tool.