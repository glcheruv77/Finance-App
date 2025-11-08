// =======================
// 🧑‍💼 Account + Rewards System (reward.js)
// =======================

export let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;

// --- Account Management ---
export function createAccount(username, email) {
  const account = {
    username,
    email,
    points: 0,
    badges: [],
    goals: [],
    transactions: []
  };
  localStorage.setItem(`account_${username}`, JSON.stringify(account));
  localStorage.setItem("currentUser", JSON.stringify(account));
  currentUser = account;
  updateRewardsUI();
  return account;
}

export function loadAccount(username) {
  const account = JSON.parse(localStorage.getItem(`account_${username}`));
  if (account) {
    localStorage.setItem("currentUser", JSON.stringify(account));
    currentUser = account;
    updateRewardsUI();
  }
  return account;
}

export function getCurrentUser() {
  return currentUser;
}

// --- Points + Badges ---
export function addPoints(username, points) {
  const key = `account_${username}`;
  let account = JSON.parse(localStorage.getItem(key));
  if (!account) return;
  account.points += points;
  localStorage.setItem(key, JSON.stringify(account));
  localStorage.setItem("currentUser", JSON.stringify(account));
  currentUser = account;
  updateRewardsUI();
}

export function awardBadge(username, badgeName) {
  const key = `account_${username}`;
  let account = JSON.parse(localStorage.getItem(key));
  if (!account) return;
  account.badges = account.badges || [];
  if (!account.badges.includes(badgeName)) {
    account.badges.push(badgeName);
  }
  localStorage.setItem(key, JSON.stringify(account));
  localStorage.setItem("currentUser", JSON.stringify(account));
  currentUser = account;
  updateRewardsUI();
}

// --- Level + Cash Back ---
export function calculateLevel(points) {
  if (points < 100) return "Bronze";
  if (points < 500) return "Silver";
  if (points < 1000) return "Gold";
  return "Platinum";
}

export function calculateCashBack(points) {
  return points * 0.05;
}

// --- UI Updater ---
export function updateRewardsUI() {
  if (!currentUser) return;
  const usernameEl = document.getElementById("reward-username");
  const pointsEl = document.getElementById("reward-points");
  const levelEl = document.getElementById("reward-level");
  const cashbackEl = document.getElementById("reward-cashback");
  const badgesEl = document.getElementById("reward-badges");

  if (usernameEl) usernameEl.textContent = currentUser.username;
  if (pointsEl) pointsEl.textContent = currentUser.points;
  if (levelEl) levelEl.textContent = calculateLevel(currentUser.points);
  if (cashbackEl) cashbackEl.textContent = `$${calculateCashBack(currentUser.points).toFixed(2)}`;

  if (badgesEl) {
    badgesEl.innerHTML = "";
    (currentUser.badges || []).forEach(b => {
      const li = document.createElement("li");
      li.textContent = b;
      badgesEl.appendChild(li);
    });
  }
}

// --- Reward Triggers ---
export function rewardForSaving(amount) {
  const earned = Math.floor(amount / 10);
  if (earned > 0) {
    addPoints(currentUser.username, earned);
    awardBadge(currentUser.username, "First Saver");
  }

  const today = new Date().toISOString().slice(0, 10);
  const lastSave = localStorage.getItem("lastSaveDate");
  if (lastSave && today !== lastSave) {
    const days = (new Date(today) - new Date(lastSave)) / (1000 * 60 * 60 * 24);
    if (days <= 7) {
      addPoints(currentUser.username, 10);
      awardBadge(currentUser.username, "Savings Streak");
    }
  }
  localStorage.setItem("lastSaveDate", today);
}

export function rewardForGoalCompletion() {
  addPoints(currentUser.username, 50);
  awardBadge(currentUser.username, "Goal Crusher");
}

export function rewardForAIUsage() {
  addPoints(currentUser.username, 20);
  awardBadge(currentUser.username, "AI Explorer");
}

export function rewardForScanning() {
  addPoints(currentUser.username, 5);
  awardBadge(currentUser.username, "Scanner Pro");
}

export function rewardForExpenseRemoval() {
  addPoints(currentUser.username, 5);
  awardBadge(currentUser.username, "Smart Saver");
}

// --- Redeem ---
export function redeemCashBack() {
  const cashback = calculateCashBack(currentUser.points);
  currentUser.points = 0;
  localStorage.setItem(`account_${currentUser.username}`, JSON.stringify(currentUser));
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  updateRewardsUI();
  const output = document.getElementById("redeem-output");
  if (output) {
    output.textContent = `🎉 You’ve redeemed $${cashback.toFixed(2)}! Your points have been reset.`;
  }
}