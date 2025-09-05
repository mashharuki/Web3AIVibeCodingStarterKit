---
marp: true
theme: uncover
style: |
  :root {
    --color-primary: #0055A4; /* Blue */
    --color-secondary: #F58220; /* Orange */
    --color-text: #333;
    --color-background: #fff;
  }

  section {
    background-color: var(--color-background);
    color: var(--color-text);
    font-family: 'Helvetica Neue', 'Arial', sans-serif;
    padding: 60px; /* Reduced padding */
  }

  h1, h2, h3 {
    color: var(--color-primary);
    font-weight: bold;
  }

  h1 {
    font-size: 2.6em; /* Reduced font size */
    text-align: center;
  }
  
  h2 {
    font-size: 2em; /* Reduced font size */
    border-bottom: 4px solid var(--color-secondary); /* Thinner border */
    padding-bottom: 8px;
  }

  p, li {
    font-size: 1.1em; /* Reduced font size */
    line-height: 1.5; /* Tighter line height */
  }

  a {
    color: var(--color-secondary);
  }

  strong {
    color: var(--color-secondary);
  }

  /* Title Slide */
  section.lead {
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }
  
  section.lead h1 {
    font-size: 2.8em; /* Reduced font size */
    color: #fff;
  }

  section.lead p {
    font-size: 1.2em; /* Reduced font size */
    color: #eee;
  }

  /* Self-Introduction Slide Layout */
  .split {
    display: grid;
    grid-template-columns: 0.8fr 2fr; /* Adjusted grid ratio */
    gap: 40px; /* Reduced gap */
    align-items: center;
  }

  .split img {
    width: 100%;
    height: auto;
    border-radius: 50%;
    border: 5px solid var(--color-secondary);
  }

  .social-list {
    padding-left: 30px;
    list-style-type: none;
  }

  .split-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

---

<!-- _class: lead -->
<!-- _backgroundColor: #000 -->

## A Hands-on Web3 AI Vibe Coding Workshop

---

## **Today's Agenda**

1.  **Opening & Self-Introduction (5 min)**
2.  **Today's Goals and Flow (5 min)**
3.  **AI Vibe Coding Live Demo (10 min)**
4.  **Tips for AI Vibe Coding (10 min)**
5.  **Hands-on Session (90-125 min)**
6.  **Wrap-up & Review (5 min)**
7.  **Showcase & Networking (20-55 min)**

---

## **First: Instructor Introduction**

<div class="split">
  <img src="./../../img/icon.JPG" alt="Haruki's Profile Picture">
  <div class="split-content">
    <h3>Haruki</h3>
    <p>
      <strong>UNCHAIN Admin</strong>
    </p>
    <ul>
      <li>Web3 Engineer</li>
      <li>ETH Tokyo'24 finalist</li>
    </ul>
    <ul class="social-list">
      <li>X: @haruki_web3</li>
      <li>GitHub: mashharuki</li>
    </ul>
  </div>
</div>

---

## **Goals of This Workshop**

<p>By the end of this workshop, you will...</p>
<ul>
  <li><strong>Gain the ability to develop a Web3 app prototype</strong></li>
  <br>
  <li><strong>Acquire the "tips"</strong> to maximize the power of AI</li>
</ul>

---

## **AI Vibe Coding Live Demo**

### **"The Moment a dApp is Born with AI"**

<br>

Now, I will show you how to build a DEX prototype from scratch, focusing on **interaction with AI**.

---

**Theme: Let's build an AMM DEX!**

<br/>

1. Create requirements and design documents
2. Create a task list
3. Start implementation

---

## **Tips for AI Vibe Coding**

Just knowing this will dramatically improve your AI-driven development experience!

**I will introduce four particularly important points.**

---

### **Tip #1: Use Multiple Models for Different Tasks**

<p><strong>What a model "can do" and is "good at" varies.</strong></p>
<ul>
  <li><strong>Models good at coding</strong><br>（e.g., Claude）</li>
  <br>
  <li><strong>Models capable of multimodal processing</strong><br>（e.g., Gemini）</li>
</ul>

---

### **Tip #2: Enhance AI Capabilities with MCP**

<p>Using<strong>MCP</strong>turns the AI into a powerful

<strong>"dedicated assistant"</strong> for your project!</p>

---

### **Tip #2: Enhance AI Capabilities with MCP**

<ul>
  <li>You can directly teach the AI your project's file structure and coding conventions.</li>
  <br>
  <li>This allows the AI to deeply understand the project's context and generate more accurate code.</li>
</ul>

---

### **Tip #3: Proceed in Stages**

<p>No need to aim for perfection all at once.<br><strong>"Build small, then move on"</strong> is the shortcut to success.</p>

---

### **Tip #3: Proceed in Stages**

<ul>
  <li>Create requirements, design, and task list documents</li>
  <li>Set up the overall project</li>
  <li>Implement the smart contract</li>
  <li>Implement the front-end</li>
</ul>

---

### **Tip #4: Custom Instructions**

<p><strong>"How you give instructions"</strong> to the AI is also important.

<br>Let's prepare a custom instruction file

in advance.</p>

<br/>

<p>Clear instructions maximize the AI's power!</p>

---

<!-- _backgroundColor: var(--color-primary) -->
<!-- _color: #fff -->

# **Hands-on Time!**
## **(90-125 min)**

---

<br>

1.  **Part 1 (Basic): DEX (Decentralized Exchange) Development**
    - First, experience the basic flow of AI Vibe Coding with the prepared theme!

---

2.  **Part 2 (Advanced): Original dApp Development** (If time permits)
    - Create a one-of-a-kind dApp with your own unique idea!

---

## **Hands-on Steps**

<ul>
  <li><strong>Create requirements, design, and task list documents</strong></li>
  <li><strong>Project Setup</strong></li>
  <li><strong>Smart Contract Development</strong></li>
  <li><strong>Front-end Development</strong></li>
</ul>

---

## **Sample GitHub**

[GitHub - Web3AIVibeCodingStarterKit](https://github.com/mashharuki/Web3AIVibeCodingStarterKit/tree/amm_dex)

---

## **Sample Documents**

Please refer to the following documents!

[Prompts](https://github.com/mashharuki/Web3AIVibeCodingStarterKit/blob/amm_dex/docs/prompt/amm_dex.md)

[Requirements Document](https://github.com/mashharuki/Web3AIVibeCodingStarterKit/blob/amm_dex/docs/design/amm_dex/amm_dex_requirements.md)

[Task List](https://github.com/mashharuki/Web3AIVibeCodingStarterKit/blob/amm_dex/docs/design/amm_dex/task.md)

---

## **Sample Configuration Files**

[Claude Code Configuration File](https://github.com/mashharuki/Web3AIVibeCodingStarterKit/tree/main/.claude)

[Gemini CLI Configuration File](https://github.com/mashharuki/Web3AIVibeCodingStarterKit/tree/main/.gemini)

[GitHub Copilot Configuration File](https://github.com/mashharuki/Web3AIVibeCodingStarterKit/tree/main/.github)

[Kiro Configuration File](https://github.com/mashharuki/Web3AIVibeCodingStarterKit/tree/main/.kiro)

---

<!-- _backgroundColor: var(--color-secondary) -->
<!-- _color: #fff -->

# **Q&A / Showcase**
---

## **Today's Summary**

<p>Today, we explored the world of AI Vibe Coding and

experienced its amazing potential.</p>

---

## **Today's Summary**

<p>The four key points for success</p>
<ul>
  <li>✅ <strong>Use Multiple Models for Different Tasks</strong></li>
  <li>✅ <strong>Enhance AI Capabilities with MCP</strong></li>
  <li>✅ <strong>Proceed in Stages</strong></li>
  <li>✅ <strong>Set up Custom Instructions</strong></li>
</ul>

---

<!-- _class: lead -->
<!-- _backgroundColor: #000 -->

# **Thank You!**

---

## Supplementary Materials

---

## **Overall AI VibeCoding Environment**

---

![](./../../drawio/overview.drawio.png)

---

## **Recommended Tools Introduction**

---

### IDE

---

- **VS Code (with GitHub Copilot)**

- **Kiro**

---

### Coding Agent

---

- **GitHub Copilot Agent Mode**

- **Gemini CLI**

- **Kiro's built-in Coding Agent**

- **Claude Code**

---

### MCP

---

- **context7**

- **serena MCP**

- **GitHub MCP**

- **sequential-thinking**
