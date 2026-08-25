# DHRUVA: Autonomous Quality Engineering Command Platform & Playwright MAP Framework

DHRUVA (The North Star: steadfast, constant, and unshakeable truth) is an enterprise-grade autonomous test automation operating system built on Playwright TypeScript.

---

## 1. Core Architectural Pillars
* **Market-Action-Process (MAP) Execution**: Semantic role locators (`getByRole`, `getByLabel`), zero brittle XPaths, and BDD Given-When-Then test journeys.
* **Autonomous Multi-Agent Team**:
  * **DHRUVA**: Chief Quality Commander & Voice/Text HUD Orchestrator.
  * **KAVI (Coder-Agent)**: Generates TypeScript interfaces, Page Objects with data destructuring, and test specs.
  * **RAKSHA (Sentinel-Agent)**: Guardrail gatekeeper enforcing zero-sleeps (`waitForTimeout`) and typography rules (no em-dashes).
  * **SANJEEV (Healer-Agent)**: Self-healing diagnostics repairing locators live (capped at 3 retries).
  * **LEKHA (Auditor-Agent)**: Technical scribe managing `documents/bugs.md` and QA Lead approvals.
* **4-Layer Artifact Provenance Bundle**: Cryptographic SHA-256 Run Hash, Playwright Trace `.zip`, WebM Video, and Network HAR Logs.
* **Tamper-Evident Chained Event Ledger**: Audit log with `previousEventHash` forming an unbroken cryptographic chain.
* **Universal Component Action Library**: Reusable helpers covering all 22 standard HTML components.
* **True Code Ownership**: 100% pure TypeScript committed to Git; zero proprietary vendor lock-in.

---

## 2. Project Directory Structure
```
dhruva-quality-os/
├── .github/workflows/         # CI/CD pipelines (GitHub Actions)
├── config/                    # Environment profiles (.env.localhost, .env.qa, .env.prod)
├── documents/                 # QA Documentation (bugs.md, recommendations.md, doubts.md)
├── logs/                      # Structured execution logs and event ledger
├── src/
│   ├── cli/                   # DHRUVA custom CLI wrapper
│   ├── components/            # Reusable HTML component action helpers
│   ├── config/                # Modular feature-flag master configuration
│   ├── engine/                # MAP engine, Artifact manager, Event ledger
│   ├── fixtures/              # Test fixtures and static/dynamic test data
│   ├── pages/                 # Page Object Models implementing interface contracts
│   ├── registry/              # Multi-project isolation registry engine
│   └── utils/                 # Winston logger, safe environment loader, S3 helper
├── tests/                     # Playwright test specs (@smoke, @crud, @chained)
├── package.json               # Scripts and dependencies
├── playwright.config.ts       # Central runner configuration
└── tsconfig.json              # TypeScript compiler settings
```

---

## 3. Quick Start & Execution Commands

### Prerequisites
* Node.js 20 LTS or later
* Git

### Installation
```bash
# Clone the repository
git clone git@github.com:anjandevara/dhruva-quality-os.git
cd dhruva-quality-os

# Install dependencies
npm install

# Install Playwright browser binaries
npx playwright install --with-deps
```

### Execution Commands
```bash
# Run all test suites
npm test

# Run Smoke suite
npm run test:smoke

# Run Full Regression suite
npm run test:regression

# Run Chained Sequential suite (Strictly 1 worker)
npm run test:chained

# Run Independent Parallel suite (2 to 3 workers)
npm run test:independent

# Run against QA environment
npm run test:qa

# Open Playwright HTML report
npm run report:playwright

# Generate and view Allure report
npm run report:allure:generate
npm run report:allure:open

# Check DHRUVA multi-project registry status
npm run dhruva:status
```

---

## 4. Master Documentation Archive in Google Drive
Comprehensive architectural specifications, database schemas, and research blueprints are archived in Google Drive:
* [Playwright MAP Automation Framework (Google Drive Folder)](https://drive.google.com/drive/folders/1GPE0Z4PehWuAetYv29OGKmVHKiyISab3)
