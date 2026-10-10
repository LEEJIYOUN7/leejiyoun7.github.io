/* JY SELECT 고객 문의 / 관리자 승인 후기
   업로드 위치: leejiyoun7.github.io 저장소의 최상위 폴더
   HTML 연결: </body> 바로 위 <script src="./jy-community.js"></script>
*/
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  if (!window.supabase || typeof db === 'undefined') {
    console.error('JY SELECT: Supabase 연결을 확인해 주세요.');
    return;
  }
  const css = document.createElement('style');
  css.textContent = `
    #jyCommunity,#jyCommunityAdmin{max-width:1100px;margin:32px auto;padding:30px 5%;}
    .jyCols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;}
    .jyBox{border:1px solid #e8e3de;border-radius:12px;background:#fff;padding:20px;}
    .jyBox h3{margin:0 0 15px}.jyBox input,.jyBox select,.jyBox textarea{
      display:block;width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;
      border-radius:6px;font:inherit;background:#fff;
    }
    .jyBox button{cursor:pointer;border:0;border-radius:5px;background:#282522;color:white;padding:12px 17px;margin:5px 5px 5px 0;}
    .jyBox button:disabled{opacity:.5}.jyBox .jyDanger{background:#9c423a;}
    .jyEntry{border-bottom:1px solid #e8e3de;padding:14px 0;white-space:pre-wrap;overflow-wrap:anywhere;}
    .jyInfo{font-size:13px;color:#807973;line-height:1.5;}
    @media(max-width:700px){.jyCols{grid-template-columns:1fr;}}
  `;
  document.head.append(css);

  const customer = document.createElement('section');
  customer.id = 'jyCommunity';
  customer.innerHTML = `
    <h2>고객 문의 · 상품 후기</h2>
    <p class="subtitle">궁금한 점과 사용 후기를 남겨 주세요.</p>
    <div class="jyCols">
      <div class="jyBox">
        <h3>고객 문의</h3>
        <p class="jyInfo">연락처와 문의 내용은 관리자만 확인합니다.</p>
        <form id="jyInquiryForm">
          <input name="customer_name" maxlength="60" placeholder="성함" required>
          <input name="phone" maxlength="60" placeholder="연락처" required>
          <select name="product_name" id="jyInquiryProduct"><option>일반 문의</option></select>
          <textarea name="content" rows="5" maxlength="2000" placeholder="문의 내용" required></textarea>
          <button type="submit">문의 접수</button>
        </form>
        <p id="jyInquiryMsg" class="jyInfo" role="status"></p>
      </div>
      <div class="jyBox">
        <h3>상품 후기 작성</h3>
        <p class="jyInfo">후기는 판매자가 승인한 뒤에만 공개됩니다.</p>
        <form id="jyReviewForm">
          <select name="product_name" id="jyReviewProduct" required></select>
          <input name="nickname" maxlength="60" placeholder="닉네임" required>
          <select name="rating">
            <option value="5">★★★★★ 5점</option>
            <option value="4">★★★★☆ 4점</option>
            <option value="3">★★★☆☆ 3점</option>
            <option value="2">★★☆☆☆ 2점</option>
            <option value="1">★☆☆☆☆ 1점</option>
          </select>
          <textarea name="content" rows="5" maxlength="2000" placeholder="사용 후기 (개인정보 작성 금지)" required></textarea>
          <button type="submit">후기 제출</button>
        </form>
        <p id="jyReviewMsg" class="jyInfo" role="status"></p>
      </div>
    </div>
    <div class="jyBox" style="margin-top:22px">
      <h3>승인된 고객 후기</h3>
      <div id="jyApprovedList">후기를 불러오는 중입니다.</div>
    </div>`;
  const footer = document.querySelector('footer');
  if (footer) footer.before(customer);
  else document.body.append(customer);

  const admin = document.createElement('div');
  admin.id = 'jyCommunityAdmin';
  admin.innerHTML = `
    <h2>문의 · 후기 관리</h2>
    <div class="jyBox">
      <button id="jyAdminRefresh" type="button">문의·후기 불러오기</button>
      <p id="jyAdminMsg" class="jyInfo">관리자로 로그인한 뒤 불러오기를 누르세요.</p>
    </div>
    <div class="jyCols" style="margin-top:15px">
      <div class="jyBox"><h3>고객 문의</h3><div id="jyInquiryList"></div></div>
      <div class="jyBox"><h3>후기 승인·삭제</h3><div id="jyReviewList"></div></div>
    </div>`;
  const sellerSection = $('sellerSection');
  if (sellerSection) sellerSection.append(admin);

  const text = (tag, value) => {
    const el = document.createElement(tag);
    el.textContent = String(value ?? '');
    return el;
  };
  const report = (id, value) => { $(id).textContent = value; };
  const addCard = (target, header, content, details) => {
    const row = document.createElement('div');
    row.className = 'jyEntry';
    row.append(text('strong', header), text('p', content));
    if (details) row.append(text('small', details));
    target.append(row);
    return row;
  };
  const addButton = (row, label, task, dangerous = false) => {
    const b = text('button', label);
    b.type = 'button';
    if (dangerous) b.className = 'jyDanger';
    b.onclick = async () => {
      b.disabled = true;
      try { await task(); }
      catch (e) { report('jyAdminMsg', '처리 오류: ' + e.message); }
      finally { b.disabled = false; }
    };
    row.append(b);
  };

  const productNames = (typeof products !== 'undefined' ? products : [])
    .map(p => String(p.name || '').slice(0, 120)).filter(Boolean);
  const names = [...new Set(productNames)];
  for (const name of names) {
    $('jyInquiryProduct').add(new Option(name, name));
    $('jyReviewProduct').add(new Option(name, name));
  }
  if (!names.length) $('jyReviewProduct').add(new Option('등록된 상품 없음', '', true, true));

  async function insertForm(formId, table, msgId, extra = {}) {
    const form = $(formId);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      report(msgId, '접수 중입니다...');
      try {
        const item = Object.fromEntries(new FormData(form).entries());
        for (const k of Object.keys(item)) item[k] = String(item[k]).trim();
        if (Object.values(item).some(v => !v)) throw new Error('모든 항목을 입력해 주세요.');
        const { error } = await db.from(table).insert({ ...item, ...extra });
        if (error) throw error;
        form.reset();
        report(msgId, table === 'jy_reviews'
          ? '후기가 접수됐습니다. 관리자 승인 후 공개됩니다.'
          : '문의가 접수됐습니다.');
      } catch (e) { report(msgId, '접수 실패: ' + e.message); }
      finally { button.disabled = false; }
    });
  }
  insertForm('jyInquiryForm', 'jy_inquiries', 'jyInquiryMsg');
  insertForm('jyReviewForm', 'jy_reviews', 'jyReviewMsg', { approved: false });

  async function loadApproved() {
    const el = $('jyApprovedList');
    const { data, error } = await db.from('jy_reviews')
      .select('product_name,nickname,rating,content,created_at')
      .eq('approved', true).order('created_at', { ascending: false }).limit(50);
    el.replaceChildren();
    if (error) { el.append(text('p', '후기를 불러오지 못했습니다.')); return; }
    if (!data?.length) { el.append(text('p', '아직 공개된 후기가 없습니다.')); return; }
    for (const r of data) addCard(el,
      r.product_name + ' · ' + r.nickname + ' · ' + '★'.repeat(r.rating),
      r.content, new Date(r.created_at).toLocaleDateString('ko-KR'));
  }

  async function loadAdmin() {
    report('jyAdminMsg', '문의·후기를 불러오는 중입니다...');
    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) { report('jyAdminMsg', '관리자 로그인이 필요합니다.'); return; }
    const { data: isAdmin, error: adminError } = await db.rpc('is_admin');
    if (adminError || isAdmin !== true) { report('jyAdminMsg', '관리자 권한이 없습니다.'); return; }
    const [iq, rv] = await Promise.all([
      db.from('jy_inquiries').select('*').order('created_at', { ascending: false }).limit(100),
      db.from('jy_reviews').select('*').order('created_at', { ascending: false }).limit(100)
    ]);
    if (iq.error || rv.error) {
      report('jyAdminMsg', 'DB 읽기 실패: ' + (iq.error?.message || rv.error?.message));
      return;
    }
    report('jyAdminMsg', `문의 ${iq.data.length}건 / 후기 ${rv.data.length}건`);
    $('jyInquiryList').replaceChildren();
    $('jyReviewList').replaceChildren();
    if (!iq.data.length) $('jyInquiryList').append(text('p', '접수된 문의가 없습니다.'));
    if (!rv.data.length) $('jyReviewList').append(text('p', '후기가 없습니다.'));
    for (const i of iq.data) {
      const card = addCard($('jyInquiryList'),
        `${i.customer_name} · ${i.phone} · ${i.status}`,
        i.content, i.product_name);
      if (i.status !== '완료') addButton(card, '처리 완료', async () => {
        const { error } = await db.from('jy_inquiries').update({ status: '완료' }).eq('id', i.id);
        if (error) throw error;
        await loadAdmin();
      });
      addButton(card, '삭제', async () => {
        if (!confirm('이 문의를 삭제할까요?')) return;
        const { error } = await db.from('jy_inquiries').delete().eq('id', i.id);
        if (error) throw error;
        await loadAdmin();
      }, true);
    }
    for (const r of rv.data) {
      const card = addCard($('jyReviewList'),
        `${r.approved ? '공개' : '승인 대기'} · ${r.product_name} · ${r.nickname} · ${r.rating}점`, r.content);
      if (!r.approved) addButton(card, '후기 승인', async () => {
        const { error } = await db.from('jy_reviews').update({ approved: true }).eq('id', r.id);
        if (error) throw error;
        await Promise.all([loadAdmin(), loadApproved()]);
      });
      addButton(card, '후기 삭제', async () => {
        if (!confirm('이 후기를 삭제할까요?')) return;
        const { error } = await db.from('jy_reviews').delete().eq('id', r.id);
        if (error) throw error;
        await Promise.all([loadAdmin(), loadApproved()]);
      }, true);
    }
  }
  $('jyAdminRefresh').addEventListener('click', () => loadAdmin().catch(console.error));
  loadApproved().catch(console.error);
})();
