// [추가 학습/변경] 기존 template 객체 구조를 유지하고 모든 HTML을 이 파일에 작성.
// 화면에 표시할 사용자 입력의 특수 문자를 바꿔 태그/스크립트 실행을 방지.
function escape(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
module.exports = {
    html(menu, body) {
        return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1"><title>뮤직코멘트</title></head>
            <body><h1><a href="/">뮤직코멘트</a></h1><nav>${menu}</nav><hr><main>${body}</main></body></html>`;
    },
    menu(artists) {
        let list = '<h2>아티스트 목록</h2><ul>';
        for (let i = 0; i < artists.length; i++) {
            list += `<li><a href="/artist/${artists[i].id}">${escape(artists[i].name)}</a></li>`;
        }
        return list + (artists.length ? '' : '<li>등록된 아티스트가 없습니다.</li>') + '</ul><a href="/artist/create">아티스트 추가</a><p><a href="/album">전체 앨범</a></p>';
    },
    home() { return '<h2>음악 조회와 댓글</h2><p>아티스트를 선택하고 앨범과 트랙을 둘러보세요. 앨범과 트랙에 댓글을 남길 수 있습니다.</p>'; },
    message(text) { return `<p>${escape(text)}</p><p><a href="/">홈으로</a> · 브라우저 뒤로 가기로 돌아가 다시 입력할 수 있습니다.</p>`; },
    artist(artist, albums) {
        let body = `<h2>${escape(artist.name)}</h2><p>${escape(artist.description)}</p>${this.manage('artist', artist.id)}<h3>앨범</h3><ul>`;
        for (let i = 0; i < albums.length; i++) {
            body += `<li><a href="/album/${albums[i].id}">${escape(albums[i].title)}</a> — 트랙 ${albums[i].track_count}개 / 앨범 댓글 ${albums[i].comment_count}개</li>`;
        }
        return body + (albums.length ? '' : '<li>등록된 앨범이 없습니다.</li>') + `</ul><a href="/album/create?artist_no=${artist.id}">앨범 추가</a>`;
    },
    // [추가 학습/변경] 전체 앨범 목록 HTML도 template에서 생성.
    albumList(albums) {
        let body = '<h2>전체 앨범</h2><ul>';
        for (let i = 0; i < albums.length; i++) {
            body += `<li><a href="/album/${albums[i].id}">${escape(albums[i].title)}</a> — ${escape(albums[i].artist_name)}</li>`;
        }
        if (albums.length === 0) {
            body += '<li>등록된 앨범이 없습니다.</li>';
        }
        return body + '</ul>';
    },
    album(album, tracks, comments) {
        let body = `<h2>${escape(album.title)}</h2><p>아티스트: <a href="/artist/${album.artist_no}">${escape(album.artist_name)}</a></p>
            <p>${escape(album.description)}</p>${this.manage('album', album.id)}<h3>트랙 ${tracks.length}개</h3><ul>`;
        for (let i = 0; i < tracks.length; i++) {
            body += `<li><a href="/track/${tracks[i].id}">${escape(tracks[i].title)}</a> — 댓글 ${tracks[i].comment_count}개</li>`;
        }
        return body + (tracks.length ? '' : '<li>등록된 트랙이 없습니다.</li>') + `</ul><a href="/track/create?album_no=${album.id}">트랙 추가</a>` + this.comments(comments, 'album', album.id);
    },
    track(track, comments) {
        return `<h2>${escape(track.title)}</h2><p>아티스트: <a href="/artist/${track.artist_no}">${escape(track.artist_name)}</a></p>
            <p>앨범: <a href="/album/${track.album_no}">${escape(track.album_title)}</a></p><p>${escape(track.description)}</p>`
            + this.manage('track', track.id) + this.comments(comments, 'track', track.id);
    },
    // [추가 학습/변경] 앨범/트랙 화면에서 같은 댓글 폼을 재사용.
    comments(comments, kind, id) {
        let body = `<h3>댓글 ${comments.length}개</h3><ul>`;
        for (let i = 0; i < comments.length; i++) {
            body += `<li><p style="white-space:pre-wrap">${escape(comments[i].comment)}</p>
                <a href="/comment/${comments[i].id}/update">수정</a> <a href="/comment/${comments[i].id}/delete">삭제</a></li>`;
        }
        return body + (comments.length ? '' : '<li>첫 댓글을 남겨보세요.</li>') + `</ul><h3>댓글 등록</h3>
            <form action="/comment/create" method="post"><input type="hidden" name="kind" value="${kind}">
            <input type="hidden" name="target" value="${id}"><p><label>댓글 <textarea name="comment" maxlength="100" required></textarea></label></p>
            ${this.password()}<button type="submit">등록</button></form>`;
    },
    password() { return '<p><label>비밀번호 (숫자 4자리) <input type="password" name="passwd" pattern="[0-9]{4}" maxlength="4" inputmode="numeric" required></label></p>'; },
    // [추가 학습/변경] 기본 template처럼 수정/삭제 화면을 분리.
    update(comment) {
        let back = `/track/${comment.track_no}`;
        if (comment.album_no !== null) back = `/album/${comment.album_no}`;
        return `<h2>댓글 수정</h2><form action="/comment/update" method="post">
            <input type="hidden" name="id" value="${comment.id}">
            <p><label>댓글 <textarea name="comment" maxlength="100" required>${escape(comment.comment)}</textarea></label></p>
            ${this.password()}<button type="submit">수정</button> <a href="${back}">취소</a></form>`;
    },
    delete(comment) {
        let back = `/track/${comment.track_no}`;
        if (comment.album_no !== null) back = `/album/${comment.album_no}`;
        return `<h2>댓글 삭제</h2><p>${escape(comment.comment)}</p><p>이 댓글을 삭제하시겠습니까?</p>
            <form action="/comment/delete" method="post"><input type="hidden" name="id" value="${comment.id}">
            ${this.password()}<button type="submit">삭제</button> <a href="${back}">취소</a></form>`;
    },
    // [추가 학습/변경] 상세 설명 아래 수정/삭제 페이지로 이동하는 링크.
    manage(kind, id) {
        return `<h2>수정/삭제</h2>
            <a href="/${kind}/${id}/update">수정</a>
            <a href="/${kind}/${id}/delete">삭제</a>`;
    },
    // [추가 학습/변경] 아티스트 입력 화면. 수정 시에만 공통 비밀번호 입력.
    artistForm(item, parentId) {
        let action = 'create';
        let label = '추가';
        let values = { name: '', description: '' };
        let hidden = '';
        let password = '';
        let back = '/';
        if (item) {
            action = 'update';
            label = '수정';
            values = item;
            hidden = `<input type="hidden" name="id" value="${item.id}">`;
            password = this.password();
            back = `/artist/${item.id}`;
        }
        return `<h2>아티스트 ${label}</h2><form action="/artist/${action}" method="post">
            ${hidden}<p><label>이름 <input name="name" maxlength="30" value="${escape(values.name)}" required></label></p>
            <p><label>설명 <textarea name="description" maxlength="50">${escape(values.description)}</textarea></label></p>
            ${password}<button>${label}</button> <a href="${back}">취소</a></form>`;
    },
    artistDelete(item) {
        return `<h2>아티스트 삭제</h2><p>${escape(item.name)}을(를) 삭제하시겠습니까?</p>
            <p>소속 앨범, 트랙과 모든 댓글도 함께 삭제됩니다.</p>
            <form action="/artist/delete" method="post"><input type="hidden" name="id" value="${item.id}">
            ${this.password()}<button>삭제</button> <a href="/artist/${item.id}">취소</a></form>`;
    },
    // [추가 학습/변경] 앨범 입력 화면. 수정 시에만 공통 비밀번호 입력.
    albumForm(item, parentId) {
        let action = 'create';
        let label = '추가';
        let values = { title: '', description: '' };
        let hidden = '';
        let password = '';
        let back = '/';
        hidden = `<input type="hidden" name="artist_no" value="${parentId}">`;
        back = `/artist/${parentId}`;
        if (item) {
            action = 'update';
            label = '수정';
            values = item;
            hidden = `<input type="hidden" name="id" value="${item.id}">`;
            password = this.password();
            back = `/album/${item.id}`;
        }
        return `<h2>앨범 ${label}</h2><form action="/album/${action}" method="post">
            ${hidden}<p><label>제목 <input name="title" maxlength="30" value="${escape(values.title)}" required></label></p>
            <p><label>설명 <textarea name="description" maxlength="50">${escape(values.description)}</textarea></label></p>
            ${password}<button>${label}</button> <a href="${back}">취소</a></form>`;
    },
    albumDelete(item) {
        return `<h2>앨범 삭제</h2><p>${escape(item.title)}을(를) 삭제하시겠습니까?</p>
            <p>소속 트랙과 모든 댓글도 함께 삭제됩니다.</p>
            <form action="/album/delete" method="post"><input type="hidden" name="id" value="${item.id}">
            ${this.password()}<button>삭제</button> <a href="/album/${item.id}">취소</a></form>`;
    },
    // [생성형 AI 활용] [추가 학습/변경] 트랙 입력 화면. 수정 시에만 공통 비밀번호 입력.
    trackForm(item, parentId) {
        let action = 'create';
        let label = '추가';
        let values = { title: '', description: '' };
        let hidden = '';
        let password = '';
        let back = '/';
        hidden = `<input type="hidden" name="album_no" value="${parentId}">`;
        back = `/album/${parentId}`;
        if (item) {
            action = 'update';
            label = '수정';
            values = item;
            hidden = `<input type="hidden" name="id" value="${item.id}">`;
            password = this.password();
            back = `/track/${item.id}`;
        }
        return `<h2>트랙 ${label}</h2><form action="/track/${action}" method="post">
            ${hidden}<p><label>제목 <input name="title" maxlength="30" value="${escape(values.title)}" required></label></p>
            <p><label>설명 <textarea name="description" maxlength="50">${escape(values.description)}</textarea></label></p>
            ${password}<button>${label}</button> <a href="${back}">취소</a></form>`;
    },
    trackDelete(item) {
        return `<h2>트랙 삭제</h2><p>${escape(item.title)}을(를) 삭제하시겠습니까?</p>
            <p>이 트랙의 모든 댓글도 함께 삭제됩니다.</p>
            <form action="/track/delete" method="post"><input type="hidden" name="id" value="${item.id}">
            ${this.password()}<button>삭제</button> <a href="/track/${item.id}">취소</a></form>`;
    },
};
