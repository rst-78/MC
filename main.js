const express = require('express');
const app = express();
const template = require('./template');
const mysql = require('mysql2');
const port = 3000;
const dbConfig = {
    host: 'mysql-201cadad-dubu3412-ad00.i.aivencloud.com',
    user: 'avnadmin',
    password: 'AVNS_xRS8jAytBwpGaGoA2yH',
    database:  'MC',
    port: 24936
};
const db = mysql.createConnection(dbConfig);
app.use(express.urlencoded({ extended: false }));

function menu(callback) {
    db.query('SELECT id, name FROM artist ORDER BY name', function(err, artists) {
        if (err) return callback(err); // [추가 학습/변경] throw 대신 호출한 쪽의 콜백으로 DB 오류를 전달.
        callback(null, template.menu(artists)); // [추가 학습/변경] 첫 인자는 오류(null이면 없음), 두 번째 인자는 메뉴 HTML을 전달.
    });
}
function validPassword(password) { // [추가 학습/변경] 문자열 여부·길이·각 문자를 함께 확인하는 숫자 4자리 검증 함수.
    if (typeof password !== 'string' || password.length !== 4) return false; // [추가 학습/변경] typeof로 입력 타입을 먼저 확인한 뒤 네 자리인지 검사.
    for (let i = 0; i < password.length; i++) {
        if (password[i] < '0' || password[i] > '9') return false; // [추가 학습/변경] 각 문자가 숫자 문자 0~9 범위를 벗어나면 검사 실패.
    }
    return true;
}

app.get('/', function(req, res, next) {
    menu(function(err, menuHtml) {
        if (err) return next(err); // [추가 학습/변경] throw 대신 아래 오류 미들웨어로 전달하고 현재 콜백 종료. 이후 같은 next(err)도 동일.
        res.send(template.html(menuHtml, template.home()));
    });
});
app.get('/album', function(req, res, next) {
    db.query(`SELECT a.id, a.title, r.name AS artist_name
        FROM album a LEFT JOIN artist r ON a.artist_no=r.id
        ORDER BY a.title, a.id`, function(err, albums) {
        if (err) return next(err);
        menu(function(err, menuHtml) {
            if (err) return next(err);
            res.send(template.html(menuHtml, template.albumList(albums)));
        });
    });
});

app.get('/artist/create', function(req, res, next) {
    const parentId = null;
    menu(function(err, menuHtml) {
        if (err) return next(err);
        res.send(template.html(menuHtml, template.artistForm(null, parentId)));
    });
});
app.post('/artist/create', function(req, res, next) {
    if (typeof req.body.name !== 'string' || typeof req.body.description !== 'string') return res.status(400).send(template.message('입력 내용을 확인하세요.')); // [추가 학습/변경] 새 입력 검증: 문자열인지 먼저 확인하여 잘못된 타입의 요청을 거부.
    const name = req.body.name.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    const description = req.body.description.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    if (name.length === 0 || name.length > 30 || description.length > 50) return res.status(400).send(template.message('이름/제목은 1~30자, 설명은 50자 이하입니다.'));
    db.query('INSERT INTO artist (name, description) VALUES (?, ?)', [name, description], function(err, results) {
        if (err) return next(err);
        res.redirect(`/artist/${results.insertId}`);
    });
});
app.post('/artist/update', function(req, res, next) {
    if (req.body.passwd !== '1899') return res.status(403).send(template.message('공통 비밀번호가 일치하지 않습니다.'));
    const id = Number(req.body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    if (typeof req.body.name !== 'string' || typeof req.body.description !== 'string') return res.status(400).send(template.message('입력 내용을 확인하세요.')); // [추가 학습/변경] 새 입력 검증: 문자열인지 먼저 확인하여 잘못된 타입의 요청을 거부.
    const name = req.body.name.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    const description = req.body.description.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    if (name.length === 0 || name.length > 30 || description.length > 50) return res.status(400).send(template.message('이름/제목은 1~30자, 설명은 50자 이하입니다.'));
    db.query('UPDATE artist SET name=?, description=? WHERE id=?', [name, description, id], function(err, results) {
        if (err) return next(err);
        if (results.affectedRows === 0) return res.status(404).send(template.message('항목이 없습니다.')); // [추가 학습/변경] UPDATE 처리 결과에서 대상 행이 있었는지 확인. SELECT의 results 배열과 다름.
        res.redirect(`/artist/${id}`);
    });
});
app.get('/artist/:id/update', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query('SELECT * FROM artist WHERE id=?', [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('항목이 없습니다.'));
        menu(function(err, menuHtml) {
            if (err) return next(err);
            res.send(template.html(menuHtml, template.artistForm(results[0])));
        });
    });
});
app.get('/artist/:id/delete', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query('SELECT * FROM artist WHERE id=?', [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('항목이 없습니다.'));
        menu(function(err, menuHtml) {
            if (err) return next(err);
            res.send(template.html(menuHtml, template.artistDelete(results[0])));
        });
    });
});

app.post('/artist/delete', function(req, res, next) {
    if (req.body.passwd !== '1899') return res.status(403).send(template.message('공통 비밀번호가 일치하지 않습니다.'));
    const id = Number(req.body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    const connection = mysql.createConnection(dbConfig); // [생성형 AI 활용] 여러 DELETE를 묶는 전용 연결. 다른 요청의 SQL과 트랜잭션이 섞이지 않게 분리.
    function cancel(err) {
        connection.rollback(function() { connection.end(); next(err); }); // [생성형 AI 활용] 확정 전 변경을 취소한 뒤 전용 연결을 닫고 오류 또는 404 응답을 전달.
    }
    connection.beginTransaction(function(err) { // [생성형 AI 활용] 여러 삭제를 하나의 작업으로 시작. 전부 성공하면 commit, 실패하면 rollback.
        if (err) { connection.end(); return next(err); }
        connection.query('SELECT * FROM artist WHERE id=? FOR UPDATE', [id], function(err, results) { // [생성형 AI 활용] 트랜잭션 동안 선택한 행의 변경 충돌을 조정하는 잠금. 자식 행 전체를 자동으로 잠그지는 않음.
            if (err) return cancel(err); // [생성형 AI 활용] 삭제 중 오류를 cancel로 보내 rollback. 아래의 같은 호출도 동일한 처리.
            if (results.length === 0) {
                return connection.rollback(function() { connection.end(); res.status(404).send(template.message('항목이 없습니다.')); }); // [생성형 AI 활용] 확정 전 변경을 취소한 뒤 전용 연결을 닫고 오류 또는 404 응답을 전달.
            }
            const item = results[0];
            connection.query('DELETE c FROM comment c LEFT JOIN track t ON c.track_no=t.id LEFT JOIN album a ON a.id=c.album_no OR a.id=t.album_no WHERE a.artist_no=?', [id], function(err) { // [추가 학습/변경] DELETE c FROM ... JOIN은 연결 조건으로 대상을 찾고 comment(c) 행만 삭제.
                if (err) return cancel(err);
                connection.query('DELETE t FROM track t JOIN album a ON t.album_no=a.id WHERE a.artist_no=?', [id], function(err) { // [추가 학습/변경] JOIN으로 소속 앨범을 확인하고 track(t) 행만 삭제.
                    if (err) return cancel(err);
                    connection.query('DELETE FROM album WHERE artist_no=?', [id], function(err) {
                        if (err) return cancel(err);
                        connection.query('DELETE FROM artist WHERE id=?', [id], function(err) {
                            if (err) return cancel(err);
                connection.commit(function(err) { // [생성형 AI 활용] 앞선 모든 삭제가 성공한 경우에만 DB 변경을 확정.
                    if (err) return cancel(err);
                    connection.end(); // [생성형 AI 활용] 일괄 삭제용 연결 종료. 공통 db 연결은 유지.
                    res.redirect('/');
                });
                        });
                    });
                });
            });
        });
    });
});

app.get('/album/create', function(req, res, next) {
    const parentId = Number(req.query.artist_no); // [추가 학습/변경] 주소의 ? 뒤 상위 번호를 읽음. req.params(경로), req.body(폼 제출)와 구분.
    if (!Number.isInteger(parentId) || parentId <= 0) return res.status(400).send(template.message('상위 항목을 확인하세요.'));
    db.query('SELECT id FROM artist WHERE id=?', [parentId], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('상위 항목이 없습니다.'));
    menu(function(err, menuHtml) {
        if (err) return next(err);
        res.send(template.html(menuHtml, template.albumForm(null, parentId)));
    });
    });
});
app.post('/album/create', function(req, res, next) {
    if (typeof req.body.title !== 'string' || typeof req.body.description !== 'string') return res.status(400).send(template.message('입력 내용을 확인하세요.')); // [추가 학습/변경] 새 입력 검증: 문자열인지 먼저 확인하여 잘못된 타입의 요청을 거부.
    const title = req.body.title.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    const description = req.body.description.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    if (title.length === 0 || title.length > 30 || description.length > 50) return res.status(400).send(template.message('이름/제목은 1~30자, 설명은 50자 이하입니다.'));
    const parentId = Number(req.body.artist_no);
    if (!Number.isInteger(parentId) || parentId <= 0) return res.status(400).send(template.message('상위 항목을 확인하세요.'));
    db.query('SELECT id FROM artist WHERE id=?', [parentId], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('상위 항목이 없습니다.'));
    db.query('INSERT INTO album (title, description, artist_no) VALUES (?, ?, ?)', [title, description, parentId], function(err, results) {
        if (err) return next(err);
        res.redirect(`/album/${results.insertId}`);
    });
    });
});
app.post('/album/update', function(req, res, next) {
    if (req.body.passwd !== '1899') return res.status(403).send(template.message('공통 비밀번호가 일치하지 않습니다.'));
    const id = Number(req.body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    if (typeof req.body.title !== 'string' || typeof req.body.description !== 'string') return res.status(400).send(template.message('입력 내용을 확인하세요.')); // [추가 학습/변경] 새 입력 검증: 문자열인지 먼저 확인하여 잘못된 타입의 요청을 거부.
    const title = req.body.title.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    const description = req.body.description.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    if (title.length === 0 || title.length > 30 || description.length > 50) return res.status(400).send(template.message('이름/제목은 1~30자, 설명은 50자 이하입니다.'));
    db.query('UPDATE album SET title=?, description=? WHERE id=?', [title, description, id], function(err, results) {
        if (err) return next(err);
        if (results.affectedRows === 0) return res.status(404).send(template.message('항목이 없습니다.')); // [추가 학습/변경] UPDATE 처리 결과에서 대상 행이 있었는지 확인. SELECT의 results 배열과 다름.
        res.redirect(`/album/${id}`);
    });
});
app.get('/album/:id/update', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query('SELECT * FROM album WHERE id=?', [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('항목이 없습니다.'));
        menu(function(err, menuHtml) {
            if (err) return next(err);
            res.send(template.html(menuHtml, template.albumForm(results[0])));
        });
    });
});
app.get('/album/:id/delete', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query('SELECT * FROM album WHERE id=?', [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('항목이 없습니다.'));
        menu(function(err, menuHtml) {
            if (err) return next(err);
            res.send(template.html(menuHtml, template.albumDelete(results[0])));
        });
    });
});
app.post('/album/delete', function(req, res, next) {
    if (req.body.passwd !== '1899') return res.status(403).send(template.message('공통 비밀번호가 일치하지 않습니다.'));
    const id = Number(req.body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    const connection = mysql.createConnection(dbConfig); // [생성형 AI 활용] 여러 DELETE를 묶는 전용 연결. 다른 요청의 SQL과 트랜잭션이 섞이지 않게 분리.
    function cancel(err) {
        connection.rollback(function() { connection.end(); next(err); }); // [생성형 AI 활용] 확정 전 변경을 취소한 뒤 전용 연결을 닫고 오류 또는 404 응답을 전달.
    }
    connection.beginTransaction(function(err) { // [생성형 AI 활용] 여러 삭제를 하나의 작업으로 시작. 전부 성공하면 commit, 실패하면 rollback.
        if (err) { connection.end(); return next(err); }
        connection.query('SELECT * FROM album WHERE id=? FOR UPDATE', [id], function(err, results) { // [생성형 AI 활용] 트랜잭션 동안 선택한 행의 변경 충돌을 조정하는 잠금. 자식 행 전체를 자동으로 잠그지는 않음.
            if (err) return cancel(err);
            if (results.length === 0) {
                return connection.rollback(function() { connection.end(); res.status(404).send(template.message('항목이 없습니다.')); }); // [생성형 AI 활용] 확정 전 변경을 취소한 뒤 전용 연결을 닫고 오류 또는 404 응답을 전달.
            }
            const item = results[0];
            connection.query('DELETE c FROM comment c LEFT JOIN track t ON c.track_no=t.id WHERE c.album_no=? OR t.album_no=?', [id, id], function(err) { // [추가 학습/변경] DELETE c FROM ... JOIN은 연결 조건으로 대상을 찾고 comment(c) 행만 삭제.
                if (err) return cancel(err);
                connection.query('DELETE FROM track WHERE album_no=?', [id], function(err) {
                    if (err) return cancel(err);
                    connection.query('DELETE FROM album WHERE id=?', [id], function(err) {
                        if (err) return cancel(err);
                connection.commit(function(err) { // [생성형 AI 활용] 앞선 모든 삭제가 성공한 경우에만 DB 변경을 확정.
                    if (err) return cancel(err);
                    connection.end(); // [생성형 AI 활용] 일괄 삭제용 연결 종료. 공통 db 연결은 유지.
                    res.redirect(`/artist/${item.artist_no}`);
                });
                    });
                });
            });
        });
    });
});

app.get('/track/create', function(req, res, next) {
    const parentId = Number(req.query.album_no); // [추가 학습/변경] 주소의 ? 뒤 상위 번호를 읽음. req.params(경로), req.body(폼 제출)와 구분.
    if (!Number.isInteger(parentId) || parentId <= 0) return res.status(400).send(template.message('상위 항목을 확인하세요.'));
    db.query('SELECT id FROM album WHERE id=?', [parentId], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('상위 항목이 없습니다.'));
    menu(function(err, menuHtml) {
        if (err) return next(err);
        res.send(template.html(menuHtml, template.trackForm(null, parentId)));
    });
    });
});
app.post('/track/create', function(req, res, next) {
    if (typeof req.body.title !== 'string' || typeof req.body.description !== 'string') return res.status(400).send(template.message('입력 내용을 확인하세요.')); // [추가 학습/변경] 새 입력 검증: 문자열인지 먼저 확인하여 잘못된 타입의 요청을 거부.
    const title = req.body.title.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    const description = req.body.description.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    if (title.length === 0 || title.length > 30 || description.length > 50) return res.status(400).send(template.message('이름/제목은 1~30자, 설명은 50자 이하입니다.'));
    const parentId = Number(req.body.album_no);
    if (!Number.isInteger(parentId) || parentId <= 0) return res.status(400).send(template.message('상위 항목을 확인하세요.'));
    db.query('SELECT id FROM album WHERE id=?', [parentId], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('상위 항목이 없습니다.'));
    db.query('INSERT INTO track (title, description, album_no) VALUES (?, ?, ?)', [title, description, parentId], function(err, results) {
        if (err) return next(err);
        res.redirect(`/track/${results.insertId}`);
    });
    });
});
app.post('/track/update', function(req, res, next) {
    if (req.body.passwd !== '1899') return res.status(403).send(template.message('공통 비밀번호가 일치하지 않습니다.'));
    const id = Number(req.body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    if (typeof req.body.title !== 'string' || typeof req.body.description !== 'string') return res.status(400).send(template.message('입력 내용을 확인하세요.')); // [추가 학습/변경] 새 입력 검증: 문자열인지 먼저 확인하여 잘못된 타입의 요청을 거부.
    const title = req.body.title.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    const description = req.body.description.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    if (title.length === 0 || title.length > 30 || description.length > 50) return res.status(400).send(template.message('이름/제목은 1~30자, 설명은 50자 이하입니다.'));
    db.query('UPDATE track SET title=?, description=? WHERE id=?', [title, description, id], function(err, results) {
        if (err) return next(err);
        if (results.affectedRows === 0) return res.status(404).send(template.message('항목이 없습니다.')); // [추가 학습/변경] UPDATE 처리 결과에서 대상 행이 있었는지 확인. SELECT의 results 배열과 다름.
        res.redirect(`/track/${id}`);
    });
});
app.get('/track/:id/update', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query('SELECT * FROM track WHERE id=?', [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('항목이 없습니다.'));
        menu(function(err, menuHtml) {
            if (err) return next(err);
            res.send(template.html(menuHtml, template.trackForm(results[0])));
        });
    });
});
app.get('/track/:id/delete', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query('SELECT * FROM track WHERE id=?', [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('항목이 없습니다.'));
        menu(function(err, menuHtml) {
            if (err) return next(err);
            res.send(template.html(menuHtml, template.trackDelete(results[0])));
        });
    });
});
app.post('/track/delete', function(req, res, next) {
    if (req.body.passwd !== '1899') return res.status(403).send(template.message('공통 비밀번호가 일치하지 않습니다.'));
    const id = Number(req.body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    const connection = mysql.createConnection(dbConfig); // [생성형 AI 활용] 여러 DELETE를 묶는 전용 연결. 다른 요청의 SQL과 트랜잭션이 섞이지 않게 분리.
    function cancel(err) {
        connection.rollback(function() { connection.end(); next(err); }); // [생성형 AI 활용] 확정 전 변경을 취소한 뒤 전용 연결을 닫고 오류 또는 404 응답을 전달.
    }
    connection.beginTransaction(function(err) { // [생성형 AI 활용] 여러 삭제를 하나의 작업으로 시작. 전부 성공하면 commit, 실패하면 rollback.
        if (err) { connection.end(); return next(err); }
        connection.query('SELECT * FROM track WHERE id=? FOR UPDATE', [id], function(err, results) { // [생성형 AI 활용] 트랜잭션 동안 선택한 행의 변경 충돌을 조정하는 잠금. 자식 행 전체를 자동으로 잠그지는 않음.
            if (err) return cancel(err);
            if (results.length === 0) {
                return connection.rollback(function() { connection.end(); res.status(404).send(template.message('항목이 없습니다.')); }); // [생성형 AI 활용] 확정 전 변경을 취소한 뒤 전용 연결을 닫고 오류 또는 404 응답을 전달.
            }
            const item = results[0];
            connection.query('DELETE FROM comment WHERE track_no=?', [id], function(err) {
                if (err) return cancel(err);
                connection.query('DELETE FROM track WHERE id=?', [id], function(err) {
                    if (err) return cancel(err);
                connection.commit(function(err) { // [생성형 AI 활용] 앞선 모든 삭제가 성공한 경우에만 DB 변경을 확정.
                    if (err) return cancel(err);
                    connection.end(); // [생성형 AI 활용] 일괄 삭제용 연결 종료. 공통 db 연결은 유지.
                    res.redirect(`/album/${item.album_no}`);
                });
                });
            });
        });
    });
});

app.get('/artist/:id', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query('SELECT * FROM artist WHERE id=?', [id], function(err, artists) {
        if (err) return next(err);
        if (artists.length === 0) return res.status(404).send(template.message('아티스트가 없습니다.'));
        db.query(/* [추가 학습/변경] DISTINCT로 JOIN 중복 id를 제외해 트랙·댓글 수를 집계. */ `SELECT a.id, a.title, COUNT(DISTINCT t.id) AS track_count,
            COUNT(DISTINCT c.id) AS comment_count FROM album a
            LEFT JOIN track t ON t.album_no=a.id
            LEFT JOIN comment c ON c.album_no=a.id
            WHERE a.artist_no=? GROUP BY a.id, a.title ORDER BY a.title`, [id], function(err, albums) {
            if (err) return next(err);
            menu(function(err, menuHtml) {
                if (err) return next(err);
                res.send(template.html(menuHtml, template.artist(artists[0], albums)));
            });
        });
    });
});
app.get('/album/:id', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query(`SELECT a.*, r.name AS artist_name FROM album a
        JOIN artist r ON a.artist_no=r.id WHERE a.id=?`, [id], function(err, albums) {
        if (err) return next(err);
        if (albums.length === 0) return res.status(404).send(template.message('앨범이 없습니다.'));
        db.query(`SELECT t.id, t.title, COUNT(c.id) AS comment_count FROM track t
            LEFT JOIN comment c ON c.track_no=t.id WHERE t.album_no=?
            GROUP BY t.id, t.title ORDER BY t.id`, [id], function(err, tracks) {
            if (err) return next(err);
            db.query('SELECT id, comment FROM comment WHERE album_no=? ORDER BY id DESC', [id], function(err, comments) {
                if (err) return next(err);
                menu(function(err, menuHtml) {
                    if (err) return next(err);
                    res.send(template.html(menuHtml, template.album(albums[0], tracks, comments)));
                });
            });
        });
    });
});
app.get('/track/:id', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query(`SELECT t.*, a.title AS album_title, a.artist_no, r.name AS artist_name
        FROM track t JOIN album a ON t.album_no=a.id
        JOIN artist r ON a.artist_no=r.id WHERE t.id=?`, [id], function(err, tracks) {
        if (err) return next(err);
        if (tracks.length === 0) return res.status(404).send(template.message('트랙이 없습니다.'));
        db.query('SELECT id, comment FROM comment WHERE track_no=? ORDER BY id DESC', [id], function(err, comments) {
            if (err) return next(err);
            menu(function(err, menuHtml) {
                if (err) return next(err);
                res.send(template.html(menuHtml, template.track(tracks[0], comments)));
            });
        });
    });
});

app.post('/comment/create', function(req, res, next) {
    const kind = req.body.kind;
    const id = Number(req.body.target);
    if (kind !== 'album' && kind !== 'track') {
        return res.status(400).send(template.message('댓글 대상을 확인하세요.'));
    }
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send(template.message('잘못된 번호입니다.'));
    }
    if (typeof req.body.comment !== 'string') { // [추가 학습/변경] 새 입력 검증: 문자열인지 먼저 확인하여 잘못된 타입의 요청을 거부.
        return res.status(400).send(template.message('댓글을 입력하세요.'));
    }
    const content = req.body.comment.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    if (content.length === 0 || content.length > 100) {
        return res.status(400).send(template.message('댓글은 1~100자로 입력하세요.'));
    }
    if (!validPassword(req.body.passwd)) {
        return res.status(400).send(template.message('비밀번호는 숫자 4자리입니다.'));
    }
    const passwd = Number(req.body.passwd);
    let albumNo = null;
    let trackNo = null;
    let sql = 'SELECT id FROM album WHERE id=?';
    if (kind === 'album') {
        albumNo = id;
    } else {
        trackNo = id;
        sql = 'SELECT id FROM track WHERE id=?';
    }
    db.query(sql, [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('댓글 대상이 없습니다.'));
        db.query('INSERT INTO comment (comment, album_no, track_no, passwd) VALUES (?, ?, ?, ?)',
            [content, albumNo, trackNo, passwd], function(err, results) {
                if (err) return next(err);
                if (albumNo !== null) {
                    res.redirect(`/album/${albumNo}`);
                } else {
                    res.redirect(`/track/${trackNo}`);
                }
            });
    });
});

app.get('/comment/:id/update', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query('SELECT id, comment, album_no, track_no FROM comment WHERE id=?', [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('댓글이 없습니다.'));
        const comment = results[0];
        menu(function(err, menuHtml) {
            if (err) return next(err);
            res.send(template.html(menuHtml, template.update(comment)));
        });
    });
});
app.post('/comment/update', function(req, res, next) {
    const id = Number(req.body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    if (!validPassword(req.body.passwd)) return res.status(400).send(template.message('비밀번호는 숫자 4자리입니다.'));
    const passwd = Number(req.body.passwd);
    if (typeof req.body.comment !== 'string') return res.status(400).send(template.message('댓글을 입력하세요.')); // [추가 학습/변경] 새 입력 검증: 문자열인지 먼저 확인하여 잘못된 타입의 요청을 거부.
    const content = req.body.comment.trim(); // [추가 학습/변경] 입력 문자열의 앞뒤 공백 제거. 공백만 있는 입력은 빈 문자열이 됨.
    if (content.length === 0 || content.length > 100) return res.status(400).send(template.message('댓글은 1~100자로 입력하세요.'));
    db.query('SELECT * FROM comment WHERE id=?', [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('댓글이 없습니다.'));
        const comment = results[0];
        if (passwd !== comment.passwd) return res.status(403).send(template.message('비밀번호가 일치하지 않습니다.'));
        db.query('UPDATE comment SET comment=? WHERE id=?', [content, id], function(err, results) {
            if (err) return next(err);
            if (comment.album_no !== null) {
                res.redirect(`/album/${comment.album_no}`);
            } else {
                res.redirect(`/track/${comment.track_no}`);
            }
        });
    });
});

app.get('/comment/:id/delete', function(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    db.query('SELECT id, comment, album_no, track_no FROM comment WHERE id=?', [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('댓글이 없습니다.'));
        const comment = results[0];
        menu(function(err, menuHtml) {
            if (err) return next(err);
            res.send(template.html(menuHtml, template.delete(comment)));
        });
    });
});
app.post('/comment/delete', function(req, res, next) {
    const id = Number(req.body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send(template.message('잘못된 번호입니다.'));
    if (!validPassword(req.body.passwd)) return res.status(400).send(template.message('비밀번호는 숫자 4자리입니다.'));
    const passwd = Number(req.body.passwd);
    db.query('SELECT * FROM comment WHERE id=?', [id], function(err, results) {
        if (err) return next(err);
        if (results.length === 0) return res.status(404).send(template.message('댓글이 없습니다.'));
        const comment = results[0];
        if (passwd !== comment.passwd) return res.status(403).send(template.message('비밀번호가 일치하지 않습니다.'));
        db.query('DELETE FROM comment WHERE id=?', [id], function(err, results) {
            if (err) return next(err);
            if (comment.album_no !== null) {
                res.redirect(`/album/${comment.album_no}`);
            } else {
                res.redirect(`/track/${comment.track_no}`);
            }
        });
    });
});

app.use(function(req, res) { // [생성형 AI 활용] 앞의 경로에서 처리하지 못한 요청에 404를 보내는 마지막 일반 미들웨어.
    res.status(404).send(template.message('없는 페이지입니다.'));
});
app.use(function(err, req, res, next) { // [생성형 AI 활용] 인자 네 개인 Express 오류 미들웨어. next(err)로 전달된 오류를 받음.
    console.error(err.message);
    res.status(500).send(template.html('', template.message('DB 처리 중 오류가 발생했습니다.')));
});
db.connect(function(err) { // [생성형 AI 활용] 원본과 달리 DB 연결 성공 콜백 안에서 웹 서버를 시작.
    if (err) { console.error('DB 연결 실패:', err.message); process.exitCode = 1; return; } // [생성형 AI 활용] 연결 실패 시 비정상 종료 코드를 지정하고 서버 시작을 중단.
    app.listen(port, function() { console.log(`server running on PORT ${port}`); });
});
