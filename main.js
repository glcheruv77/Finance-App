/* ==========================================================
   Complete Enhanced main.js for AI Finance Manager
   Features: Budget Tracker, Scanners, Smart Planner, Rewards
   + NEW: Dark/Light Mode, Export, Alerts, Trends
========================================================== */

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let goals = JSON.parse(localStorage.getItem("goals")) || [];
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;
let chart;
let trendsChart;

// =======================
// 🎨 Theme Toggle
// =======================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const body = document.body;
  
  if (savedTheme === 'light') {
    body.classList.add('light-mode');
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const icon = themeToggle.querySelector('i');
    const text = document.getElementById('themeText');
    
    if (savedTheme === 'light') {
      if (icon) icon.className = 'fa-solid fa-sun';
      if (text) text.textContent = 'Light Mode';
    }

    themeToggle.addEventListener('click', () => {
      body.classList.toggle('light-mode');
      const isLight = body.classList.contains('light-mode');
      
      if (icon) icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      if (text) text.textContent = isLight ? 'Light Mode' : 'Dark Mode';
      
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      
      // Re-render charts with new colors
      updateBudgetUI();
    });
  }
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
    incEl.textContent = `${income.toFixed(2)}`;
    expEl.textContent = `${expense.toFixed(2)}`;
    balEl.textContent = `${balance.toFixed(2)}`;
  }

  localStorage.setItem("transactions", JSON.stringify(transactions));
  updateTransactionList();
  updateChart(income, expense);
  updateBudgetAlerts(income, expense, balance);
  updateCategoryBreakdown();
  updateTrendsChart();
  
  // 🎁 Reward for good savings habits
  if (typeof rewardForSaving === 'function' && income > 0) {
    rewardForSaving(balance, income);
  }
}

function updateTransactionList() {
  const list = document.getElementById("transaction-list");
  if (!list) return;

  list.innerHTML = "";
  
  if (transactions.length === 0) {
    list.innerHTML = '<li style="text-align:center;padding:20px;opacity:0.6;">No transactions yet. Add one above!</li>';
    return;
  }

  const sorted = [...transactions].sort((a, b) => 
    new Date(b.date || Date.now()) - new Date(a.date || Date.now())
  );

  sorted.forEach((t, i) => {
    const originalIndex = transactions.indexOf(t);
    const li = document.createElement("li");
    li.classList.add(t.type);
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.padding = '1rem';
    li.style.marginBottom = '0.5rem';
    li.style.borderRadius = '8px';
    li.style.background = t.type === 'income' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(231, 76, 60, 0.1)';

    const emoji = getCategoryEmoji(t.category);
    const date = t.date ? new Date(t.date).toLocaleDateString() : 'Today';

    const desc = document.createElement("div");
    desc.innerHTML = `
      <strong>${emoji} ${t.description}</strong><br>
      <small style="opacity:0.7;">${t.category || 'other'} • ${date}</small>
    `;

    const rightSide = document.createElement("div");
    rightSide.style.display = 'flex';
    rightSide.style.alignItems = 'center';
    rightSide.style.gap = '15px';
    
    const amount = document.createElement("span");
    amount.style.fontSize = '1.2rem';
    amount.style.fontWeight = 'bold';
    amount.style.color = t.type === 'income' ? '#4CAF50' : '#E74C3C';
    amount.textContent = `${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}`;

    const delBtn = document.createElement("button");
    delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    delBtn.classList.add("delete-btn");
    delBtn.addEventListener("click", () => deleteTransaction(originalIndex));

    rightSide.appendChild(amount);
    rightSide.appendChild(delBtn);

    li.appendChild(desc);
    li.appendChild(rightSide);
    list.appendChild(li);
  });
}

function getCategoryEmoji(category) {
  const emojis = {
    food: '🍔', transport: '🚗', housing: '🏠', entertainment: '🎮',
    healthcare: '⚕️', shopping: '🛍️', utilities: '💡', salary: '💰',
    other: '📦'
  };
  return emojis[category] || '📦';
}

function deleteTransaction(index) {
  if (confirm('Delete this transaction?')) {
    transactions.splice(index, 1);
    localStorage.setItem("transactions", JSON.stringify(transactions));
    updateBudgetUI();
  }
}

function updateChart(income, expense) {
  const canvas = document.getElementById("chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (chart) chart.destroy();
  
  const isLight = document.body.classList.contains('light-mode');
  
  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Income", "Expenses"],
      datasets: [{
        data: [income, expense],
        backgroundColor: ["#4CAF50", "#E74C3C"],
        borderWidth: 2,
        borderColor: isLight ? '#fff' : '#0a1a2f'
      }]
    },
    options: {
      cutout: "70%",
      plugins: { 
        legend: { 
          position: "bottom",
          labels: {
            color: isLight ? '#333' : '#e0e8f9',
            font: { size: 14 }
          }
        }
      }
    }
  });
}

// =======================
// 🚨 Budget Alerts
// =======================
function updateBudgetAlerts(income, expense, balance) {
  const alertsDiv = document.getElementById('budget-alerts');
  if (!alertsDiv) return;

  alertsDiv.innerHTML = '';

  if (expense > income) {
    alertsDiv.innerHTML += `
      <div class="budget-alert danger">
        <i class="fa-solid fa-times-circle" style="font-size:1.5rem;"></i>
        <div>
          <strong>⚠️ Overspending Alert!</strong><br>
          You've spent $${(expense - income).toFixed(2)} more than earned. Consider reducing expenses.
        </div>
      </div>`;
  } else if (balance < income * 0.1 && balance > 0) {
    alertsDiv.innerHTML += `
      <div class="budget-alert warning">
        <i class="fa-solid fa-exclamation-triangle" style="font-size:1.5rem;"></i>
        <div>
          <strong>💡 Low Savings Alert</strong><br>
          Balance is only $${balance.toFixed(2)} (${((balance/income)*100).toFixed(1)}%). Try to save at least 20%.
        </div>
      </div>`;
  } else if (balance > income * 0.2) {
    alertsDiv.innerHTML += `
      <div class="budget-alert success">
        <i class="fa-solid fa-check-circle" style="font-size:1.5rem;"></i>
        <div>
          <strong>🎉 Great Job!</strong><br>
          You're saving ${((balance/income)*100).toFixed(1)}% of your income! Keep it up.
        </div>
      </div>`;
  }
}

// =======================
// 📈 Trends Chart
// =======================
function updateTrendsChart() {
  const canvas = document.getElementById('trendsChart');
  if (!canvas) return;

  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  const dailyExpenses = last7Days.map((day, index) => {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - (6 - index));
    
    return transactions
      .filter(t => {
        if (!t.date || t.type !== 'expense') return false;
        const tDate = new Date(t.date);
        return tDate.toDateString() === targetDate.toDateString();
      })
      .reduce((sum, t) => sum + t.amount, 0);
  });

  const ctx = canvas.getContext('2d');
  if (trendsChart) trendsChart.destroy();

  const isLight = document.body.classList.contains('light-mode');

  trendsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days,
      datasets: [{
        label: 'Daily Spending',
        data: dailyExpenses,
        borderColor: '#E74C3C',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: isLight ? '#333' : '#e0e8f9' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: isLight ? '#666' : '#b8c4dd',
            callback: value => '$' + value
          },
          grid: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }
        },
        x: {
          ticks: { color: isLight ? '#666' : '#b8c4dd' },
          grid: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }
        }
      }
    }
  });
}

// =======================
// 🏷️ Category Breakdown
// =======================
function updateCategoryBreakdown() {
  const container = document.getElementById('category-breakdown');
  if (!container) return;

  const categoryTotals = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category || 'other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });

  container.innerHTML = '';
  
  if (Object.keys(categoryTotals).length === 0) {
    container.innerHTML = '<p style="text-align:center;opacity:0.6;grid-column:1/-1;">No expenses yet</p>';
    return;
  }

  for (const [category, amount] of Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])) {
    const emoji = getCategoryEmoji(category);
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <h4>${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
      <div class="amount">$${amount.toFixed(2)}</div>
    `;
    container.appendChild(card);
  }
}

// =======================
// 📄 Export Functions
// =======================
function exportToPDF() {
  if (typeof jsPDF === 'undefined') {
    alert('PDF library not loaded. Add jsPDF script to your HTML.');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;

  doc.setFontSize(20);
  doc.text('Budget Report', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 28, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`Total Income: $${income.toFixed(2)}`, 20, 45);
  doc.text(`Total Expenses: $${expense.toFixed(2)}`, 20, 52);
  doc.text(`Balance: $${balance.toFixed(2)}`, 20, 59);

  doc.setFontSize(14);
  doc.text('Recent Transactions:', 20, 75);

  let y = 85;
  doc.setFontSize(10);
  
  transactions.slice(-15).forEach(t => {
    if (y > 270) return;
    doc.text(`${t.description} - $${t.amount.toFixed(2)} (${t.type})`, 20, y);
    y += 7;
  });

  doc.save('budget-report.pdf');
  alert('✅ PDF exported successfully!');
}

function exportToCSV() {
  const headers = ['Date', 'Description', 'Amount', 'Type', 'Category'];
  const rows = transactions.map(t => [
    t.date || new Date().toISOString(),
    t.description,
    t.amount,
    t.type,
    t.category || 'other'
  ]);

  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  alert('✅ CSV exported successfully!');
}

function clearAllData() {
  if (confirm('⚠️ Delete ALL transactions? This cannot be undone!')) {
    if (confirm('Really sure? This is permanent!')) {
      transactions = [];
      localStorage.setItem('transactions', JSON.stringify(transactions));
      updateBudgetUI();
      alert('🗑️ All data cleared!');
    }
  }
}

// =======================
// 💡 Text Extraction
// =======================
function extractTotalFromText(text) {
  const patterns = [
    /total[:\s]*\$?\s*([\d,]+\.\d{2})/i,
    /amount due[:\s]*\$?\s*([\d,]+\.\d{2})/i,
    /balance[:\s]*\$?\s*([\d,]+\.\d{2})/i,
    /grand total[:\s]*\$?\s*([\d,]+\.\d{2})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseFloat(match[1].replace(/,/g, ""));
  }
  return null;
}

// =======================
// 📸 Receipt Scanner
// =======================
async function analyzeReceipt(file) {
  const output = document.getElementById("ai-output");
  output.textContent = "📸 Reading image with OCR...";

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
    console.error("Receipt Error:", err);
    output.textContent = "⚠️ Failed to analyze receipt.";
  }
}

// =======================
// 📄 PDF Scanner
// =======================
async function analyzePDF(file) {
  const output = document.getElementById("output") || document.getElementById("ai-output");
  output.textContent = "🔍 Reading PDF...";

  try {
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) throw new Error("PDF.js not loaded.");

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs";

    const pdfData = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

    let allText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      allText += content.items.map(item => item.str).join(" ") + "\n";
    }

    output.innerHTML = `<pre style="white-space:pre-wrap;">${allText.trim()}</pre>`;
    const total = extractTotalFromText(allText);
    if (total) addTotalToBudget(total, "expense", "PDF Total");
  } catch (err) {
    console.error("PDF Error:", err);
    output.textContent = "❌ Error: " + err.message;
  }
}

function addTotalToBudget(amount, type, label) {
  transactions.push({ description: label, amount, type, date: new Date().toISOString() });
  localStorage.setItem("transactions", JSON.stringify(transactions));
  updateBudgetUI();

  // 🎁 Reward for scanning
  if (typeof addRewardPoints === 'function') {
    if (label.includes("Receipt")) {
      addRewardPoints(5, "Receipt scanned");
      if (typeof awardBadge === 'function') awardBadge("Scanner Pro");
    } else if (label.includes("PDF")) {
      addRewardPoints(5, "PDF scanned");
      if (typeof awardBadge === 'function') awardBadge("PDF Master");
    }
  }

  const output = document.getElementById("ai-output") || document.getElementById("output");
  if (output) {
    const msg = document.createElement("p");
    msg.style.color = "green";
    msg.style.marginTop = "10px";
    msg.textContent = `💾 Added ${amount.toFixed(2)} to Budget!`;
    output.appendChild(msg);
  }
}

// =======================
// 🧠 Smart Planner
// =======================
function updateGoalsUI() {
  const goalList = document.getElementById("goals");
  const progressContainer = document.getElementById("goal-progress-container");
  if (!goalList || !progressContainer) return;

  goalList.innerHTML = "";
  progressContainer.innerHTML = "";

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  goals.forEach((goal, index) => {
    const li = document.createElement("li");
    li.textContent = `${goal.name}: $${goal.amount.toFixed(2)}`;
    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.classList.add("delete-btn");
    delBtn.addEventListener("click", () => {
      goals.splice(index, 1);
      localStorage.setItem("goals", JSON.stringify(goals));
      updateGoalsUI();
    });
    li.appendChild(delBtn);
    goalList.appendChild(li);

    const progress = Math.min(100, (balance / goal.amount) * 100);
    const goalDiv = document.createElement("div");
    goalDiv.innerHTML = `
      <p><strong>${goal.name}</strong> — Saved: $${Math.max(0, Math.min(goal.amount, balance)).toFixed(2)} / $${goal.amount.toFixed(2)}</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%;"></div></div>
    `;
    progressContainer.appendChild(goalDiv);
  });
}

// =======================
// 🔧 Event Listeners
// =======================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  // Add transaction
  const addBtn = document.getElementById("addTransactionBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const desc = document.getElementById("description").value.trim();
      const amt = parseFloat(document.getElementById("amount").value);
      const type = document.getElementById("type").value;
      const category = document.getElementById("category")?.value || 'other';

      if (!desc || isNaN(amt) || amt <= 0) {
        return alert("Please enter valid details.");
      }

      transactions.push({
        description: desc,
        amount: amt,
        type,
        category,
        date: new Date().toISOString()
      });

      // 🎁 Reward for tracking
      if (typeof rewardForTransaction === 'function') {
        rewardForTransaction(amt, type);
      }

      updateBudgetUI();
      document.getElementById("description").value = '';
      document.getElementById("amount").value = '';
    });
  }

  // Legacy form support
  const form = document.getElementById("transaction-form");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const desc = document.getElementById("description").value;
      const amt = parseFloat(document.getElementById("amount").value);
      const type = document.getElementById("type").value;
      if (!desc || isNaN(amt)) return alert("Invalid data.");
      transactions.push({ description: desc, amount: amt, type, date: new Date().toISOString() });
      updateBudgetUI();
      form.reset();
    });
  }

  // Export buttons
  document.getElementById('exportPDF')?.addEventListener('click', exportToPDF);
  document.getElementById('exportCSV')?.addEventListener('click', exportToCSV);
  document.getElementById('clearAll')?.addEventListener('click', clearAllData);

  // Scanners
  document.getElementById("analyzeBtn")?.addEventListener("click", () => {
    const file = document.getElementById("receiptInput").files[0];
    if (file) analyzeReceipt(file);
    else alert("Upload a receipt image.");
  });

  document.getElementById("scanBtn")?.addEventListener("click", () => {
    const file = document.getElementById("pdfFile").files[0];
    if (file) analyzePDF(file);
    else alert("Upload a PDF file.");
  });

  // Goals
  document.getElementById("goal-form")?.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("goal-name").value.trim();
    const amount = parseFloat(document.getElementById("goal-amount").value);
    if (!name || isNaN(amount)) return alert("Invalid goal data.");
    goals.push({ name, amount });
    localStorage.setItem("goals", JSON.stringify(goals));
    
    // 🎁 Reward for goal creation
    if (typeof rewardForGoalCreation === 'function') {
      rewardForGoalCreation();
    }
    
    updateGoalsUI();
    e.target.reset();
  });

  document.getElementById("analyze-finances")?.addEventListener("click", () => {
    // 🎁 Reward for AI usage
    if (typeof rewardForAIUsage === 'function') {
      rewardForAIUsage();
    }
    alert("AI Analysis coming soon!");
  });

  updateBudgetUI();
  updateGoalsUI();
});

window.addEventListener("storage", e => {
  if (e.key === "transactions") {
    transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    updateBudgetUI();
  }
});

const BACKEND_URL = "http://localhost:3000";

async function initPlaidLink() {
  // Call your backend to get a link_token
  const res = await fetch(`${BACKEND_URL}/api/create_link_token`);
  const data = await res.json();

  const handler = Plaid.create({
    token: data.link_token,
    onSuccess: async function(public_token) {
      const exchangeRes = await fetch("/api/exchange_public_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token })
      });
      const result = await exchangeRes.json();
      alert("✅ Bank connected successfully!");
      loadLinkedAccounts();
    },
    onExit: function(err, metadata) {
      if (err) console.error("Plaid Link exited:", err);
    }
  });

  handler.open();
}

document.getElementById("link-bank-btn").addEventListener("click", initPlaidLink);


async function connectBank() {
  const res = await fetch(`${BACKEND_URL}/api/plaid/create_link_token`, {
    method: "POST",
  });
  const data = await res.json();

  const handler = Plaid.create({
    token: data.link_token,
    onSuccess: async function (public_token) {
      const exchange = await fetch(`${BACKEND_URL}/api/plaid/exchange_public_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token }),
      });
      const result = await exchange.json();
      localStorage.setItem("plaid_access_token", result.access_token);
      alert("✅ Bank connected successfully!");
    },
    onExit: (err, metadata) => console.log("Exit:", err, metadata),
  });

  handler.open();
}
