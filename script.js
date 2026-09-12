// 간편장부 — 로그인 / 개인정보 / 사업장
//
// Supabase 에 붙어서 이메일 가입·로그인을 처리한다.
// 아래 두 값은 브라우저에 그대로 드러나는 공개용 값이다. 숨길 필요가 없다.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://kqawkddxcsdjsmnjsjix.supabase.co";
const SUPABASE_KEY = "sb_publishable_eg6TGqmzNEbKu1ywiZGl8w_dbIcgkW1";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 화면 조각들
const loggedOut = document.getElementById("loggedOut");
const loggedIn  = document.getElementById("loggedIn");
const who       = document.getElementById("who");
const msg       = document.getElementById("msg");
const form      = document.getElementById("authForm");
const emailBox  = document.getElementById("email");
const pwBox     = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

// 로그인 상태에 따라 화면을 바꾼다
function draw(session) {
  const 로그인됨 = Boolean(session);
  loggedOut.hidden = 로그인됨;
  loggedIn.hidden  = !로그인됨;
  who.textContent  = 로그인됨 ? session.user.email : "";

  if (로그인됨) {
    // 업태·종목 칸이 비어 있으면 한 줄 만들어 둔다
    if (industryRows.children.length === 0) industryRows.appendChild(업종줄());
    개인정보불러오기();
    사업장목록();
  } else {
    개인정보비우기();
    편집끝내기();
    bizList.replaceChildren();
  }
}

// Supabase 가 보내는 영어 문구를 한글로 바꾼다.
// 여기 없는 것은 영어 그대로 보여준다 (새 문구가 나오면 눈에 띄게 하려고).
const 오류문구 = {
  "Invalid login credentials": "이메일이나 비밀번호가 올바르지 않습니다. 처음이시면 회원가입을 눌러주세요.",
  "Password should be at least 6 characters.": "비밀번호는 6자 이상이어야 합니다.",
  "Unable to validate email address: invalid format": "이메일 주소를 확인할 수 없습니다.",
  "missing email or phone": "이메일 주소를 입력해야 합니다.",
};

function 한글로(error) {
  return 오류문구[error.message] ?? error.message;
}

// 안내 문구 한 줄.
// 잘 된 경우는 몇 초 뒤 저절로 사라지고, 오류는 계속 두기를 켜서 남긴다.
let 문구타이머;
function say(text, 계속두기 = false) {
  clearTimeout(문구타이머);
  msg.textContent = text;
  if (text && !계속두기) {
    문구타이머 = setTimeout(() => { msg.textContent = ""; }, 1500);
  }
}

// 로그인
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  say("");
  const { error } = await supabase.auth.signInWithPassword({
    email: emailBox.value,
    password: pwBox.value,
  });
  if (error) say(한글로(error), true);
});

// 회원가입
signupBtn.addEventListener("click", async () => {
  say("");
  if (!emailBox.value || !pwBox.value) {
    say("이메일 주소를 입력해야 합니다.", true);
    return;
  }
  const { error } = await supabase.auth.signUp({
    email: emailBox.value,
    password: pwBox.value,
    options: { emailRedirectTo: window.location.href },
  });
  if (error) {
    say(한글로(error), true);
  } else {
    say("확인 메일을 보냈습니다. 메일의 링크를 눌러야 가입이 끝납니다.");
  }
});

// 로그아웃
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  emailBox.value = "";
  pwBox.value = "";
  say("");
});


// ============================================================
// 개인정보 — 한 사람당 한 줄. 저장하면 덮어쓴다
// ============================================================

const profileForm = document.getElementById("profileForm");

const 개인칸 = {
  name:         document.getElementById("pName"),
  rrn:          document.getElementById("pRrn"),
  address:      document.getElementById("pAddress"),
  phone_home:   document.getElementById("pPhoneHome"),
  phone_mobile: document.getElementById("pPhoneMobile"),
  book_duty:    document.getElementById("pBookDuty"),
  report_type:  document.getElementById("pReportType"),
  report_kind:  document.getElementById("pReportKind"),
  tax_office:   document.getElementById("pTaxOffice"),
  local_gov:    document.getElementById("pLocalGov"),
};

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  say("");

  // 저장해둔 세션에서 바로 꺼낸다 (getUser 는 서버에 다시 물어보느라 null 이 나올 때가 있다)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    say("로그인이 풀렸습니다. 다시 로그인해주세요.", true);
    return;
  }

  const 값 = { user_id: session.user.id };
  for (const [이름, 칸] of Object.entries(개인칸)) {
    값[이름] = 칸.value.trim() || null;
  }

  const { error } = await supabase.from("profiles").upsert(값, { onConflict: "user_id" });
  if (error) {
    say(error.message, true);
    return;
  }
  say("개인정보를 저장했습니다.");
});

// 저장해둔 것이 있으면 칸에 채운다
async function 개인정보불러오기() {
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) {
    say(error.message, true);
    return;
  }
  for (const [이름, 칸] of Object.entries(개인칸)) {
    칸.value = data?.[이름] ?? "";
  }
}

function 개인정보비우기() {
  for (const 칸 of Object.values(개인칸)) 칸.value = "";
}


// ============================================================
// 사업장 — 등록 / 목록 / 고르기 / 수정 / 삭제
// ============================================================

const bizForm      = document.getElementById("bizForm");
const industryRows = document.getElementById("industryRows");
const addIndustry  = document.getElementById("addIndustry");
const bizList      = document.getElementById("bizList");
const saveBiz      = document.getElementById("saveBiz");
const cancelEdit   = document.getElementById("cancelEdit");

// 지금 고른 사업장. 다음 단계(장부 저장)에서 쓴다.
let 고른사업장 = localStorage.getItem("고른사업장") ?? "";

// 수정 중인 사업장. 비어 있으면 새로 등록하는 것이다.
let 수정중 = "";

// 폼의 칸들
const 칸 = {
  tax_type:   document.getElementById("taxType"),
  biz_no:     document.getElementById("bizNo"),
  name:       document.getElementById("bizName"),
  owner_name: document.getElementById("ownerName"),
  opened_on:  document.getElementById("openedOn"),
  address:    document.getElementById("address"),
  co_owners:  document.getElementById("coOwners"),
  unit_tax:   document.getElementById("unitTax"),
};

// 업태·종목 한 줄을 만든다
function 업종줄(값 = { 업태: "", 종목: "" }) {
  const 줄 = document.createElement("div");
  줄.className = "업종줄";

  const 업태 = document.createElement("input");
  업태.className = "업태";
  업태.type = "text";
  업태.placeholder = "업태";
  업태.value = 값.업태 ?? "";

  const 종목 = document.createElement("input");
  종목.className = "종목";
  종목.type = "text";
  종목.placeholder = "종목";
  종목.value = 값.종목 ?? "";

  줄.append(업태, 종목);
  return 줄;
}

addIndustry.addEventListener("click", () => {
  industryRows.appendChild(업종줄());
});

// 화면의 업태·종목 줄을 모아서 배열로 만든다. 둘 다 빈 줄은 버린다.
function 업종모으기() {
  return [...industryRows.querySelectorAll(".업종줄")]
    .map((줄) => ({
      업태: 줄.querySelector(".업태").value.trim(),
      종목: 줄.querySelector(".종목").value.trim(),
    }))
    .filter((칸) => 칸.업태 || 칸.종목);
}

// 폼에 적힌 것을 모아 한 줄로 만든다
function 폼읽기() {
  return {
    tax_type:   칸.tax_type.value || null,
    biz_no:     칸.biz_no.value.trim(),
    name:       칸.name.value.trim(),
    owner_name: 칸.owner_name.value.trim() || null,
    opened_on:  칸.opened_on.value || null,
    address:    칸.address.value.trim() || null,
    industries: 업종모으기(),
    co_owners:  칸.co_owners.value.trim() || null,
    unit_tax:   칸.unit_tax.checked,
  };
}

// 등록 / 수정 저장
bizForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  say("");

  const 값 = 폼읽기();
  const { error } = 수정중
    ? await supabase.from("businesses").update(값).eq("id", 수정중)
    : await supabase.from("businesses").insert(값);

  if (error) {
    say(error.message, true);
    return;
  }

  편집끝내기();
  await 사업장목록();
});

// 수정하던 것을 접고 폼을 비운다
function 편집끝내기() {
  수정중 = "";
  bizForm.reset();
  industryRows.replaceChildren(업종줄());
  saveBiz.textContent = "등록";
  cancelEdit.hidden = true;
}

cancelEdit.addEventListener("click", () => {
  say("");
  편집끝내기();
});

// 고른 줄을 폼으로 옮긴다
function 수정하기(사업장) {
  수정중 = 사업장.id;

  칸.tax_type.value   = 사업장.tax_type ?? "";
  칸.biz_no.value     = 사업장.biz_no ?? "";
  칸.name.value       = 사업장.name ?? "";
  칸.owner_name.value = 사업장.owner_name ?? "";
  칸.opened_on.value  = 사업장.opened_on ?? "";
  칸.address.value    = 사업장.address ?? "";
  칸.co_owners.value  = 사업장.co_owners ?? "";
  칸.unit_tax.checked = Boolean(사업장.unit_tax);

  const 업종들 = 사업장.industries?.length ? 사업장.industries : [{ 업태: "", 종목: "" }];
  industryRows.replaceChildren(...업종들.map(업종줄));

  saveBiz.textContent = "수정 저장";
  cancelEdit.hidden = false;
  bizForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function 삭제하기(사업장) {
  const { error } = await supabase.from("businesses").delete().eq("id", 사업장.id);
  if (error) {
    say(error.message, true);
    return;
  }

  if (수정중 === 사업장.id) 편집끝내기();
  await 사업장목록();
}

// 목록을 불러와 그린다
async function 사업장목록() {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at");

  if (error) {
    say(error.message, true);
    return;
  }

  bizList.replaceChildren();

  if (data.length === 0) {
    bizList.textContent = "등록한 사업장이 없습니다.";
    return;
  }

  // 고른 것이 목록에 없으면(다른 계정으로 바뀐 경우) 첫 줄을 고른다
  if (!data.some((사업장) => 사업장.id === 고른사업장)) {
    고르기(data[0].id);
  }

  for (const 사업장 of data) {
    const 줄 = document.createElement("div");
    줄.className = "사업장줄";

    const 고름 = document.createElement("label");
    const 단추 = document.createElement("input");
    단추.type = "radio";
    단추.name = "고른사업장";
    단추.checked = 사업장.id === 고른사업장;
    단추.addEventListener("change", () => 고르기(사업장.id));
    고름.append(단추, ` ${사업장.name} (${사업장.biz_no})`);

    const 수정버튼 = document.createElement("button");
    수정버튼.type = "button";
    수정버튼.className = "작은버튼";
    수정버튼.textContent = "수정";
    수정버튼.addEventListener("click", () => 수정하기(사업장));

    const 삭제버튼 = document.createElement("button");
    삭제버튼.type = "button";
    삭제버튼.className = "작은버튼";
    삭제버튼.textContent = "삭제";
    // 브라우저 확인창(confirm)은 뜨지 않는 곳이 있어서, 두 번 눌러 확인받는다
    삭제버튼.addEventListener("click", () => {
      if (삭제버튼.dataset.확인 !== "1") {
        삭제버튼.dataset.확인 = "1";
        삭제버튼.textContent = "정말 지울까요?";
        setTimeout(() => {
          삭제버튼.dataset.확인 = "";
          삭제버튼.textContent = "삭제";
        }, 3000);
        return;
      }
      삭제하기(사업장);
    });

    줄.append(고름, 수정버튼, 삭제버튼);
    bizList.appendChild(줄);
  }
}

function 고르기(id) {
  고른사업장 = id;
  localStorage.setItem("고른사업장", id);
}


// ============================================================
// 처음 열었을 때 + 로그인 상태가 바뀔 때마다 화면을 다시 그린다
// (draw 가 사업장 칸을 건드리므로 반드시 파일 맨 끝에 둔다)
// ============================================================

const { data: 첫세션 } = await supabase.auth.getSession();
draw(첫세션.session);
supabase.auth.onAuthStateChange((_event, session) => draw(session));
