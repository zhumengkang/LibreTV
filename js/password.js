// 密码保护功能 - 强制启用版本

// 立即设置密码配置和环境变量
(function() {
    // 密码配置
    window.PASSWORD_CONFIG = {
        localStorageKey: 'passwordVerified',
        adminLocalStorageKey: 'adminPasswordVerified',
        verificationTTL: 24 * 60 * 60 * 1000 // 24小时过期
    };

    // 硬编码的密码哈希值 (密码: 951951)
    const HARDCODED_PASSWORD_HASH = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";

    // 强制设置环境变量
    window.__ENV__ = {
        PASSWORD: HARDCODED_PASSWORD_HASH,
        ADMINPASSWORD: HARDCODED_PASSWORD_HASH
    };

    console.log('环境变量已设置:', window.__ENV__);
})();

/**
 * 检查是否设置了密码保护 - 强制返回true
 */
function isPasswordProtected() {
    // 强制启用密码保护
    console.log('检查密码保护状态 - 强制启用');
    return true;
}

/**
 * SHA-256实现
 */
async function sha256(message) {
    console.log('🔢 计算SHA-256，输入:', message);
    
    try {
        if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
            console.log('✅ 使用Web Crypto API计算SHA-256');
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('🔐 计算得到的哈希:', hash);
            return hash;
        } else {
            console.log('❌ Web Crypto API不可用');
            throw new Error('Web Crypto API not supported');
        }
    } catch (error) {
        console.error('💥 SHA-256计算失败:', error);
        throw error;
    }
}

/**
 * 验证用户输入的密码是否正确
 */
async function verifyPassword(password, passwordType = 'PASSWORD') {
    try {
        console.log('验证密码:', password, '类型:', passwordType);
        
        const correctHash = window.__ENV__?.[passwordType];
        console.log('期望的哈希:', correctHash);
        
        if (!correctHash) {
            console.log('没有找到正确的哈希值');
            return false;
        }

        const inputHash = await sha256(password);
        console.log('输入密码的哈希:', inputHash);
        
        const isValid = inputHash === correctHash;
        console.log('密码验证结果:', isValid);

        if (isValid) {
            const storageKey = passwordType === 'PASSWORD'
                ? window.PASSWORD_CONFIG.localStorageKey
                : window.PASSWORD_CONFIG.adminLocalStorageKey;

            localStorage.setItem(storageKey, JSON.stringify({
                verified: true,
                timestamp: Date.now(),
                passwordHash: correctHash
            }));
            console.log('密码验证信息已保存到localStorage');
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
        console.log('检查验证状态，密码类型:', passwordType);
        
        const storageKey = passwordType === 'PASSWORD'
            ? window.PASSWORD_CONFIG.localStorageKey
            : window.PASSWORD_CONFIG.adminLocalStorageKey;

        const stored = localStorage.getItem(storageKey);
        console.log('localStorage中的验证信息:', stored);
        
        if (!stored) {
            console.log('localStorage中没有验证信息');
            return false;
        }

        const { timestamp, passwordHash } = JSON.parse(stored);
        const currentHash = window.__ENV__?.[passwordType];

        const isStillValid = timestamp && passwordHash === currentHash &&
            Date.now() - timestamp < window.PASSWORD_CONFIG.verificationTTL;
            
        console.log('验证状态检查结果:', isStillValid);
        return isStillValid;
    } catch (error) {
        console.error(`检查${passwordType}验证状态时出错:`, error);
        return false;
    }
}

/**
 * 创建密码弹窗HTML
 */
function createPasswordModal() {
    if (document.getElementById('passwordModal')) {
        console.log('密码弹窗已存在');
        return;
    }
    
    console.log('创建密码弹窗');
    
    const modalHTML = `
        <div id="passwordModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
             background: rgba(0,0,0,0.8); z-index: 10000; justify-content: center; align-items: center;">
            <div style="background: white; padding: 40px; border-radius: 10px; min-width: 350px; max-width: 400px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <h2 style="margin: 0 0 25px 0; color: #333; font-size: 24px;">请输入访问密码</h2>
                <div>
                    <input type="password" id="passwordInput" placeholder="请输入密码" 
                           style="width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 6px; 
                           font-size: 16px; margin-bottom: 15px; box-sizing: border-box;">
                    <div id="passwordError" style="display: none; color: #dc3545; margin-bottom: 15px; font-size: 14px;">
                        ❌ 密码错误，请重新输入
                    </div>
                    <button type="button" id="passwordSubmitBtn" style="background: #007bff; color: white; border: none; 
                            padding: 15px 30px; border-radius: 6px; cursor: pointer; font-size: 16px; width: 100%; font-weight: bold;">
                        确认登录
                    </button>
                    <button type="button" id="passwordCancelBtn" style="display: none; background: #6c757d; color: white; border: none; 
                            padding: 15px 30px; border-radius: 6px; cursor: pointer; font-size: 16px; width: 100%; margin-top: 10px;">
                        取消
                    </button>
                </div>
                <div style="margin-top: 20px; font-size: 12px; color: #666;">
                    提示：请输入正确的访问密码
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 绑定事件 - 使用按钮点击而不是表单提交
    const submitBtn = document.getElementById('passwordSubmitBtn');
    const passwordInput = document.getElementById('passwordInput');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            console.log('🔘 提交按钮被点击');
            handlePasswordSubmit();
        });
        console.log('✅ 提交按钮事件已绑定');
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('🔘 回车键被按下');
                handlePasswordSubmit();
            }
        });
        console.log('✅ 回车键事件已绑定');
    }
}

/**
 * 显示密码验证弹窗
 */
function showPasswordModal() {
    console.log('显示密码弹窗');
    createPasswordModal();
    
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        passwordModal.style.display = 'flex';
        
        // 隐藏其他可能的元素
        const doubanArea = document.getElementById('doubanArea');
        if (doubanArea) {
            doubanArea.style.display = 'none';
        }

        // 聚焦到输入框
        setTimeout(() => {
            const passwordInput = document.getElementById('passwordInput');
            if (passwordInput) {
                passwordInput.focus();
                console.log('密码输入框已聚焦');
            }
        }, 100);
    }
}

/**
 * 隐藏密码验证弹窗
 */
function hidePasswordModal() {
    console.log('隐藏密码弹窗');
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        passwordModal.style.display = 'none';
        
        // 清空输入框
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) passwordInput.value = '';
        
        // 隐藏错误信息
        const errorElement = document.getElementById('passwordError');
        if (errorElement) errorElement.style.display = 'none';

        // 显示主要内容
        const doubanArea = document.getElementById('doubanArea');
        if (doubanArea && localStorage.getItem('doubanEnabled') === 'true') {
            doubanArea.style.display = 'block';
            if (typeof initDouban === 'function') {
                initDouban();
            }
        }
        
        // 触发验证成功事件
        document.dispatchEvent(new CustomEvent('passwordVerified'));
        console.log('密码验证成功事件已触发');
    }
}

/**
 * 处理密码提交事件
 */
async function handlePasswordSubmit() {
    console.log('🚀 开始处理密码提交');
    
    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput ? passwordInput.value.trim() : '';
    
    console.log('📝 用户输入的密码:', password);
    console.log('📏 密码长度:', password.length);
    
    if (!password) {
        console.log('❌ 密码为空');
        showPasswordError('请输入密码');
        return;
    }
    
    // 禁用按钮，防止重复提交
    const submitBtn = document.getElementById('passwordSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '验证中...';
    }
    
    try {
        console.log('🔐 开始验证密码...');
        const isValid = await verifyPassword(password);
        console.log('✅ 密码验证结果:', isValid);
        
        if (isValid) {
            console.log('🎉 密码验证成功，隐藏弹窗');
            hidePasswordModal();
        } else {
            console.log('❌ 密码验证失败，显示错误');
            showPasswordError('密码错误，请重新输入');
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
    } catch (error) {
        console.error('💥 密码验证过程中出错:', error);
        showPasswordError('验证失败，请重试');
    } finally {
        // 恢复按钮状态
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '确认登录';
        }
    }
}

/**
 * 显示密码错误信息
 */
function showPasswordError(message = '密码错误，请重新输入') {
    const errorElement = document.getElementById('passwordError');
    if (errorElement) {
        errorElement.textContent = '❌ ' + message;
        errorElement.style.display = 'block';
        console.log('🚨 显示错误信息:', message);
    }
}

/**
 * 初始化密码保护系统
 */
function initPasswordProtection() {
    console.log('=== 初始化密码保护系统 ===');
    console.log('当前时间:', new Date().toLocaleString());
    console.log('密码保护状态:', isPasswordProtected());
    console.log('当前验证状态:', isVerified('PASSWORD'));
    
    // 强制显示密码弹窗（除非已经验证过）
    if (!isVerified('PASSWORD')) {
        console.log('需要验证密码，显示弹窗');
        showPasswordModal();
    } else {
        console.log('密码已验证，无需显示弹窗');
    }
}

// 管理员密码验证
function showAdminPasswordModal() {
    console.log('显示管理员密码弹窗');
    createPasswordModal();
    
    const passwordModal = document.getElementById('passwordModal');
    if (!passwordModal) return;

    // 修改标题
    const title = passwordModal.querySelector('h2');
    if (title) title.textContent = '管理员验证';

    // 显示取消按钮
    const cancelBtn = document.getElementById('passwordCancelBtn');
    if (cancelBtn) {
        cancelBtn.style.display = 'block';
        cancelBtn.onclick = () => {
            passwordModal.style.display = 'none';
        };
    }

    passwordModal.style.display = 'flex';

    // 重新绑定表单事件（管理员验证）
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
                const errorElement = document.getElementById('passwordError');
                if (errorElement) errorElement.style.display = 'block';
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

// 强制初始化
console.log('🔐 密码保护脚本已加载');
console.log('📝 当前设置的密码是: 951951');

// 立即执行初始化
if (document.readyState === 'loading') {
    console.log('等待DOM加载完成...');
    document.addEventListener('DOMContentLoaded', initPasswordProtection);
} else {
    console.log('DOM已准备就绪，立即初始化');
    initPasswordProtection();
}

// 确保在所有内容加载完成后再次检查
window.addEventListener('load', function() {
    console.log('页面完全加载完成，再次检查密码保护');
    setTimeout(() => {
        if (!isVerified('PASSWORD')) {
            console.log('最终检查：需要显示密码弹窗');
            showPasswordModal();
        }
    }, 1000);
});

// 阻止未验证用户的操作
document.addEventListener('click', function(e) {
    if (!isVerified('PASSWORD')) {
        // 检查是否点击的是设置按钮或其他需要保护的元素
        const target = e.target;
        if (target.onclick && target.onclick.toString().includes('toggleSettings')) {
            e.preventDefault();
            e.stopPropagation();
            showPasswordModal();
            console.log('拦截了设置按钮点击，显示密码弹窗');
        }
    }
}, true);
