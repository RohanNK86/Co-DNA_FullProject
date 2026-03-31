# 🧬 CO-DNA 
**Kill technical debt — from inside your editor.**

[![Hackathon](https://img.shields.io/badge/HACK'A'WAR-2026-blue)](https://msrit.edu)
[![AWS](https://img.shields.io/badge/Powered_by-AWS_Bedrock-FF9900?logo=amazonaws)](https://aws.amazon.com/bedrock/)
[![Claude](https://img.shields.io/badge/AI-Claude_3.7_Sonnet-D97757?logo=anthropic)](https://anthropic.com)

> **Built in 24 hours for HACK'A'WAR 2026 (Problem Statement 1.6: Technical Debt Quantifier)**

---

## 🚨 The $5 Million Problem Nobody Talks About
Technical debt accumulates silently. Development teams can't quantify it, prioritize it, or make a business case to leadership for fixing it. 
* **33%** of developer time is wasted navigating around technical debt.
* **$5,000,000** is the annual cost of lost productivity for a team of 50 engineers.
* **0** visibility for leadership until a critical failure occurs.

## 💡 Our Solution: CO-DNA
CO-DNA is a VS Code extension that translates complex code smells into hard dollar amounts. It empowers developers to scan, explain, and modernize legacy code without ever switching contexts. 

### 🚀 Core Modes
1. **Debt Scanner:** Analyzes code complexity, duplication, and anti-patterns via AST. Assigns a business dollar cost to every finding using AWS Bedrock (Claude 3.7 Sonnet).
2. **Code Explainer:** Built for new joiners. Highlights any module and explains it in plain English, cutting onboarding time by 10x without pinging senior devs.
3. **Code Modernizer:** One-click conversion of legacy patterns to modern equivalents (e.g., Callbacks → Async/Await).

---

## 🏗️ Architecture & Tech Stack

* **Frontend / Editor Interface:** VS Code Extension API, TypeScript, React Webview, Tailwind CSS.
* **Backend Engine:** Python 3.11, FastAPI, Python AST Module.
* **AI / LLM:** Amazon Bedrock (Claude 3.7 Sonnet) via `boto3`.
* **Storage (Future Scope):** Amazon DynamoDB for historical trend tracking.

---

## 💻 Local Setup & Installation (For Judges)

To run CO-DNA locally, you need to start both the Python backend and the VS Code extension.

### 1. Start the AI Backend
Navigate to the `backend` folder and start the FastAPI server:
```bash
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\activate | Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
