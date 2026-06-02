// 1. 强制声明：没有密码保护，且永远验证通过
window.isPasswordProtected = function() { return false; };
window.isPasswordVerified = function() { return true; };

// 2. 保留空函数，防止其他页面的代码调用时出现 "undefined" 报错
function showPasswordModal() {}
function hidePasswordModal() {}
function showPasswordError() {}
function hidePasswordError() {}
async function verifyPassword() { return true; }
async function handlePasswordSubmit() {}
function initPasswordProtection() {}

// 3. 页面加载完成后，直接向系统发送“验证成功”的通行证
document.addEventListener('DOMContentLoaded', function() {
    document.dispatchEvent(new CustomEvent('passwordVerified'));
});
