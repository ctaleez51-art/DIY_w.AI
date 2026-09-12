// 간편장부 — 로그인/로그아웃
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

// 안내 문구 한 줄
function say(text) {
  msg.textContent = text;
}

// 로그인
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  say("");
  const { error } = await supabase.auth.signInWithPassword({
    email: emailBox.value,
    password: pwBox.value,
  });
  if (error) say(한글로(error));
});

// 회원가입
signupBtn.addEventListener("click", async () => {
  say("");
  if (!emailBox.value || !pwBox.value) {
    say("이메일 주소를 입력해야 합니다.");
    return;
  }
  const { error } = await supabase.auth.signUp({
    email: emailBox.value,
    password: pwBox.value,
    options: { emailRedirectTo: window.location.href },
  });
  if (error) {
    say(한글로(error));
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

// 처음 열었을 때 + 로그인 상태가 바뀔 때마다 화면을 다시 그린다
const { data } = await supabase.auth.getSession();
draw(data.session);
supabase.auth.onAuthStateChange((_event, session) => draw(session));
