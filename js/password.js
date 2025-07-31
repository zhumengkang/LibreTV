// password-config.js

// ====== 环境变量注入（请勿移动） ======
window.__ENV__ = {
  // 明文“951951”的 SHA-256 哈希
  PASSWORD: "b5a184e01536e38d6ebad96cf6059546ac4b5000ed4df493665cb58c8974b645",
  // 如需管理员密码，请同样写入 ADMINPASSWORD
  // ADMINPASSWORD: "<管理员明文密码的 SHA-256 哈希>"
};

// ====== 密码保护功能 ======

/**
 * 检查是否设置了密码保护
 */
function isPasswordProtected() {
  const pwd = window.__ENV__?.PASSWORD;
  const adminPwd = window.__ENV__?.ADMINPASSWORD;
  const isPwdValid = typeof pwd === "string" && pwd.length === 64 && !/^0+$/.test(pwd);
  const isAdminPwdValid = typeof adminPwd === "string" && adminPwd.length === 64 && !/^0+$/.test(adminPwd);
  return isPwdValid || isAdminPwdValid;
}
window.isPasswordProtected = isPasswordProtected;

/**
 * 通用验证函数：对比输入密码的 SHA-256 与环境变量中的哈希
 */
async function verifyPassword(password, passwordType = "PASSWORD") {
  try {
    const correctHash = window.__ENV__?.[passwordType];
    if (!correctHash) return false;

    const inputHash = await sha256(password);
    const isValid = inputHash === correctHash;
    if (isValid) {
      const storageKey = passwordType === "PASSWORD"
        ? PASSWORD_CONFIG.localStorageKey
        : PASSWORD_CONFIG.adminLocalStorageKey;
      localStorage.setItem(storageKey, JSON.stringify({
        verified: true,
        timestamp: Date.now(),
        passwordHash: correctHash
      }));
    }
    return isValid;
  } catch (e) {
    console.error(`验证${passwordType}密码时出错:`, e);
    return false;
  }
}
window.verifyPassword = verifyPassword;

/**
 * 检查本地存储中是否已有有效的验证记录
 */
function isVerified(passwordType = "PASSWORD") {
  try {
    if (!isPasswordProtected()) return true;
    const storageKey = passwordType === "PASSWORD"
      ? PASSWORD_CONFIG.localStorageKey
      : PASSWORD_CONFIG.adminLocalStorageKey;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return false;
    const { timestamp, passwordHash } = JSON.parse(stored);
    const currentHash = window.__ENV__?.[passwordType];
    return timestamp && passwordHash === currentHash &&
           (Date.now() - timestamp) < PASSWORD_CONFIG.verificationTTL;
  } catch (e) {
    console.error(`检查${passwordType}验证状态时出错:`, e);
    return false;
  }
}
window.isPasswordVerified = () => isVerified("PASSWORD");
window.isAdminVerified = () => isVerified("ADMINPASSWORD");

/**
 * SHA-256 哈希实现：优先使用 Web Crypto API
 */
async function sha256(message) {
  if (window.crypto?.subtle?.digest) {
    const data = new TextEncoder().encode(message);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback（需在页面引入 js-sha256）
  if (typeof window._jsSha256 === "function") {
    return window._jsSha256(message);
  }
  throw new Error("No SHA-256 implementation available.");
}

/**
 * 显示／隐藏密码弹窗，以及相关 DOM 操作
 */
function showPasswordModal() {
  const modal = document.getElementById("passwordModal");
  if (!modal) return;
  document.getElementById("doubanArea")?.classList.add("hidden");
  document.getElementById("passwordCancelBtn")?.classList.add("hidden");
  modal.style.display = "flex";
  setTimeout(() => document.getElementById("passwordInput")?.focus(), 100);
}

function hidePasswordModal() {
  const modal = document.getElementById("passwordModal");
  if (!modal) return;
  hidePasswordError();
  const input = document.getElementById("passwordInput");
  if (input) input.value = "";
  modal.style.display = "none";
  if (localStorage.getItem("doubanEnabled") === "true") {
    document.getElementById("doubanArea")?.classList.remove("hidden");
    initDouban();
  }
}

function showPasswordError() {
  document.getElementById("passwordError")?.classList.remove("hidden");
}

function hidePasswordError() {
  document.getElementById("passwordError")?.classList.add("hidden");
}

async function handlePasswordSubmit() {
  const pwd = document.getElementById("passwordInput")?.value.trim() || "";
  if (await verifyPassword(pwd)) {
    hidePasswordModal();
    document.dispatchEvent(new CustomEvent("passwordVerified"));
  } else {
    showPasswordError();
    const input = document.getElementById("passwordInput");
    if (input) {
      input.value = "";
      input.focus();
    }
  }
}

/**
 * 初始化入口：页面加载完成后调用
 */
function initPasswordProtection() {
  if (!isPasswordProtected()) return;

  const hasPwd = !!window.__ENV__.PASSWORD;
  if (hasPwd && !isPasswordVerified()) {
    showPasswordModal();
  }

  const settingsBtn = document.querySelector('[onclick="toggleSettings(event)"]');
  if (settingsBtn) {
    settingsBtn.addEventListener("click", e => {
      if (hasPwd && !isPasswordVerified()) {
        e.preventDefault();
        e.stopPropagation();
        showPasswordModal();
      }
    });
  }
}

function showAdminPasswordModal() {
  const modal = document.getElementById("passwordModal");
  if (!modal) return;
  document.getElementById("passwordInput").value = "";
  modal.querySelector("h2").textContent = "管理员验证";
  document.getElementById("passwordCancelBtn")?.classList.remove("hidden");
  modal.style.display = "flex";
  const form = document.getElementById("passwordForm");
  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();
      const pwd = document.getElementById("passwordInput").value.trim();
      if (await verifyPassword(pwd, "ADMINPASSWORD")) {
        modal.style.display = "none";
        document.getElementById("settingsPanel")?.classList.add("show");
      } else {
        showPasswordError();
      }
    };
  }
}

// 页面 DOM 准备好后启动
document.addEventListener("DOMContentLoaded", initPasswordProtection);

// ====== 全局常量 ======
const PASSWORD_CONFIG = {
  localStorageKey: "userPasswordVerified",
  adminLocalStorageKey: "adminPasswordVerified",
  verificationTTL: 1000 * 60 * 60 * 24  // 24 小时
};
