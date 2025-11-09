/* ==========================================================
   reward.js — Standalone Reward System (clean)
   - Wrapped in an IIFE to avoid global pollution
   - Exposes a small `Rewards` API on window for external use
   - Preserves original behavior and localStorage compatibility
========================================================== */

(function (window) {
  'use strict';

  // --- Utilities -------------------------------------------------
  const safeParse = (key, def) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch (e) {
      console.warn(`reward.js: failed to parse ${key}`, e);
      return def;
    }
  };

  const save = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('reward.js: failed to save to localStorage', e);
    }
  };

  const defaultUser = () => ({
    username: 'User',
    points: 0,
    badges: [],
    level: 'Bronze',
    joinDate: new Date().toISOString()
  });

  // --- State -----------------------------------------------------
  let rewardUser = null;

  // --- Core reward logic ----------------------------------------
  function calculateLevel(points) {
    if (points >= 1000) return 'Platinum';
    if (points >= 500) return 'Gold';
    if (points >= 100) return 'Silver';
    return 'Bronze';
  }

  // returns numeric cash back (not formatted string)
  function calculateCashBack(points) {
    return Number((points * 0.05).toFixed(2));
  }

  function getLevelColor(level) {
    const colors = {
      Bronze: '#cd7f32',
      Silver: '#c0c0c0',
      Gold: '#ffd700',
      Platinum: '#e5e4e2'
    };
    return colors[level] || colors.Bronze;
  }

  function persistUser() {
    save('rewardUser', rewardUser);
  }

  function addRewardPoints(points, reason) {
    if (!rewardUser) return;
    rewardUser.points = (rewardUser.points || 0) + Number(points || 0);
    rewardUser.level = calculateLevel(rewardUser.points);
    persistUser();

    showRewardNotification(`+${points} points! ${reason}`);
    updateRewardsUI();
  }

  function awardBadge(badgeName) {
    if (!rewardUser) return;
    if (!rewardUser.badges.includes(badgeName)) {
      rewardUser.badges.push(badgeName);
      persistUser();
      showRewardNotification(`🏆 New Badge: ${badgeName}!`);
      updateRewardsUI();
    }
  }

  // --- Reward triggers (kept behaviour) -------------------------
  function rewardForTransaction(amount, type) {
    if (!type) return;

    if (type === 'expense') {
      addRewardPoints(2, 'Expense tracked');
      const transactions = safeParse('transactions', []);
      if (transactions.length === 1) {
        awardBadge('First Steps');
        addRewardPoints(10, 'First transaction');
      }
    } else if (type === 'income') {
      addRewardPoints(5, 'Income recorded');
      const transactions = safeParse('transactions', []);
      const incomeCount = transactions.filter(t => t.type === 'income').length;
      if (incomeCount === 1) {
        awardBadge('Money Maker');
        addRewardPoints(10, 'First income recorded');
      }
    }
  }

  function rewardForSaving(balance, income) {
    if (balance > 0 && income > 0) {
      const savingsPercent = (balance / income) * 100;
      if (savingsPercent >= 20) {
        addRewardPoints(10, 'Saving 20%+');
        awardBadge('Smart Saver');
      } else if (savingsPercent >= 10) {
        addRewardPoints(5, 'Saving 10%+');
      }
    }
  }

  function rewardForGoalCompletion(goalName) {
    addRewardPoints(50, `Goal completed: ${goalName}`);
    awardBadge('Goal Crusher');
  }

  function rewardForGoalCreation() {
    addRewardPoints(10, 'Goal created');
    const goals = safeParse('goals', []);
    if (goals.length === 1) awardBadge('Goal Setter');
  }

  function rewardForScanning(type) {
    if (type === 'receipt') {
      addRewardPoints(5, 'Receipt scanned');
      awardBadge('Scanner Pro');
    } else if (type === 'pdf') {
      addRewardPoints(5, 'PDF scanned');
      awardBadge('PDF Master');
    }
    checkScanningStreak();
  }

  function rewardForAIUsage() {
    addRewardPoints(20, 'AI planner used');
    awardBadge('AI Explorer');
  }

  function rewardForDailyLogin() {
    const lastLogin = localStorage.getItem('lastRewardLogin');
    const today = new Date().toDateString();
    if (lastLogin !== today) {
      addRewardPoints(5, 'Daily login');
      localStorage.setItem('lastRewardLogin', today);
      checkLoginStreak();
    }
  }

  // --- Streaks --------------------------------------------------
  function checkLoginStreak() {
    const streak = parseInt(localStorage.getItem('loginStreak')) || 0;
    const newStreak = streak + 1;
    localStorage.setItem('loginStreak', newStreak);
    if (newStreak === 7) {
      awardBadge('Week Warrior');
      addRewardPoints(50, '7-day streak');
    } else if (newStreak === 30) {
      awardBadge('Month Master');
      addRewardPoints(200, '30-day streak');
    }
  }

  function checkScanningStreak() {
    const scans = parseInt(localStorage.getItem('totalScans')) || 0;
    const newScans = scans + 1;
    localStorage.setItem('totalScans', newScans);
    if (newScans === 10) {
      awardBadge('Scan Expert');
      addRewardPoints(25, '10 scans completed');
    } else if (newScans === 50) {
      awardBadge('Scan Legend');
      addRewardPoints(100, '50 scans completed');
    }
  }

  // --- UI helpers -----------------------------------------------
  function getNextLevelPoints(currentLevel) {
    const levels = { Bronze: 100, Silver: 500, Gold: 1000, Platinum: 999999 };
    return levels[currentLevel] || 100;
  }

  function getPrevLevelPoints(currentLevel) {
    const levels = { Bronze: 0, Silver: 100, Gold: 500, Platinum: 1000 };
    return levels[currentLevel] || 0;
  }

  function updateRewardsUI() {
    if (!rewardUser) return;
    const el = id => document.getElementById(id);
    const usernameEl = el('reward-username');
    if (usernameEl) usernameEl.textContent = rewardUser.username || 'User';

    const pointsEl = el('reward-points');
    if (pointsEl) pointsEl.textContent = rewardUser.points || 0;

    const levelEl = el('reward-level');
    if (levelEl) {
      levelEl.textContent = rewardUser.level || calculateLevel(rewardUser.points);
      levelEl.style.color = getLevelColor(rewardUser.level);
      levelEl.style.fontWeight = 'bold';
    }

    const cashbackEl = el('reward-cashback');
    if (cashbackEl) cashbackEl.textContent = calculateCashBack(rewardUser.points).toFixed(2);

    const badgesEl = el('reward-badges');
    if (badgesEl) {
      badgesEl.innerHTML = '';
      if (!rewardUser.badges || rewardUser.badges.length === 0) {
        badgesEl.innerHTML = '<li style="opacity:0.5;">No badges yet. Keep going!</li>';
      } else {
        rewardUser.badges.forEach(badge => {
          const li = document.createElement('li');
          li.textContent = `🏆 ${badge}`;
          badgesEl.appendChild(li);
        });
      }
    }

    const progressBar = el('reward-progress-bar');
    if (progressBar) {
      const nextLevel = getNextLevelPoints(rewardUser.level);
      const prevLevel = getPrevLevelPoints(rewardUser.level);
      const denom = Math.max(1, nextLevel - prevLevel);
      const progress = ((rewardUser.points - prevLevel) / denom) * 100;
      progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
    }

    const nextLevelEl = el('next-level-points');
    if (nextLevelEl) {
      const nextLevel = getNextLevelPoints(rewardUser.level);
      const remaining = Math.max(0, nextLevel - (rewardUser.points || 0));
      nextLevelEl.textContent = remaining > 0 ? `${remaining} points to next level` : 'Max level reached!';
    }
  }

  function showRewardNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'reward-notification';
    notif.textContent = message;
    notif.style.cssText = (
      'position: fixed; top: 80px; right: 20px; ' +
      'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; ' +
      'padding: 12px 18px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); ' +
      'z-index: 9999; animation: slideInRight 0.5s ease, fadeOut 0.5s ease 2.5s; font-weight: 600;'
    );
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }

  // --- Actions exposed ------------------------------------------------
  function redeemCashBack() {
    const cashback = calculateCashBack(rewardUser.points);
    const points = rewardUser.points;
    if (points < 100) {
      alert('❌ You need at least 100 points to redeem cash back!');
      return;
    }
    if (!confirm(`Redeem $${cashback.toFixed(2)} and reset ${points} points?`)) return;

    rewardUser.points = 0;
    rewardUser.level = 'Bronze';
    persistUser();

    const transactions = safeParse('transactions', []);
    transactions.push({
      description: 'Cash Back Redeemed',
      amount: cashback,
      type: 'income',
      category: 'other',
      date: new Date().toISOString()
    });
    save('transactions', transactions);

    updateRewardsUI();
    alert(`🎉 Success! $${cashback.toFixed(2)} has been added to your budget as income!`);
    if (typeof window.updateBudgetUI === 'function') window.updateBudgetUI();
  }

  function changeUsername() {
    const newName = prompt('Enter your new username:', rewardUser.username || 'User');
    if (newName && newName.trim()) {
      rewardUser.username = newName.trim();
      persistUser();
      updateRewardsUI();
      alert('✅ Username updated!');
    }
  }

  function getRewardStats() {
    return {
      totalPoints: rewardUser.points,
      level: rewardUser.level,
      badgeCount: (rewardUser.badges || []).length,
      cashbackAvailable: calculateCashBack(rewardUser.points),
      joinDate: new Date(rewardUser.joinDate).toLocaleDateString(),
      loginStreak: parseInt(localStorage.getItem('loginStreak')) || 0,
      totalScans: parseInt(localStorage.getItem('totalScans')) || 0
    };
  }

  // --- Initialization -----------------------------------------------
  function initRewards() {
    rewardUser = safeParse('rewardUser', defaultUser());
    rewardForDailyLogin();
    updateRewardsUI();
    document.getElementById('redeem-cashback-btn')?.addEventListener('click', redeemCashBack);
    document.getElementById('change-username-btn')?.addEventListener('click', changeUsername);
  }

  // --- Animations CSS (kept) ---------------------------------------
  const style = document.createElement('style');
  style.textContent = `
  @keyframes slideInRight { from { transform: translateX(400px); opacity:0 } to { transform: translateX(0); opacity:1 } }
  @keyframes fadeOut { from { opacity:1 } to { opacity:0 } }
  `;
  document.head.appendChild(style);

  // Auto init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRewards);
  } else {
    initRewards();
  }

  // Expose a minimal API
  window.Rewards = {
    init: initRewards,
    addPoints: addRewardPoints,
    awardBadge,
    rewardForTransaction,
    rewardForSaving,
    rewardForScanning,
    rewardForAIUsage,
    redeemCashBack,
    changeUsername,
    getRewardStats
  };

  console.log('🏆 Reward system loaded (clean)');

})(window);
/* ==========================================================
   reward.js — Standalone Reward System
   Works independently without ES6 imports
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
  console.log(`🎁 Rewarding transaction: ${type}, ${amount}`);
  
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
    
    // Check for first income
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
}

function rewardForScanning(type) {
  if (type === "receipt") {
    addRewardPoints(5, "Receipt scanned");
    awardBadge("Scanner Pro");
  } else if (type === "pdf") {
    addRewardPoints(5, "PDF scanned");
    awardBadge("PDF Master");
  }
  
  // Check scanning streak
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
    
    // Check for login streak
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
  // Update username
  const usernameEl = document.getElementById("reward-username");
  if (usernameEl) usernameEl.textContent = rewardUser.username;
  
  // Update points
  const pointsEl = document.getElementById("reward-points");
  if (pointsEl) pointsEl.textContent = rewardUser.points;
  
  // Update level with color
  const levelEl = document.getElementById("reward-level");
  if (levelEl) {
    levelEl.textContent = rewardUser.level;
    levelEl.style.color = getLevelColor(rewardUser.level);
    levelEl.style.fontWeight = "bold";
  }
  
  // Update cash back
  const cashbackEl = document.getElementById("reward-cashback");
  if (cashbackEl) {
    cashbackEl.textContent = `$${calculateCashBack(rewardUser.points)}`;
  }
  
  // Update badges
  const badgesEl = document.getElementById("reward-badges");
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
  
  // Update progress bar
  const progressBar = document.getElementById("reward-progress-bar");
  if (progressBar) {
    const nextLevel = getNextLevelPoints(rewardUser.level);
    const currentPoints = rewardUser.points;
    const prevLevelPoints = getPrevLevelPoints(rewardUser.level);
    const progress = ((currentPoints - prevLevelPoints) / (nextLevel - prevLevelPoints)) * 100;
    
    progressBar.style.width = Math.min(100, progress) + "%";
  }
  
  // Update next level info
  const nextLevelEl = document.getElementById("next-level-points");
  if (nextLevelEl) {
    const nextLevel = getNextLevelPoints(rewardUser.level);
    const remaining = Math.max(0, nextLevel - rewardUser.points);
    nextLevelEl.textContent = remaining > 0 
      ? `${remaining} points to next level` 
      : "Max level reached!";
  }
}

function getNextLevelPoints(currentLevel) {
  const levels = {
    Bronze: 100,
    Silver: 500,
    Gold: 1000,
    Platinum: 999999
  };
  return levels[currentLevel] || 100;
}

function getPrevLevelPoints(currentLevel) {
  const levels = {
    Bronze: 0,
    Silver: 100,
    Gold: 500,
    Platinum: 1000
  };
  return levels[currentLevel] || 0;
}

function showRewardNotification(message) {
  // Create notification element
  const notif = document.createElement("div");
  notif.className = "reward-notification";
  notif.textContent = message;
  notif.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    z-index: 9999;
    animation: slideInRight 0.5s ease, fadeOut 0.5s ease 2.5s;
    font-weight: 600;
  `;
  
  document.body.appendChild(notif);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notif.remove();
  }, 3000);
}

// =======================
// 💰 Redeem Cash Back
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
// 🔧 Initialize Rewards
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

console.log("🏆 Reward system loaded!");