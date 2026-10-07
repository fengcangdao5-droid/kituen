const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL 接続設定
const db = mysql.createConnection({
    host: '127.0.0.1',
    port: 65534,
    user: 'root',
    password: 'pass', // ★ご自身のMySQLパスワードに変更してください
    database: 'smoking_map_db'
});

db.connect((err) => {
    if (err) {
        console.error('❌ MySQL 接続エラー:', err.message);
    } else {
        console.log('✅ MySQL に正常接続しました！');
    }
});

// ====== ログイン API ======
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'ユーザー名とパスワードを入力してください' });
    }

    const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    db.query(checkUserQuery, [username], (err, results) => {
        if (err) return res.status(500).json({ message: 'データベースエラーが発生しました' });

        if (results.length === 0) {
            return res.status(401).json({ message: '該当するユーザーが見つかりません' });
        }

        const user = results[0];

        if (user.password !== password) {
            return res.status(401).json({ message: 'パスワードが違います' });
        }

        res.status(200).json({ message: 'ログイン成功', user: { id: user.id, username: user.username } });
    });
});

// ====== 新規ユーザー登録 API ======
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'ユーザー名とパスワードを入力してください' });
    }

    const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    db.query(checkUserQuery, [username], (err, results) => {
        if (err) return res.status(500).json({ message: 'データベースエラーが発生しました' });

        if (results.length > 0) {
            return res.status(400).json({ message: 'そのユーザー名は既に使われています' });
        }

        const insertUserQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(insertUserQuery, [username, password], (err, result) => {
            if (err) return res.status(500).json({ message: 'ユーザー登録に失敗しました' });

            res.status(201).json({ message: 'ユーザー登録が完了しました！' });
        });
    });
});

// ====== お気に入り場所 API ======

// 取得
app.get('/api/favorites/places/:userId', (req, res) => {
    const { userId } = req.params;
    const query = 'SELECT * FROM favorite_places WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'DBエラー' });
        res.json(results);
    });
});

// 追加
app.post('/api/favorites/places', (req, res) => {
    const { userId, placeId, name, lat, lon, memo } = req.body;
    const query = 'INSERT INTO favorite_places (user_id, place_id, name, lat, lon, memo) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [userId, placeId, name, lat, lon, memo], (err, result) => {
        if (err) return res.status(500).json({ message: '保存エラー' });
        res.json({ message: '保存しました' });
    });
});

// 削除
app.delete('/api/favorites/places', (req, res) => {
    const { userId, placeId } = req.body;
    const query = 'DELETE FROM favorite_places WHERE user_id = ? AND place_id = ?';
    db.query(query, [userId, placeId], (err, result) => {
        if (err) return res.status(500).json({ message: '削除エラー' });
        res.json({ message: '削除しました' });
    });
});

// ====== お気に入り銘柄 API ======

// 取得
app.get('/api/favorites/brands/:userId', (req, res) => {
    const { userId } = req.params;
    const query = 'SELECT * FROM favorite_brands WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'DBエラー' });
        res.json(results);
    });
});

// 追加
app.post('/api/favorites/brands', (req, res) => {
    const { userId, name, company, price, desc } = req.body;
    const query = 'INSERT INTO favorite_brands (user_id, name, company, price, description) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [userId, name, company, price, desc], (err, result) => {
        if (err) return res.status(500).json({ message: '保存エラー' });
        res.json({ message: '銘柄を追加しました', id: result.insertId });
    });
});

// 削除
app.delete('/api/favorites/brands/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM favorite_brands WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ message: '削除エラー' });
        res.json({ message: '削除しました' });
    });
});

// ====== ユーザー独自・新規喫煙所 API (新機能追加部分) ======

// 1. 指定ユーザーの登録した独自喫煙所一覧を取得
app.get('/api/custom-places/:userId', (req, res) => {
    const { userId } = req.params;
    const query = 'SELECT * FROM custom_places WHERE user_id = ? ORDER BY created_at DESC';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('❌ 独自喫煙所取得エラー:', err.sqlMessage || err);
            return res.status(500).json({ message: 'DBエラーが発生しました' });
        }
        res.json(results);
    });
});

// 2. 新規喫煙所を保存
app.post('/api/custom-places', (req, res) => {
    const { userId, memo, lat, lon } = req.body;

    if (!userId || !memo || !lat || !lon) {
        return res.status(400).json({ message: '必要なデータが不足しています' });
    }

    const query = 'INSERT INTO custom_places (user_id, memo, lat, lon) VALUES (?, ?, ?, ?)';
    db.query(query, [userId, memo, lat, lon], (err, result) => {
        if (err) {
            console.error('❌ 独自喫煙所保存エラー:', err.sqlMessage || err);
            return res.status(500).json({ message: 'DB保存エラーが発生しました' });
        }
        console.log(`✅ 独自喫煙所追加成功: ユーザー ${userId} -> ${memo}`);
        res.status(201).json({ message: '独自喫煙所を登録しました！', id: result.insertId });
    });
});

// 3. 独自喫煙所を削除
app.delete('/api/custom-places/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM custom_places WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('❌ 独自喫煙所削除エラー:', err.sqlMessage || err);
            return res.status(500).json({ message: 'DB削除エラーが発生しました' });
        }
        res.json({ message: '削除しました' });
    });
});

// ====== 混雑状況 API (1人30分に1回制限・DBカラム対応版) ======

// 1. 混雑報告の投稿 API（1人30分に1回制限付き）
app.post('/api/congestion', (req, res) => {
    const { userId, placeId, status } = req.body;

    if (!userId || !placeId || !status) {
        return res.status(400).json({ message: '必要なデータが不足しています' });
    }

    // 同一ユーザーによる過去30分以内の投稿があるか確認
    const checkQuery = `
        SELECT * FROM congestion_reports 
        WHERE user_id = ? AND smoking_area_id = ? AND created_at >= NOW() - INTERVAL 30 MINUTE
    `;

    db.query(checkQuery, [userId, placeId], (err, results) => {
        if (err) {
            console.error('❌ 重複チェックエラー:', err.sqlMessage || err);
            return res.status(500).json({ message: 'データベースエラーが発生しました' });
        }

        if (results.length > 0) {
            return res.status(429).json({ message: '混雑状況の報告は30分に1回までです。しばらく時間を置いてから再度お試しください。' });
        }

        // 文字列を数値に変換 (smooth -> 1, normal -> 2, crowded -> 3)
        let statusValue = 2;
        if (status === 'smooth') statusValue = 1;
        if (status === 'normal') statusValue = 2;
        if (status === 'crowded') statusValue = 3;

        // データベースへ保存 (user_id, smoking_area_id, status_value)
        const insertQuery = 'INSERT INTO congestion_reports (user_id, smoking_area_id, status_value) VALUES (?, ?, ?)';
        db.query(insertQuery, [userId, placeId, statusValue], (err, result) => {
            if (err) {
                console.error('❌ DB保存エラー:', err.sqlMessage || err);
                return res.status(500).json({ message: 'DB保存エラー' });
            }
            console.log(`✅ 混雑報告保存成功: ユーザー ${userId} -> 喫煙所 ${placeId} (値: ${statusValue})`);
            res.status(201).json({ message: '混雑状況を報告しました！' });
        });
    });
});

// 2. 混雑統計の取得 API (直近2時間の平均値を計算)
app.get('/api/congestion/:placeId', (req, res) => {
    const { placeId } = req.params;

    const query = `
        SELECT AVG(status_value) as avg_status, COUNT(*) as total_reports 
        FROM congestion_reports 
        WHERE smoking_area_id = ? AND created_at >= NOW() - INTERVAL 2 HOUR
    `;

    db.query(query, [placeId], (err, results) => {
        if (err) {
            console.error('❌ DB取得エラー:', err.sqlMessage || err);
            return res.status(500).json({ message: 'DBエラー' });
        }

        const row = results[0];
        const total = row ? row.total_reports : 0;
        let summary = 'データなし';

        if (total > 0 && row.avg_status !== null) {
            const avg = parseFloat(row.avg_status);
            if (avg < 1.6) {
                summary = '🔵 空いている';
            } else if (avg <= 2.4) {
                summary = '🟡 普通';
            } else {
                summary = '🔴 混雑';
            }
        }

        res.json({
            summary: summary,
            totalReports: total
        });
    });
});

app.listen(3000, () => {
    console.log('🚀 サーバーがポート 3000 で起動しました');
});