/* ==========================================================
   reward.js — Clean Standalone Reward System
   No duplicates, works independently
========================================================== */

// Initialize or load current user
let rewardUser = JSON.parse(localStorage.getItem("rewardUser")) || {
  username: "User",
  points: 0,
  badges: [],
  level: "Bronze",
  joinDate: new Date().toISOString()
};

// =======================
// 🏆 Core Reward Functions
// =======================

function addRewardPoints(points, reason) {
  rewardUser.points += points;
  rewardUser.level = calculateLevel(rewardUser.points);
  localStorage.setItem("rewardUser", JSON.stringify(rewardUser));
  
  // Show notification
  showRewardNotification(`+${points} points! ${reason}`);
  
  // Update UI if on rewards page
  updateRewardsUI();
  
  console.log(`✅ Reward: +${points} points for ${reason}`);
}

function awardBadge(badgeName) {
  if (!rewardUser.badges.includes(badgeName)) {
    rewardUser.badges.push(badgeName);
    localStorage.setItem("rewardUser", JSON.stringify(rewardUser));
    
    showRewardNotification(`🏆 New Badge: ${badgeName}!`);
    updateRewardsUI();
    
    console.log(`🏆 Badge awarded: ${badgeName}`);
  }
}

function calculateLevel(points) {
  if (points >= 1000) return "Platinum";
  if (points >= 500) return "Gold";
  if (points >= 100) return "Silver";
  return "Bronze";
}

function calculateCashBack(points) {
  return (points * 0.05).toFixed(2);
}

function getLevelColor(level) {
  const colors = {
    Bronze: "#cd7f32",
    Silver: "#c0c0c0",
    Gold: "#ffd700",
    Platinum: "#e5e4e2"
  };
  return colors[level] || "#cd7f32";
}

// =======================
// 🎯 Reward Triggers
// =======================

function rewardForTransaction(amount, type) {

  
  if (type === "expense") {
    // Reward for tracking expenses
    addRewardPoints(2, "Expense tracked");
    
    // Check for first transaction
    const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    if (transactions.length === 1) {
      awardBadge("First Steps");
      addRewardPoints(10, "First transaction");
    }
  } else if (type === "income") {
    addRewardPoints(5, "Income recorded");
    
    const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    const incomeCount = transactions.filter(t => t.type === "income").length;
    if (incomeCount === 1) {
      awardBadge("Money Maker");
      addRewardPoints(10, "First income recorded");
    }
  }
}

function rewardForSaving(balance, income) {
  if (balance > 0 && income > 0) {
    const savingsPercent = (balance / income) * 100;
    
    if (savingsPercent >= 20) {
      addRewardPoints(10, "Saving 20%+");
      awardBadge("Smart Saver");
    } else if (savingsPercent >= 10) {
      addRewardPoints(5, "Saving 10%+");
    }
  }
}

function rewardForGoalCompletion(goalName) {
  addRewardPoints(50, `Goal completed: ${goalName}`);
  awardBadge("Goal Crusher");
}

function rewardForGoalCreation() {
  addRewardPoints(10, "Goal created");
  
  const goals = JSON.parse(localStorage.getItem("goals")) || [];
  if (goals.length === 1) {
    awardBadge("Goal Setter");
  }
  // Removed stray closing brace
  console.log("🏆 Reward system loaded!");
}


function rewardForScanning(type) {
  // Old version: Give points for any upload (receipt or pdf)
  addRewardPoints(5, "File uploaded");
  if (type === "receipt") {
    awardBadge("Scanner Pro");
  } else if (type === "pdf") {
    awardBadge("PDF Master");
  }
  checkScanningStreak();
}

function rewardForAIUsage() {
  addRewardPoints(20, "AI planner used");
  awardBadge("AI Explorer");
}

function rewardForDailyLogin() {
  const lastLogin = localStorage.getItem("lastRewardLogin");
  const today = new Date().toDateString();
  
  if (lastLogin !== today) {
    addRewardPoints(5, "Daily login");
    localStorage.setItem("lastRewardLogin", today);
    checkLoginStreak();
  }
}

// =======================
// 📊 Streak Tracking
// =======================

function checkLoginStreak() {
  const streak = parseInt(localStorage.getItem("loginStreak")) || 0;
  const newStreak = streak + 1;
  
  localStorage.setItem("loginStreak", newStreak);
  
  if (newStreak === 7) {
    awardBadge("Week Warrior");
    addRewardPoints(50, "7-day streak");
  } else if (newStreak === 30) {
    awardBadge("Month Master");
    addRewardPoints(200, "30-day streak");
  }
}

function checkScanningStreak() {
  const scans = parseInt(localStorage.getItem("totalScans")) || 0;
  const newScans = scans + 1;
  
  localStorage.setItem("totalScans", newScans);
  
  if (newScans === 10) {
    awardBadge("Scan Expert");
    addRewardPoints(25, "10 scans completed");
  } else if (newScans === 50) {
    awardBadge("Scan Legend");
    addRewardPoints(100, "50 scans completed");
  }
}

// =======================
// 🎨 UI Functions
// =======================

function updateRewardsUI() {
  const usernameEl = document.getElementById('reward-username');
  const pointsEl = document.getElementById('reward-points');
  const levelEl = document.getElementById('reward-level');
  const badgesEl = document.getElementById('reward-badges');
  const progressBar = document.getElementById('reward-progress-bar');
  const nextLevelEl = document.getElementById('next-level-points');
  const cashbackEl = document.getElementById('reward-cashback');

  if (usernameEl) usernameEl.textContent = rewardUser.username;
  if (pointsEl) pointsEl.textContent = rewardUser.points;
  if (levelEl) {
    levelEl.textContent = rewardUser.level;
    levelEl.style.color = getLevelColor(rewardUser.level);
    levelEl.style.fontWeight = "bold";
  }
  if (cashbackEl) cashbackEl.textContent = calculateCashBack(rewardUser.points);
  if (badgesEl) {
    badgesEl.innerHTML = "";
    if (rewardUser.badges.length === 0) {
      badgesEl.innerHTML = '<li style="opacity:0.5;">No badges yet. Keep going!</li>';
    } else {
      rewardUser.badges.forEach(badge => {
        const li = document.createElement("li");
        li.textContent = `🏆 ${badge}`;
        badgesEl.appendChild(li);
      });
    }
  }
  if (progressBar && nextLevelEl) {
    let nextPoints = 100;
    if (rewardUser.level === "Bronze") nextPoints = 100;
    else if (rewardUser.level === "Silver") nextPoints = 500;
    else if (rewardUser.level === "Gold") nextPoints = 1000;
    else nextPoints = 1000;
    let prevPoints = 0;
    if (rewardUser.level === "Silver") prevPoints = 100;
    else if (rewardUser.level === "Gold") prevPoints = 500;
    else if (rewardUser.level === "Platinum") prevPoints = 1000;
    const progress = Math.min(100, ((rewardUser.points - prevPoints) / (nextPoints - prevPoints)) * 100);
    progressBar.style.width = `${progress}%`;
    const remaining = Math.max(0, nextPoints - rewardUser.points);
    nextLevelEl.textContent = remaining > 0 
      ? `${remaining} points to next level` 
      : "Max level reached!";
  }
}


// Level thresholds for reference (used in progress bar if needed)
const levels = {
  Bronze: 0,
  Silver: 100,
  Gold: 500,
  Platinum: 1000
};

function showRewardNotification(message) {
  // Create notification element
  const notif = document.createElement("div");
  notif.className = "reward-notification";
  notif.textContent = message;
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideInRight 0.5s ease, fadeOut 0.5s ease 2.5s;
    font-weight: 600;
  `;
  document.body.appendChild(notif);
  setTimeout(() => {
    document.body.removeChild(notif);
  }, 3000);
}

// =======================
// =======================
// =======================

function redeemCashBack() {
  const cashback = calculateCashBack(rewardUser.points);
  const points = rewardUser.points;
  
  if (points < 100) {
    alert("❌ You need at least 100 points to redeem cash back!");
    return;
  }
  
  if (confirm(`Redeem $${cashback} and reset ${points} points?`)) {
    rewardUser.points = 0;
    rewardUser.level = "Bronze";
    localStorage.setItem("rewardUser", JSON.stringify(rewardUser));
    
    // Add to transaction history
    const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    transactions.push({
      description: "Cash Back Redeemed",
      amount: parseFloat(cashback),
      type: "income",
      category: "other",
      date: new Date().toISOString()
    });
    localStorage.setItem("transactions", JSON.stringify(transactions));
    
    // Update UI
    updateRewardsUI();
    
    alert(`🎉 Success! $${cashback} has been added to your budget as income!`);
    
    // Trigger budget UI update if function exists
    if (typeof updateBudgetUI === 'function') {
      updateBudgetUI();
    }
  }
}

// =======================
// 🎮 Change Username
// =======================

function changeUsername() {
  const newName = prompt("Enter your new username:", rewardUser.username);
  if (newName && newName.trim()) {
    rewardUser.username = newName.trim();
    localStorage.setItem("rewardUser", JSON.stringify(rewardUser));
    updateRewardsUI();
    alert("✅ Username updated!");
  }
}

// =======================
// 📈 Stats
// =======================

function getRewardStats() {
  return {
    totalPoints: rewardUser.points,
    level: rewardUser.level,
    badgeCount: rewardUser.badges.length,
    cashbackAvailable: calculateCashBack(rewardUser.points),
    joinDate: new Date(rewardUser.joinDate).toLocaleDateString(),
    loginStreak: parseInt(localStorage.getItem("loginStreak")) || 0,
    totalScans: parseInt(localStorage.getItem("totalScans")) || 0
  };
}

// =======================
// =======================
// =======================

function initRewards() {
  // Load user
  rewardUser = JSON.parse(localStorage.getItem("rewardUser")) || {
    username: "User",
    points: 0,
    badges: [],
    level: "Bronze",
    joinDate: new Date().toISOString()
  };
  
  // Daily login reward
  rewardForDailyLogin();
  
  // Update UI
  updateRewardsUI();
  
  // Setup event listeners
  document.getElementById("redeem-cashback-btn")?.addEventListener("click", redeemCashBack);
  document.getElementById("change-username-btn")?.addEventListener("click", changeUsername);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRewards);
} else {
  initRewards();
}

