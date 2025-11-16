let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let goals = JSON.parse(localStorage.getItem("goals")) || [];
let chart;

// =======================
// 🔧 INITIALIZATION
// =======================
function initializePDFJS() {
  if (typeof window.pdfjsLib !== 'undefined') {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs";
    console.log('✅ PDF.js worker configured');
    return true;
  }
  return false;
}

// =======================
// 📊 Budget Tracker
// =======================
function updateBudgetUI() {
  const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;

  const incEl = document.getElementById("total-income");
  const expEl = document.getElementById("total-expense");
  const balEl = document.getElementById("balance");

  if (incEl && expEl && balEl) {
    incEl.textContent = `$${income.toFixed(2)}`;
    expEl.textContent = `$${expense.toFixed(2)}`;
    balEl.textContent = `$${balance.toFixed(2)}`;
  }

  localStorage.setItem("transactions", JSON.stringify(transactions));
  updateTransactionList();
  updateChart(income, expense);

  // Update rewards
  if (typeof rewardForSaving === 'function') {
    rewardForSaving(balance, income);
  }
}

function updateTransactionList() {
  const list = document.getElementById("transaction-list");
  if (!list) return;

  list.innerHTML = "";
  transactions.forEach((t, i) => {
    const li = document.createElement("li");
    li.classList.add(t.type);

    const desc = document.createElement("span");
    desc.textContent = `${t.description}: $${t.amount.toFixed(2)} (${t.type})`;

    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.classList.add("delete-btn");
    delBtn.addEventListener("click", () => deleteTransaction(i));

    li.appendChild(desc);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

function deleteTransaction(index) {
  transactions.splice(index, 1);
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("lastAIUpdate", Date.now());
  updateBudgetUI();
}

function updateChart(income, expense) {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded - skipping chart update');
    return;
  }

  const ctx = canvas.getContext("2d");
  if (chart) chart.destroy();
  
  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Income", "Expenses"],
      datasets: [{
        data: [income, expense],
        backgroundColor: ["#4CAF50", "#E74C3C"],
        borderWidth: 1
      }]
    },
    options: {
      cutout: "70%",
      plugins: { legend: { position: "bottom" } }
    }
  });
}

// =======================
// 💡 Enhanced Total Extraction
// =======================
function extractTotalFromText(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Enhanced patterns with optional decimals
  const patterns = [
    /total[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    /amount\s+due[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    /balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    /grand\s+total[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    /sum[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    /\$\s*([\d,]+\.?\d{0,2})\s*total/i,
    /payment[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    /amount[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i
  ];

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ""));
      // Sanity check
      if (value > 0 && value < 1000000) {
        return value;
      }
    }
  }
  
  // Fallback: find all dollar amounts and return largest
  const amounts = cleanText.match(/\$\s*([\d,]+\.\d{2})/g);
  if (amounts && amounts.length > 0) {
    const values = amounts
      .map(a => parseFloat(a.replace(/[$,]/g, '')))
      .filter(v => v > 0 && v < 1000000);
    if (values.length > 0) {
      return Math.max(...values);
    }
  }
  
  return null;
}

// =======================
// 📸 Receipt Scanner (OCR)
// =======================
async function analyzeReceipt(file) {
  const output = document.getElementById("ai-output");
  output.innerHTML = "📸 Scanning image with OCR...<br><small>This may take 10-30 seconds</small>";
  
  // Reward for scanning receipt
  if (typeof rewardForScanning === 'function') {
    rewardForScanning('receipt');
  }

  try {
    // Check if Tesseract is loaded
    if (typeof Tesseract === 'undefined') {
      throw new Error('Tesseract.js not loaded. Please refresh the page.');
    }
    
    const { data: { text, confidence } } = await Tesseract.recognize(file, "eng", {
      logger: m => {
        if (m.status === 'recognizing text') {
          output.innerHTML = `🔍 Processing: ${Math.round(m.progress * 100)}%`;
        }
      }
    });
    
    const total = extractTotalFromText(text);

    if (total) {
      output.innerHTML = `
        <b>✅ Detected Total:</b> $${total.toFixed(2)}<br>
        <small>Confidence: ${Math.round(confidence)}%</small>
        <details style="margin-top: 10px;">
          <summary style="cursor:pointer;font-weight:bold;">View extracted text</summary>
          <pre style="max-height: 200px; overflow-y: auto; font-size: 0.85em; margin-top:10px; padding:10px; background:#f5f5f5; border-radius:5px;">${text}</pre>
        </details>
      `;
      addTotalToBudget(total, "expense", "Receipt Total");
    } else {
      output.innerHTML = `
        ⚠️ No total found in receipt.<br>
        <small>Confidence: ${Math.round(confidence)}%</small>
        <details style="margin-top: 10px;">
          <summary style="cursor:pointer;font-weight:bold;">View extracted text</summary>
          <pre style="max-height: 200px; overflow-y: auto; font-size: 0.85em;">${text}</pre>
        </details>
      `;
    }
  } catch (err) {
    console.error("Receipt OCR Error:", err);
    output.innerHTML = `❌ Error analyzing image: ${err.message}`;
  }
}

// =======================
// 📄 PDF Scanner (PDF.js + OCR Fallback)
// =======================
async function analyzePDF(file) {
  const output = document.getElementById("output") || document.getElementById("ai-output");
  output.innerHTML = "📄 Reading PDF...";
  
  // Reward for scanning PDF
  if (typeof rewardForScanning === 'function') {
    rewardForScanning('pdf');
  }

  try {
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      throw new Error("PDF.js not loaded. Please refresh the page.");
    }

    const pdfData = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

    output.innerHTML = `📖 Extracting text from ${pdf.numPages} page(s)...`;

    let allText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(" ");
      allText += text + "\n";
    }

    if (allText.trim().length > 50) {
      const total = extractTotalFromText(allText);
      
      output.innerHTML = `
        <b>✅ PDF Text Extracted</b><br>
        ${total ? `<b>Detected Total:</b> $${total.toFixed(2)}` : '⚠️ No total found'}
        <details style="margin-top: 10px;">
          <summary style="cursor:pointer;font-weight:bold;">View extracted text (${allText.length} chars)</summary>
          <pre style="max-height: 300px; overflow-y: auto; font-size: 0.85em; margin-top:10px; padding:10px; background:#f5f5f5; border-radius:5px;">${allText.trim()}</pre>
        </details>
      `;
      
      if (total) addTotalToBudget(total, "expense", "PDF Total");
      return;
    }

    output.innerHTML = "🧠 Running OCR (image-based PDF)...<br><small>This may take 30-60 seconds</small>";
    let ocrText = "";
    const maxPages = Math.min(pdf.numPages, 5);
    
    for (let i = 1; i <= maxPages; i++) {
      output.innerHTML = `🔍 OCR Progress: Page ${i} of ${maxPages}...`;
      
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const img = canvas.toDataURL("image/png");
      const { data: { text } } = await Tesseract.recognize(img, "eng");
      ocrText += text + "\n";
    }

    const total = extractTotalFromText(ocrText);
    
    output.innerHTML = `
      <b>✅ PDF OCR Complete</b><br>
      ${total ? `<b>Detected Total:</b> $${total.toFixed(2)}` : '⚠️ No total found'}
      <details style="margin-top: 10px;">
        <summary style="cursor:pointer;font-weight:bold;">View extracted text</summary>
        <pre style="max-height: 300px; overflow-y: auto; font-size: 0.85em;">${ocrText.trim()}</pre>
      </details>
    `;
    
    if (total) addTotalToBudget(total, "expense", "PDF OCR Total");
  } catch (err) {
    console.error("PDF Analysis Error:", err);
    output.innerHTML = `❌ Error analyzing PDF: ${err.message}`;
  }
}

// =======================
// 💰 Sync to Budget
// =======================
function addTotalToBudget(amount, type, label) {
  transactions.push({ 
    description: label, 
    amount, 
    type,
    date: new Date().toISOString()
  });
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("lastAIUpdate", Date.now());
  updateBudgetUI();

  const output = document.getElementById("ai-output") || document.getElementById("output");
  if (output) {
    const msg = document.createElement("p");
    msg.style.cssText = "color:#4CAF50;font-weight:bold;margin-top:15px;padding:10px;background:#e8f5e9;border-radius:5px;";
    msg.innerHTML = `💾 Added $${amount.toFixed(2)} to your Budget Tracker!<br>
      <small><a href="BudgetTracker.html" style="color: #2196F3;">View in Budget Tracker →</a></small>`;
    output.appendChild(msg);
  }
}

// =======================
// 🧠 Smart Finance Planner + AI Goal Generator
// =======================

function updateGoalsUI() {
  const goalList = document.getElementById("goals");
  const progressContainer = document.getElementById("goal-progress-container");
  if (!goalList || !progressContainer) return;

  goalList.innerHTML = "";
  progressContainer.innerHTML = "";

  goals.forEach((goal, index) => {
    const li = document.createElement("li");
    li.textContent = `${goal.name}: $${goal.amount.toFixed(2)}`;
    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.classList.add("delete-btn");
    delBtn.addEventListener("click", () => deleteGoal(index));
    li.appendChild(delBtn);
    goalList.appendChild(li);

    const { totalIncome, totalExpense } = analyzeSpendingTrends();
    const balance = totalIncome - totalExpense;
    const progressPercent = Math.min(100, (balance / goal.amount) * 100);

    const goalDiv = document.createElement("div");
    goalDiv.innerHTML = `
      <p><strong>${goal.name}</strong> — Saved: $${Math.max(0, Math.min(goal.amount, balance)).toFixed(2)} / $${goal.amount.toFixed(2)}</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${progressPercent}%;"></div></div>
    `;
    progressContainer.appendChild(goalDiv);
  });

  localStorage.setItem("goals", JSON.stringify(goals));
}

function deleteGoal(index) {
  const goal = goals[index];
  const { totalIncome, totalExpense } = analyzeSpendingTrends();
  const balance = totalIncome - totalExpense;
  
  // Check if goal was completed before deleting
  if (balance >= goal.amount) {
    if (typeof rewardForGoalCompletion === 'function') {
      rewardForGoalCompletion(goal.name);
    }
  }
  
  goals.splice(index, 1);
  updateGoalsUI();
}

function generateAIAdvice() {
  const output = document.getElementById("ai-analysis-output");
  if (!output) return;
  
  // Reward AI usage
  if (typeof rewardForAIUsage === 'function') {
    rewardForAIUsage();
  }

  const { totalExpense, totalIncome, balance, categories } = analyzeSpendingTrends();
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  const goalTotal = goals.reduce((s, g) => s + g.amount, 0);
  const goalCount = goals.length;

  let advice = `💰 You've earned <b>$${totalIncome.toFixed(2)}</b> and spent <b>$${totalExpense.toFixed(2)}</b>, leaving <b>$${balance.toFixed(2)}</b>.<br><br>`;
  if (topCategory) advice += `📊 Biggest spending: <b>${topCategory[0]}</b> ($${topCategory[1].toFixed(2)}).<br>`;
  if (goalCount > 0) advice += `🎯 ${goalCount} active goal${goalCount > 1 ? "s" : ""} totaling <b>$${goalTotal.toFixed(2)}</b>.<br><br>`;

  if (balance < 0) advice += `⚠️ You're overspending. Reduce ${topCategory ? topCategory[0] : "non-essential"} expenses by 10–15%.`;
  else if (balance < totalIncome * 0.1) advice += `💡 Savings margin is low. Try saving at least 15% of your income.`;
  else advice += `✅ Excellent! You're managing your money well — consider investing surplus funds.`;

  output.innerHTML = `<div class="ai-box" style="background:#e3f2fd;padding:20px;border-radius:10px;border-left:4px solid #2196F3;"><h4>🧩 AI Plan Summary</h4><p>${advice}</p></div>`;

  generateAIGoals(balance, totalIncome, categories);
}

function generateAIGoals(balance, income, categories) {
  const output = document.getElementById("ai-analysis-output");
  let newGoals = [];

  if (balance > income * 0.2) newGoals.push({ name: "Emergency Fund", amount: income * 0.3 });
  if (categories.food && categories.food > income * 0.15) newGoals.push({ name: "Reduce Food Expenses", amount: categories.food * 0.8 });
  if (balance > 500) newGoals.push({ name: "Investment Savings", amount: balance * 0.5 });
  if (categories.transport && categories.transport > income * 0.1) newGoals.push({ name: "Transportation Savings Plan", amount: 200 });
  if (newGoals.length === 0) newGoals.push({ name: "General Savings", amount: income * 0.1 });

  newGoals.forEach(goal => {
    if (!goals.some(g => g.name === goal.name)) {
      goals.push(goal);
      // Reward for AI-generated goal
      if (typeof rewardForGoalCreation === 'function') {
        rewardForGoalCreation();
      }
    }
  });

  localStorage.setItem("goals", JSON.stringify(goals));
  updateGoalsUI();

  const addedGoals = newGoals.map(g => `<li>💡 ${g.name}: $${g.amount.toFixed(2)}</li>`).join("");
  output.innerHTML += `
    <div class="ai-box" style="background:#e8f5e9;border-left:4px solid #4CAF50;padding:20px;border-radius:10px;margin-top:20px;">
      <h4>✨ New AI-Generated Goals</h4>
      <ul style="list-style:none;padding-left:0;">${addedGoals}</ul>
      <p><small>These were automatically added to your goal list based on your financial trends.</small></p>
    </div>`;
}

// --- Spending Trend Analyzer ---
function analyzeSpendingTrends() {
  const expenses = transactions.filter(t => t.type === "expense");
  const income = transactions.filter(t => t.type === "income");
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const categories = {};
  for (let t of expenses) {
    const desc = t.description.toLowerCase();
    if (desc.includes("food") || desc.includes("restaurant") || desc.includes("grocery")) {
      categories.food = (categories.food || 0) + t.amount;
    } else if (desc.includes("rent") || desc.includes("house") || desc.includes("mortgage")) {
      categories.housing = (categories.housing || 0) + t.amount;
    } else if (desc.includes("subscript") || desc.includes("netflix") || desc.includes("spotify")) {
      categories.subscriptions = (categories.subscriptions || 0) + t.amount;
    } else if (desc.includes("transport") || desc.includes("uber") || desc.includes("gas")) {
      categories.transport = (categories.transport || 0) + t.amount;
    } else {
      categories.other = (categories.other || 0) + t.amount;
    }
  }

  return { totalExpense, totalIncome, balance, categories };
}

// =======================
// 🔧 Event Hooks
// =======================
document.addEventListener("DOMContentLoaded", () => {
  console.log('🚀 AI Finance Manager initialized');
  
  // Initialize PDF.js
  initializePDFJS();
  
  const form = document.getElementById("transaction-form");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const desc = document.getElementById("description").value;
      const amt = parseFloat(document.getElementById("amount").value);
      const type = document.getElementById("type").value;
      if (!desc || isNaN(amt)) return alert("Please enter valid data.");
      
      transactions.push({ 
        description: desc, 
        amount: amt, 
        type,
        date: new Date().toISOString()
      });
      updateBudgetUI();
      
      // Trigger reward
      if (typeof rewardForTransaction === 'function') {
        rewardForTransaction(amt, type);
      }
      
      form.reset();
    });
  }

  const receiptInput = document.getElementById("receiptInput");
  const analyzeBtn = document.getElementById("analyzeBtn");
  if (receiptInput && analyzeBtn) {
    analyzeBtn.addEventListener("click", async () => {
      const file = receiptInput.files[0];
      if (!file) return alert("Please upload a receipt image.");
      
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = "Processing...";
      
      try {
        await analyzeReceipt(file);
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "Detect Total";
      }
    });
  }

  const pdfInput = document.getElementById("pdfFile");
  const scanBtn = document.getElementById("scanBtn");
  if (pdfInput && scanBtn) {
    scanBtn.addEventListener("click", async () => {
      const file = pdfInput.files[0];
      if (!file) return alert("Please upload a PDF file.");
      
      scanBtn.disabled = true;
      scanBtn.textContent = "Processing...";
      
      try {
        await analyzePDF(file);
      } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = "Scan PDF";
      }
    });
  }

  // Unified Document Scanner
  const docInput = document.getElementById("docInput");
  const analyzeDocBtn = document.getElementById("analyzeDoc");
  if (docInput && analyzeDocBtn) {
    analyzeDocBtn.addEventListener("click", async () => {
      const file = docInput.files[0];
      if (!file) return alert("Please upload a receipt or PDF.");

      analyzeDocBtn.disabled = true;
      analyzeDocBtn.textContent = "Processing...";

      try {
        if (file.type === "application/pdf") {
          await analyzePDF(file);
        } else if (file.type.startsWith("image/")) {
          await analyzeReceipt(file);
        } else {
          alert("Unsupported file type. Please upload a PDF or image.");
        }
      } finally {
        analyzeDocBtn.disabled = false;
        analyzeDocBtn.textContent = "Analyze Document";
      }
    });
  }

  const goalForm = document.getElementById("goal-form");
  if (goalForm) {
    goalForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("goal-name").value.trim();
      const amount = parseFloat(document.getElementById("goal-amount").value);
      if (!name || isNaN(amount)) return alert("Please enter valid goal data.");
      
      goals.push({ name, amount });
      updateGoalsUI();
      
      // Reward for creating goal
      if (typeof rewardForGoalCreation === 'function') {
        rewardForGoalCreation();
      }
      
      goalForm.reset();
    });
  }

  const analyzeFinanceBtn = document.getElementById("analyze-finances");
  if (analyzeFinanceBtn) {
    analyzeFinanceBtn.addEventListener("click", generateAIAdvice);
  }

  updateBudgetUI();
  updateGoalsUI();
  
  console.log('✅ All event listeners attached');
});

window.addEventListener("storage", e => {
  if (e.key === "transactions" || e.key === "lastAIUpdate") {
    transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    updateBudgetUI();
  }
  if (e.key === "goals") {
    goals = JSON.parse(localStorage.getItem("goals")) || [];
    updateGoalsUI();
  }
});

console.log('✅ main.js loaded successfully');