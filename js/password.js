// 密码保护功能 - 完整版本

// 密码配置
const PASSWORD_CONFIG = {
    localStorageKey: 'passwordVerified',
    adminLocalStorageKey: 'adminPasswordVerified',
    verificationTTL: 24 * 60 * 60 * 1000 // 24小时过期
};

// 硬编码的密码哈希值 (密码: 951951)
const HARDCODED_PASSWORD_HASH = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";

// 立即设置环境变量，确保在所有检查之前就存在
window.__ENV__ = {
    PASSWORD: HARDCODED_PASSWORD_HASH,
    ADMINPASSWORD: HARDCODED_PASSWORD_HASH
};

/**
 * 检查是否设置了密码保护
 */
function isPasswordProtected() {
    const pwd = window.__ENV__ && window.__ENV__.PASSWORD;
    const adminPwd = window.__ENV__ && window.__ENV__.ADMINPASSWORD;
    
    const isPwdValid = typeof pwd === 'string' && pwd.length === 64 && !/^0+$/.test(pwd);
    const isAdminPwdValid = typeof adminPwd === 'string' && adminPwd.length === 64 && !/^0+$/.test(adminPwd);
    
    return isPwdValid || isAdminPwdValid;
}

/**
 * SHA-256实现
 */
async function sha256(message) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // 备用实现
    if (typeof window._jsSha256 === 'function') {
        return window._jsSha256(message);
    }
    throw new Error('No SHA-256 implementation available.');
}

/**
 * 验证密码
 */
async function verifyPassword(password, passwordType = 'PASSWORD') {
    try {
        const correctHash = window.__ENV__?.[passwordType];
        if (!correctHash) return false;

        const inputHash = await sha256(password);
        const isValid = inputHash === correctHash;

        if (isValid) {
            const storageKey = passwordType === 'PASSWORD'
                ? PASSWORD_CONFIG.localStorageKey
                : PASSWORD_CONFIG.adminLocalStorageKey;

            localStorage.setItem(storageKey, JSON.stringify({
                verified: true,
                timestamp: Date.now(),
                passwordHash: correctHash
            }));
        }
        return isValid;
    } catch (error) {
        console.error(`验证${passwordType}密码时出错:`, error);
        return false;
    }
}

/**
 * 检查验证状态
 */
function isVerified(passwordType = 'PASSWORD') {
    try {
        if (!isPasswordProtected()) return true;

        const storageKey = passwordType === 'PASSWORD'
            ? PASSWORD_CONFIG.localStorageKey
            : PASSWORD_CONFIG.adminLocalStorageKey;

        const stored = localStorage.getItem(storageKey);
        if (!stored) return false;

        const { timestamp, passwordHash } = JSON.parse(stored);
        const currentHash = window.__ENV__?.[passwordType];

        return timestamp && passwordHash === currentHash &&
            Date.now() - timestamp < PASSWORD_CONFIG.verificationTTL;
    } catch (error) {
        console.error(`检查${passwordType}验证状态时出错:`, error);
        return false;
    }
}

/**
 * 创建密码弹窗HTML
 */
function createPasswordModal() {
    // 检查是否已存在
    if (document.getElementById('passwordModal')) return;
    
    const modalHTML = `
        <div id="passwordModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
             background: rgba(0,0,0,0.8); z-index: 10000; justify-content: center; align-items: center;">
            <div style="background: white; padding: 30px; border-radius: 10px; min-width: 300px; max-width: 400px; text-align: center;">
                <h2 style="margin-bottom: 20px; color: #333;">请输入访问密码</h2>
                <form id="passwordForm">
                    <input type="password" id="passwordInput" placeholder="请输入密码" 
                           style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; 
                           font-size: 16px; margin-bottom: 15px; box-sizing: border-box;">
                    <div id="passwordError" class="hidden" style="color: red; margin-bottom: 15px; font-size: 14px;">
                        密码错误，请重新输入
                    </div>
                    <button type="submit" style="background: #007bff; color: white; border: none; 
                            padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; width: 100%;">
                        确认
                    </button>
                    <button type="button" id="passwordCancelBtn" class="hidden" 
                            style="background: #6c757d; color: white; border: none; padding: 12px 24px; 
                            border-radius: 6px; cursor: pointer; font-size: 16px; width: 100%; margin-top: 10px;">
                        取消
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .hidden { display: none !important; }
        #passwordModal input:focus { outline: none; border-color: #007bff; }
        #passwordModal button:hover { opacity: 0.9; }
    `;
    document.head.appendChild(style);
}

/**
 * 显示密码验证弹窗
 */
function showPasswordModal() {
    createPasswordModal(); // 确保弹窗存在
    
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        // 隐藏可能存在的豆瓣区域
        const doubanArea = document.getElementById('doubanArea');
        if (doubanArea) doubanArea.classList.add('hidden');
        
        const cancelBtn = document.getElementById('passwordCancelBtn');
        if (cancelBtn) cancelBtn.classList.add('hidden');

        passwordModal.style.display = 'flex';

        // 确保输入框获取焦点
        setTimeout(() => {
            const passwordInput = document.getElementById('passwordInput');
            if (passwordInput) {
                passwordInput.focus();
            }
        }, 100);
        
        // 绑定事件
        setupPasswordModalEvents();
    }
}

/**
 * 设置密码弹窗事件
 */
function setupPasswordModalEvents() {
    const form = document.getElementById('passwordForm');
    const passwordInput = document.getElementById('passwordInput');
    
    if (form && !form.hasAttribute('data-events-bound')) {
        form.setAttribute('data-events-bound', 'true');
        form.onsubmit = handlePasswordSubmit;
    }
}

/**
 * 隐藏密码验证弹窗
 */
function hidePasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        hidePasswordError();
        
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) passwordInput.value = '';

        passwordModal.style.display = 'none';

        // 显示豆瓣区域（如果启用）
        if (localStorage.getItem('doubanEnabled') === 'true') {
            const doubanArea = document.getElementById('doubanArea');
            if (doubanArea) {
                doubanArea.classList.remove('hidden');
                if (typeof initDouban === 'function') {
                    initDouban();
                }
            }
        }
    }
}

/**
 * 显示/隐藏密码错误信息
 */
function showPasswordError() {
    const errorElement = document.getElementById('passwordError');
    if (errorElement) {
        errorElement.classList.remove('hidden');
    }
}

function hidePasswordError() {
    const errorElement = document.getElementById('passwordError');
    if (errorElement) {
        errorElement.classList.add('hidden');
    }
}

/**
 * 处理密码提交事件
 */
async function handlePasswordSubmit(e) {
    e.preventDefault();
    
    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput ? passwordInput.value.trim() : '';
    
    if (await verifyPassword(password)) {
        hidePasswordModal();
        document.dispatchEvent(new CustomEvent('passwordVerified'));
        console.log('密码验证成功');
    } else {
        showPasswordError();
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }
}

/**
 * 检查是否应该显示密码框
 */
function shouldShowPasswordModal() {
    // 必须启用密码保护
    if (!isPasswordProtected()) {
        console.log('密码保护未启用');
        return false;
    }
    
    // 检查是否已经验证过
    if (isPasswordVerified()) {
        console.log('密码已验证');
        return false;
    }
    
    console.log('需要显示密码验证框');
    return true;
}

/**
 * 初始化密码保护系统
 */
function initPasswordProtection() {
    console.log('初始化密码保护系统...');
    console.log('密码保护状态:', isPasswordProtected());
    console.log('密码验证状态:', isPasswordVerified());
    
    if (shouldShowPasswordModal()) {
        console.log('显示密码验证框');
        showPasswordModal();
    }
    
    // 拦截设置按钮点击
    const settingsBtn = document.querySelector('[onclick="toggleSettings(event)"]');
    if (settingsBtn && !settingsBtn.hasAttribute('data-password-intercepted')) {
        settingsBtn.setAttribute('data-password-intercepted', 'true');
        settingsBtn.addEventListener('click', function(e) {
            if (!isPasswordVerified()) {
                e.preventDefault();
                e.stopPropagation();
                showPasswordModal();
                return false;
            }
        }, true); // 使用捕获阶段
    }
}

// 管理员密码验证
function showAdminPasswordModal() {
    createPasswordModal();
    const passwordModal = document.getElementById('passwordModal');
    if (!passwordModal) return;

    // 清空输入框
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) passwordInput.value = '';

    // 修改标题
    const title = passwordModal.querySelector('h2');
    if (title) title.textContent = '管理员验证';

    // 显示取消按钮
    const cancelBtn = document.getElementById('passwordCancelBtn');
    if (cancelBtn) {
        cancelBtn.classList.remove('hidden');
        cancelBtn.onclick = () => {
            passwordModal.style.display = 'none';
        };
    }

    passwordModal.style.display = 'flex';

    // 设置表单提交处理
    const form = document.getElementById('passwordForm');
    if (form) {
        form.onsubmit = async function (e) {
            e.preventDefault();
            const password = document.getElementById('passwordInput').value.trim();
            if (await verifyPassword(password, 'ADMINPASSWORD')) {
                passwordModal.style.display = 'none';
                const settingsPanel = document.getElementById('settingsPanel');
                if (settingsPanel) {
                    settingsPanel.classList.add('show');
                }
            } else {
                showPasswordError();
            }
        };
    }
}

// 导出全局函数
window.isPasswordProtected = isPasswordProtected;
window.isPasswordVerified = () => isVerified('PASSWORD');
window.isAdminVerified = () => isVerified('ADMINPASSWORD');
window.verifyPassword = verifyPassword;
window.showPasswordModal = showPasswordModal;
window.hidePasswordModal = hidePasswordModal;
window.showAdminPasswordModal = showAdminPasswordModal;

// 强制初始化 - 立即执行和DOM加载后都执行
console.log('密码保护脚本加载完成，当前密码: 951951');

// 立即检查并初始化（如果DOM已准备好）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPasswordProtection);
} else {
    // DOM已经加载完成，立即执行
    setTimeout(initPasswordProtection, 100);
}

// 额外的安全检查 - 确保在页面完全加载后再次检查
window.addEventListener('load', function() {
    setTimeout(() => {
        if (shouldShowPasswordModal()) {
            showPasswordModal();
        }
    }, 500);
});
