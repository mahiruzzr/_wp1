const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.static('public'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOrigin = (req) => {
  const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) return origin;
  return allowedOrigins[0];
};

app.use((req, res, next) => {
  const origin = corsOrigin(req);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(session({
  secret: 'microblog-secret-key-2024',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
}));

// 登入狀態的中介層
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: '請先登入' });
  }
  next();
}

// 全域樣式
const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #fff; min-height: 100vh; }
  a { color: inherit; text-decoration: none; }
  .container { max-width: 600px; margin: 0 auto; padding: 0 16px; }
  .navbar { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); border-bottom: 1px solid #222; z-index: 100; padding: 12px 0; }
  .nav-content { max-width: 600px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 16px; }
  .nav-brand { font-size: 1.4rem; font-weight: bold; background: linear-gradient(135deg, #00d2d3, #2ed573); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .nav-links { display: flex; gap: 20px; }
  .nav-links a { padding: 8px 16px; border-radius: 20px; transition: all 0.2s; }
  .nav-links a:hover, .nav-links a.active { background: #111; }
  .btn { padding: 10px 20px; border: none; border-radius: 20px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
  .btn-primary { background: linear-gradient(135deg, #00d2d3, #2ed573); color: #000; font-weight: 600; }
  .btn-primary:hover { opacity: 0.9; transform: scale(1.02); }
  .btn-secondary { background: #111; color: #fff; border: 1px solid #333; }
  .btn-secondary:hover { background: #222; }
  .card { background: #111; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #1a1a1a; }
  .post { position: relative; }
  .post-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; color: #000; flex-shrink: 0; }
  .post-meta { display: flex; align-items: center; gap: 8px; }
  .username { font-weight: 600; }
  .handle { color: #666; font-size: 0.9rem; }
  .time { color: #666; font-size: 0.85rem; }
  .post-content { margin-left: 56px; line-height: 1.5; word-break: break-word; }
  .post-content a { color: #00d2d3; }
  .post-actions { display: flex; gap: 20px; margin-top: 12px; margin-left: 56px; }
  .action-btn { background: none; border: none; color: #666; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.9rem; transition: color 0.2s; }
  .action-btn:hover { color: #00d2d3; }
  .action-btn.liked { color: #ff4757; }
  .action-btn.liked svg { fill: #ff4757; }
  .delete-btn { color: #ff4757; }
  .post-image img { max-width: 100%; border-radius: 12px; margin-top: 10px; }
  .main { padding-top: 80px; padding-bottom: 40px; }
  .compose-box { background: #111; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #1a1a1a; }
  .compose-form { display: flex; gap: 12px; }
  .compose-input { flex: 1; background: #000; border: 1px solid #333; border-radius: 8px; padding: 12px; color: #fff; resize: none; min-height: 60px; font-size: 1rem; }
  .compose-input:focus { outline: none; border-color: #00d2d3; }
  .compose-image-btn { background: none; border: none; color: #666; cursor: pointer; padding: 8px; font-size: 1.2rem; }
  .compose-image-btn:hover { color: #00d2d3; }
  .image-preview { max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 8px; display: none; }
  .modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 200; }
  .modal-content { background: #111; border-radius: 16px; padding: 24px; width: 90%; max-width: 500px; border: 1px solid #222; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .modal-title { font-size: 1.2rem; font-weight: 600; }
  .modal-close { background: none; border: none; color: #666; font-size: 1.5rem; cursor: pointer; }
  .modal-body textarea { width: 100%; background: #000; border: 1px solid #333; border-radius: 8px; padding: 12px; color: #fff; resize: none; min-height: 100px; font-size: 1rem; }
  .modal-body textarea:focus { outline: none; border-color: #00d2d3; }
  .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
  .auth-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .auth-box { background: #111; border-radius: 16px; padding: 32px; width: 90%; max-width: 400px; border: 1px solid #1a1a1a; }
  .auth-title { text-align: center; margin-bottom: 24px; font-size: 1.5rem; }
  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; margin-bottom: 8px; color: #888; }
  .form-group input { width: 100%; background: #000; border: 1px solid #333; border-radius: 8px; padding: 12px; color: #fff; font-size: 1rem; }
  .form-group input:focus { outline: none; border-color: #00d2d3; }
  .auth-footer { text-align: center; margin-top: 16px; color: #666; }
  .auth-footer a { color: #00d2d3; }
  .profile-header { text-align: center; padding: 32px 0; }
  .profile-avatar { width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; color: #000; margin: 0 auto 16px; }
  .profile-name { font-size: 1.5rem; font-weight: 600; }
  .profile-handle { color: #666; margin-top: 4px; }
  .empty-state { text-align: center; padding: 40px; color: #666; }
  .error { color: #ff4757; margin-bottom: 12px; font-size: 0.9rem; }
  .tag-filter { background: linear-gradient(135deg, #00d2d3, #2ed573); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.2rem; margin-bottom: 20px; }
  .hidden { display: none !important; }
`;

// 頁面模板
function pageTemplate(title, content, navHtml = '') {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - MicroBlog</title>
  <style>${globalStyles}</style>
</head>
<body>
  <nav class="navbar">
    <div class="nav-content">
      <a href="/for-you" class="nav-brand">MicroBlog</a>
      <div class="nav-links">
        <a href="/for-you">首頁</a>
        ${navHtml}
      </div>
    </div>
  </nav>
  <main class="main">
    <div class="container">
      ${content}
    </div>
  </main>
  <div class="modal hidden" id="editModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">編輯貼文</h2>
        <button class="modal-close" onclick="closeEditModal()">&times;</button>
      </div>
      <div class="modal-body">
        <textarea id="editContent"></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeEditModal()">取消</button>
        <button class="btn btn-primary" id="saveEditBtn">儲存</button>
      </div>
    </div>
  </div>
  <script>
    let currentEditPostId = null;
    
    function openEditModal(postId, content) {
      currentEditPostId = postId;
      document.getElementById('editContent').value = content;
      document.getElementById('editModal').classList.remove('hidden');
      document.getElementById('editContent').focus();
    }
    
    function closeEditModal() {
      document.getElementById('editModal').classList.add('hidden');
      currentEditPostId = null;
    }
    
    document.getElementById('saveEditBtn').addEventListener('click', async function() {
      if (!currentEditPostId) return;
      const content = document.getElementById('editContent').value.trim();
      if (!content) {
        alert('內容不能為空');
        return;
      }
const res = await fetch('/api/posts/' + currentEditPostId, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const result = await res.json();
      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || '編輯失敗');
      }
    });
    
    document.getElementById('editModal').addEventListener('click', function(e) {
      if (e.target === this) closeEditModal();
    });
    
    async function deletePost(postId) {
      if (!confirm('確定要刪除這篇貼文嗎？')) return;
      const res = await fetch('/api/posts/' + postId, { method: 'DELETE', credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || '刪除失敗');
      }
    }
    
    document.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const postId = this.dataset.postId;
        const res = await fetch('/api/like/' + postId, { method: 'POST', credentials: 'include' });
        const result = await res.json();
        if (result.success) {
          this.classList.toggle('liked', result.liked);
          this.querySelector('.like-count').textContent = result.count;
          this.querySelector('svg').setAttribute('fill', result.liked ? '#ff4757' : 'none');
        }
      });
    });

    function formatTimeAgo(dateStr) {
      const date = new Date(dateStr + ' +0800');
      const now = new Date();
      const diff = Math.floor((now - date) / 1000);
      if (diff < 60) return '剛剛';
      if (diff < 3600) return Math.floor(diff / 60) + '分鐘前';
      if (diff < 86400) return Math.floor(diff / 3600) + '小時前';
      if (diff < 604800) return Math.floor(diff / 86400) + '天前';
      return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    document.querySelectorAll('.time[data-time]').forEach(el => {
      el.textContent = '· ' + formatTimeAgo(el.dataset.time);
    });

    setInterval(() => {
      document.querySelectorAll('.time[data-time]').forEach(el => {
        el.textContent = '· ' + formatTimeAgo(el.dataset.time);
      });
    }, 60000);
  </script>
</body>
</html>`;
}

// 渲染單則貼文
async function renderPost(post, currentUserId = null) {
  const escapedContent = db.htmlEscape(post.content);
  const contentWithLinks = db.convertHashtagsToLinks(escapedContent);
  const gradient = db.getAvatarGradient(post.username);
  const timeAgo = db.formatTimeAgo(post.created_at);
  
  let likeCount = 0;
  let isLiked = false;
  
  try {
    const likeData = await db.dbGet('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [post.id]);
    likeCount = likeData?.count || 0;
    if (currentUserId) {
      const userLike = await db.dbGet('SELECT id FROM likes WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
      isLiked = !!userLike;
    }
  } catch (err) {
    console.error('取得讚數失敗:', err);
  }

  return `
    <article class="card post" data-post-id="${post.id}">
      <div class="post-header">
        <div class="avatar" style="background: linear-gradient(135deg, ${gradient});">${post.username[0].toUpperCase()}</div>
        <div class="post-meta">
          <a href="/user/${post.username}" class="username">${db.htmlEscape(post.username)}</a>
          <span class="handle">@${db.htmlEscape(post.username)}</span>
          <span class="time" data-time="${post.created_at}"></span>
        </div>
      </div>
      <div class="post-content">${contentWithLinks}</div>
      ${post.image_url ? `<div class="post-image"><img src="${post.image_url}" alt="image"></div>` : ''}
      <div class="post-actions">
        <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? '#ff4757' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span class="like-count">${likeCount}</span>
        </button>
${currentUserId === post.user_id ? `
          <button class="action-btn delete-btn" onclick="deletePost(${post.id})">刪除</button>
          <button class="action-btn" onclick="openEditModal(${post.id}, \`${db.htmlEscape(post.content).replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">編輯</button>
        ` : ''}
      </div>
    </article>
  `;
}

// 動態 HTML
function authPage(isRegister = false) {
  return pageTemplate(isRegister ? '註冊' : '登入', `
    <div class="auth-page">
      <div class="auth-box">
        <h1 class="auth-title">${isRegister ? '建立帳號' : '歡迎回來'}</h1>
        <div class="error" id="errorMsg"></div>
        <form onsubmit="handleAuth(event, ${isRegister})">
          <div class="form-group">
            <label>使用者名稱</label>
            <input type="text" name="username" required placeholder="輸入使用者名稱">
          </div>
          <div class="form-group">
            <label>密碼</label>
            <input type="password" name="password" required placeholder="輸入密碼" minlength="6">
          </div>
          ${isRegister ? `
          <div class="form-group">
            <label>確認密碼</label>
            <input type="password" name="confirmPassword" required placeholder="再次輸入密碼">
          </div>
          ` : ''}
          <button type="submit" class="btn btn-primary" style="width: 100%;">${isRegister ? '註冊' : '登入'}</button>
        </form>
        <div class="auth-footer">
          ${isRegister 
            ? '已有帳號？<a href="/login">立即登入</a>'
            : '還沒有帳號？<a href="/register">註冊新帳號</a>'}
        </div>
      </div>
    </div>
    <script>
      async function handleAuth(e, isRegister) {
        e.preventDefault();
        const form = e.target;
        const data = {
          username: form.username.value,
          password: form.password.value
        };
        if (isRegister) {
          data.confirmPassword = form.confirmPassword.value;
        }
        const res = await fetch('/api/auth/' + (isRegister ? 'register' : 'login'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
          window.location.href = '/for-you';
        } else {
          document.getElementById('errorMsg').textContent = result.error;
        }
      }
    </script>
  `);
}

function getNavHtml(user) {
  if (!user) {
    return `
      <a href="/login">登入</a>
      <a href="/register">註冊</a>
    `;
  }
  return `
    <a href="/my-posts">我的貼文</a>
    <a href="/api/auth/logout">登出</a>
  `;
}

// ===== 路由 =====

// 首頁導向
app.get('/', (req, res) => {
  res.redirect('/for-you');
});

// 登入頁
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/for-you');
  res.send(authPage(false));
});

// 註冊頁
app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/for-you');
  res.send(authPage(true));
});

// 發文頁（只有登入可見）
app.get('/compose', requireAuth, async (req, res) => {
  console.log('compose page, userId:', req.session.userId);
  res.send(pageTemplate('發文', `
    <div id="debug" style="background:#333;padding:8px;margin-bottom:10px;font-size:12px;color:#0f0;">
      登入者: ${req.session.user?.username} (ID: ${req.session.userId})
    </div>
    <div class="compose-box">
      <form class="compose-form" onsubmit="handleCompose(event)">
        <textarea class="compose-input" name="content" placeholder="在想什麼？#hashtag" required></textarea>
        <button type="submit" class="btn btn-primary">發布</button>
      </form>
    </div>
    <script>
      async function handleCompose(e) {
        e.preventDefault();
        const form = e.target;
        const content = form.content.value.trim();
        if (!content) return alert('內容不能為空');
        
        try {
          const res = await fetch('/api/posts', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
          });
          const result = await res.json();
          if (result.success) {
            window.location.href = '/my-posts';
          } else {
            alert(result.error || '發文失敗');
          }
        } catch(err) {
          alert('錯誤: ' + err);
        }
      }
    </script>
  `, getNavHtml(req.session.user)));
});

// 首頁（大家的貼文）
app.get('/for-you', async (req, res) => {
  try {
    const posts = await db.dbAll(`
      SELECT p.*, u.username 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC 
      LIMIT 50
    `);
    
    const postsHtml = [];
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      try {
        const html = await renderPost(p, req.session.userId);
        if (html) postsHtml.push(html);
      } catch (err) {
        console.error('Render error:', err);
      }
    }
const composeBox = req.session.userId ? `
      <div class="compose-box">
        <form class="compose-form" id="composeForm" enctype="multipart/form-data">
          <textarea class="compose-input" name="content" placeholder="在想什麼？#hashtag" id="contentInput" required></textarea>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <label class="compose-image-btn" style="cursor:pointer;font-size:1.3rem;background:#222;padding:6px 12px;border-radius:8px;color:#666;">+
              <input type="file" name="image" accept="image/*" style="display:none" id="imageInput" onchange="previewImage(this)">
            </label>
            <img class="image-preview" id="imagePreview" style="max-width:60px;max-height:60px;border-radius:8px;display:none;object-fit:cover;">
            <button type="submit" class="btn btn-primary">分享</button>
          </div>
        </form>
      </div>
      <script>
        document.getElementById('composeForm').addEventListener('submit', function(e) {
          e.preventDefault();
          const content = document.getElementById('contentInput').value.trim();
          if (!content) return alert('內容不能為空');
          
          const formData = new FormData(this);
          
          fetch('/api/posts', {
            method: 'POST',
            credentials: 'include',
            body: formData
          }).then(res => res.json()).then(result => {
            if (result.success) {
              window.location.reload();
            } else {
              alert(result.error || '發文失敗');
            }
          }).catch(err => {
            alert('錯誤: ' + err);
          });
        });

        function previewImage(input) {
          const preview = document.getElementById('imagePreview');
          if (input.files && input.files[0]) {
            preview.src = URL.createObjectURL(input.files[0]);
            preview.style.display = 'block';
          }
        }
      </script>
    ` : `
      <div class="card" style="text-align: center; padding: 24px;">
        <p>登入後才能發文</p>
        <a href="/login" class="btn btn-primary" style="margin-top: 12px; display: inline-block;">登入</a>
      </div>
    `;
    
    res.send(pageTemplate('首頁', composeBox + postsHtml.join(''), getNavHtml(req.session.user)));
  } catch (err) {
    console.error('取得貼文失敗:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// 我的貼文
app.get('/my-posts', requireAuth, async (req, res) => {
  try {
    const user = await db.dbGet('SELECT username FROM users WHERE id = ?', [req.session.userId]);
    const posts = await db.dbAll(`
      SELECT p.*, u.username 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.user_id = ? 
      ORDER BY p.created_at DESC
    `, [req.session.userId]);
    
    const postsHtml = await Promise.all(posts.map(p => renderPost(p, req.session.userId)));
    
    res.send(pageTemplate('我的貼文', `
      <h2 style="margin-bottom: 20px;">我的貼文</h2>
      ${postsHtml.length ? postsHtml.join('') : '<div class="empty-state">還沒有發文，快去分享吧！</div>'}
    `, getNavHtml(user)));
  } catch (err) {
    console.error('取得貼文失敗:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// 個人主頁
app.get('/user/:username', async (req, res) => {
  try {
    const user = await db.dbGet('SELECT * FROM users WHERE username = ?', [req.params.username]);
    if (!user) return res.status(404).send(pageTemplate('找不到', '<div class="empty-state">找不到這個用戶</div>'));
    
    const gradient = db.getAvatarGradient(user.username);
    const posts = await db.dbAll(`
      SELECT p.*, u.username 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.user_id = ? 
      ORDER BY p.created_at DESC
    `, [user.id]);
    
    const postsHtml = await Promise.all(posts.map(p => renderPost(p, req.session.userId)));
    
    res.send(pageTemplate(user.username, `
      <div class="profile-header">
        <div class="profile-avatar" style="background: linear-gradient(135deg, ${gradient});">${user.username[0].toUpperCase()}</div>
        <div class="profile-name">${db.htmlEscape(user.username)}</div>
        <div class="profile-handle">@${db.htmlEscape(user.username)} · ${posts.length} 篇貼文</div>
      </div>
      ${postsHtml.join('')}
    `, getNavHtml(req.session.user)));
  } catch (err) {
    console.error('取得用戶失敗:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// 標籤頁
app.get('/tag/:tag', async (req, res) => {
  try {
    const tagName = req.params.tag.toLowerCase();
    const tag = await db.dbGet('SELECT * FROM tags WHERE name = ?', [tagName]);
    if (!tag) {
      return res.send(pageTemplate(`#${tagName}`, `
        <div class="empty-state">找不到 #${db.htmlEscape(tagName)} 這個標籤</div>
      `, getNavHtml(req.session.user)));
    }
    
    const posts = await db.dbAll(`
      SELECT DISTINCT p.*, u.username 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      JOIN post_tags pt ON p.id = pt.post_id 
      WHERE pt.tag_id = ? 
      ORDER BY p.created_at DESC
    `, [tag.id]);
    
    const postsHtml = await Promise.all(posts.map(p => renderPost(p, req.session.userId)));
    
    res.send(pageTemplate(`#${tagName}`, `
      <div class="tag-filter">#${db.htmlEscape(tagName)}</div>
      ${postsHtml.length ? postsHtml.join('') : '<div class="empty-state">還沒有相關貼文</div>'}
    `, getNavHtml(req.session.user)));
  } catch (err) {
    console.error('取得標籤失敗:', err);
    res.status(500).send('伺服器錯誤');
  }
});

// ===== API =====

// 登入
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.json({ success: false, error: '帳號或密碼錯誤' });
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, error: '帳號或密碼錯誤' });
    
    req.session.userId = user.id;
    req.session.user = { id: user.id, username: user.username };
    await new Promise(resolve => req.session.save(resolve));
    res.json({ success: true });
  } catch (err) {
    console.error('登入失敗:', err);
    res.json({ success: false, error: '登入失敗' });
  }
});

// 註冊
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    
    if (password.length < 6) return res.json({ success: false, error: '密碼至少需要 6 個字元' });
    if (password !== confirmPassword) return res.json({ success: false, error: '兩次密碼輸入不一致' });
    
    const existing = await db.dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.json({ success: false, error: '此使用者名稱已被使用' });
    
    const hashed = await bcrypt.hash(password, 10);
    const insertResult = await db.dbRun(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashed]
    );
    
    req.session.userId = insertResult.lastID;
    req.session.user = { id: insertResult.lastID, username };
    await new Promise(resolve => req.session.save(resolve));
    res.json({ success: true });
  } catch (err) {
    console.error('註冊失敗:', err);
    res.json({ success: false, error: '註冊失敗' });
  }
});

// 登出
app.get('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// 發文
app.post('/api/posts', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const content = req.body.content || '';
    if (!content || !content.trim()) {
      return res.json({ success: false, error: '內容不能為空' });
    }
    
    const imageUrl = req.file ? '/uploads/' + req.file.filename : null;
    
    const result = await db.dbRun(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [req.session.userId, content.trim(), imageUrl]
    );
    const postId = result?.lastID;
    if (!postId) {
      return res.json({ success: false, error: '儲存失敗' });
    }
    
    // 解析並儲存標籤
    const tags = db.parseHashtags(content);
    for (const tagName of tags) {
      let tag = await db.dbGet('SELECT id FROM tags WHERE name = ?', [tagName]);
      if (!tag) {
        const tagResult = await db.dbRun('INSERT INTO tags (name) VALUES (?)', [tagName]);
        tag = { id: tagResult.lastID };
      }
      await db.dbRun(
        'INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)',
        [postId, tag.id]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('發文失敗:', err);
    res.json({ success: false, error: '發文失敗' });
  }
});

// 刪除貼文
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.dbRun(
      'DELETE FROM posts WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );
    if (result.changes === 0) return res.status(404).json({ error: '找不到貼文' });
    res.json({ success: true });
  } catch (err) {
    console.error('刪除失敗:', err);
    res.json({ success: false, error: '刪除失敗' });
  }
});

// 編輯貼文
app.put('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content.trim()) return res.json({ success: false, error: '內容不能為空' });
    
    const post = await db.dbGet('SELECT id FROM posts WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
    if (!post) return res.status(404).json({ error: '找不到貼文' });
    
    await db.dbRun('UPDATE posts SET content = ? WHERE id = ?', [content.trim(), req.params.id]);
    
    // 更新標籤
    await db.dbRun('DELETE FROM post_tags WHERE post_id = ?', [req.params.id]);
    const tags = db.parseHashtags(content);
    for (const tagName of tags) {
      let tag = await db.dbGet('SELECT id FROM tags WHERE name = ?', [tagName]);
      if (!tag) {
        const tagResult = await db.dbRun('INSERT INTO tags (name) VALUES (?)', [tagName]);
        tag = { id: tagResult.lastID };
      }
      await db.dbRun('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', [req.params.id, tag.id]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('編輯失敗:', err);
    res.json({ success: false, error: '編輯失敗' });
  }
});

// 按讚/取消讚
app.post('/api/like/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await db.dbGet('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: '找不到貼文' });
    
    const existing = await db.dbGet('SELECT id FROM likes WHERE user_id = ? AND post_id = ?', [req.session.userId, postId]);
    
    if (existing) {
      await db.dbRun('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.session.userId, postId]);
    } else {
      await db.dbRun('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.session.userId, postId]);
    }
    
    const count = await db.dbGet('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);
    res.json({ success: true, liked: !existing, count: count.count });
  } catch (err) {
    console.error('按讚失敗:', err);
    res.json({ success: false, error: '按讚失敗' });
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`MicroBlog 伺服器已啟動 http://localhost:${PORT}`);
});