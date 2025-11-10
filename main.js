/* ==========================================================
   main.js — Unified Logic for AI Finance Manager
   Version: 5.4.149 (PDF.js Compatible)
   Features:
   ✅ Budget Tracker + Chart.js
   ✅ Receipt Scanner (Tesseract.js)
   ✅ PDF Scanner (PDF.js + OCR Fallback)
   ✅ Auto Total Extraction → Budget Sync
   ✅ Smart Planner with AI Goal Generator
========================================================== */

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let chart;

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
  const transaction = transactions[index];
  transactions.splice(index, 1);
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("lastAIUpdate", Date.now());
  updateBudgetUI();
}

function updateChart(income, expense) {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

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
// 💡 Total Extraction Utility
// =======================
function extractTotalFromText(text) {
  const patterns = [
    /total[:\s]*\$?\s*([\d,]+\.\d{2})/i,
    /amount due[:\s]*\$?\s*([\d,]+\.\d{2})/i,
    /balance[:\s]*\$?\s*([\d,]+\.\d{2})/i,
    /grand total[:\s]*\$?\s*([\d,]+\.\d{2})/i,
    /sum[:\s]*\$?\s*([\d,]+\.\d{2})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseFloat(match[1].replace(/,/g, ""));
  }
  return null;
}

// =======================
// 📸 Receipt Scanner (OCR)
// =======================
async function analyzeReceipt(file) {
  const output = document.getElementById("ai-output");
  output.textContent = "📸 Reading image using OCR...";
  
  // Reward for scanning receipt
  if (typeof rewardForScanning === 'function') {
    rewardForScanning('receipt');
  }

  try {
    const { data: { text } } = await Tesseract.recognize(file, "eng");
    const total = extractTotalFromText(text);

    if (total) {
      output.innerHTML = `<b>✅ Detected Total:</b> $${total.toFixed(2)}`;
      addTotalToBudget(total, "expense", "Receipt Total");
    } else {
      output.innerHTML = "❌ No total found in receipt.";
    }
  } catch (err) {
    console.error("Receipt OCR Error:", err);
    output.textContent = "⚠️ Failed to analyze receipt.";
  }
}

// =======================
// 📄 PDF Scanner (PDF.js + OCR Fallback)
// =======================
async function analyzePDF(file) {
  const output = document.getElementById("output") || document.getElementById("ai-output");
  output.textContent = "🔍 Reading PDF...";
  
  // Reward for scanning PDF
  if (typeof rewardForScanning === 'function') {
    rewardForScanning('pdf');
  }

  try {
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) throw new Error("PDF.js not loaded properly.");

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs";

    const pdfData = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

    let allText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(" ");
      allText += text + "\n";
    }

    if (allText.trim().length > 30) {
      output.innerHTML = `<pre style="white-space: pre-wrap;">${allText.trim()}</pre>`;
      const total = extractTotalFromText(allText);
      if (total) addTotalToBudget(total, "expense", "PDF Total");
      return;
    }

    output.textContent = "🧠 Running OCR (image-based PDF detected)...";
    let ocrText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
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

    output.innerHTML = `<pre style="white-space: pre-wrap;">${ocrText.trim()}</pre>`;
    const total = extractTotalFromText(ocrText);
    if (total) addTotalToBudget(total, "expense", "PDF OCR Total");
  } catch (err) {
    console.error("PDF Analysis Error:", err);
    output.textContent = "❌ Error analyzing PDF: " + err.message;
  }
}

// =======================
// 💰 Sync to Budget
// =======================
function addTotalToBudget(amount, type, label) {
  transactions.push({ description: label, amount, type });
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("lastAIUpdate", Date.now());
  updateBudgetUI();

  const output = document.getElementById("ai-output") || document.getElementById("output");
  if (output) {
    const msg = document.createElement("p");
    msg.style.color = "green";
    msg.textContent = `💾 Added $${amount.toFixed(2)} to your Budget Tracker!`;
    output.appendChild(msg);
  }
}

// =======================
// 🧠 Smart Finance Planner + AI Goal Generator
// =======================
let goals = JSON.parse(localStorage.getItem("goals")) || [];

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

  let advice = `💰 You’ve earned <b>$${totalIncome.toFixed(2)}</b> and spent <b>$${totalExpense.toFixed(2)}</b>, leaving <b>$${balance.toFixed(2)}</b>.<br><br>`;
  if (topCategory) advice += `📊 Biggest spending: <b>${topCategory[0]}</b> ($${topCategory[1].toFixed(2)}).<br>`;
  if (goalCount > 0) advice += `🎯 ${goalCount} active goal${goalCount > 1 ? "s" : ""} totaling <b>$${goalTotal.toFixed(2)}</b>.<br><br>`;

  if (balance < 0) advice += `⚠️ You're overspending. Reduce ${topCategory ? topCategory[0] : "non-essential"} expenses by 10–15%.`;
  else if (balance < totalIncome * 0.1) advice += `💡 Savings margin is low. Try saving at least 15% of your income.`;
  else advice += `✅ Excellent! You're managing your money well — consider investing surplus funds.`;

  output.innerHTML = `<div class="ai-box"><h4>🧩 AI Plan Summary</h4><p>${advice}</p></div>`;

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
    if (!goals.some(g => g.name === goal.name)) goals.push(goal);
  });

  localStorage.setItem("goals", JSON.stringify(goals));
  updateGoalsUI();

  const addedGoals = newGoals.map(g => `<li>💡 ${g.name}: $${g.amount.toFixed(2)}</li>`).join("");
  output.innerHTML += `
    <div class="ai-box" style="background:#e8f5e9;border-left:4px solid #4CAF50;">
      <h4>✨ New AI-Generated Goals</h4>
      <ul>${addedGoals}</ul>
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
    if (desc.includes("food") || desc.includes("restaurant")) categories.food = (categories.food || 0) + t.amount;
    else if (desc.includes("rent") || desc.includes("house")) categories.housing = (categories.housing || 0) + t.amount;
    else if (desc.includes("subscript") || desc.includes("netflix") || desc.includes("spotify")) categories.subscriptions = (categories.subscriptions || 0) + t.amount;
    else if (desc.includes("transport") || desc.includes("uber") || desc.includes("gas")) categories.transport = (categories.transport || 0) + t.amount;
    else categories.other = (categories.other || 0) + t.amount;
  }

  return { totalExpense, totalIncome, balance, categories };
}

// =======================
// 🔧 Event Hooks
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("transaction-form");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const desc = document.getElementById("description").value;
      const amt = parseFloat(document.getElementById("amount").value);
      const type = document.getElementById("type").value;
      if (!desc || isNaN(amt)) return alert("Please enter valid data.");
      transactions.push({ description: desc, amount: amt, type });
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
    analyzeBtn.addEventListener("click", () => {
      const file = receiptInput.files[0];
      if (!file) return alert("Please upload a receipt image.");
      analyzeReceipt(file);
    });
  }

  const pdfInput = document.getElementById("pdfFile");
  const scanBtn = document.getElementById("scanBtn");
  if (pdfInput && scanBtn) {
    scanBtn.addEventListener("click", () => {
      const file = pdfInput.files[0];
      if (!file) return alert("Please upload a PDF file.");
      analyzePDF(file);
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
      goalForm.reset();
    });
  }

  const analyzeFinanceBtn = document.getElementById("analyze-finances");
  if (analyzeFinanceBtn) analyzeFinanceBtn.addEventListener("click", generateAIAdvice);

  updateBudgetUI();
  updateGoalsUI();
});

window.addEventListener("storage", e => {
  if (e.key === "transactions" || e.key === "lastAIUpdate") {
    transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    updateBudgetUI();
  }
});
