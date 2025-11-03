# [ISFJ.KR](https://isfj.kr)

## 주요 기능

### [사용자 등록](https://github.com/OUS-KR/ISFJ.KR/issues/new?template=01-user-register-by-issue.yml)

- `ISFJ.KR/u/{사용자 아이디}` 주소 기반의 사용자 등록
  - 사용자 예제: [ISFJ.KR/u/isfj](https://isfj.kr/u/isfj), [ISFJ.KR/u/tests/](https://isfj.kr/u/tests)
  - [사용자 등록 예제](https://github.com/OUS-KR/ISFJ.KR/issues/2 )
- `ISFJ.KR/@{사용자 아이디}` 형태의 짧은 주소 지원
  - 사용자 예제: [ISFJ.KR/@isfj](https://isfj.kr/@isfj), [ISFJ.KR/@tests](https://isfj.kr/@tests)
- 부적절한 아이디 (욕설, 관리자 등)는 제한되어 등록 시 삭제

### [사용자 단축주소 생성](https://github.com/OUS-KR/ISFJ.KR/issues/new?template=02-user-short-url-register-by-issue.yml)

- `ISFJ.KR/u/{사용자 아이디}/{단축 경로}` 형태의 단축주소 생성
  - 사용자 단축주소 예제: [ISFJ.KR/u/isfj/links/isfj-kr](https://isfj.kr/u/isfj/links/isfj-kr)
  - [사용자 단축주소 등록 예제](https://github.com/OUS-KR/ISFJ.KR/issues/3)
  - 동일한 단축 경로 존재 시 덮어쓰기
- `ISFJ.KR/@{사용자 아이디}/{단축 경로}` 형태의 짧은 주소 지원
  - 사용자 단축주소 예제: [ISFJ.KR/@isfj/links/isfj-kr](https://isfj.kr/@isfj/links/isfj-kr)
- 단축 경로가 `links`로 시작하면 `ISFJ.KR/@{사용자 아이디}/!{links를 제외한 단축 경로}` 형태로 생략 가능
  - 사용자 단축주소 예제: [ISFJ.KR/@isfj/!isfj-kr](https://isfj.kr/@isfj/!isfj-kr)

### [사용자 글 작성](https://github.com/OUS-KR/ISFJ.KR/issues/new?template=03-user-article-writing-by-issue.yml)

- `ISFJ.KR/u/{사용자 아이디}/{글 경로}` 형태의 글 작성
  - 마크다운 문법: [마크다운 문법](https://github.com/OUS-KR/ISFJ.KR?tab=readme-ov-file#%EB%A7%88%ED%81%AC%EB%8B%A4%EC%9A%B4-%EB%AC%B8%EB%B2%95-%EC%98%88%EC%8B%9C), [마크다운 문법 예제](https://isfj.kr/@isfj/articles/md_example)
  - 사용자 글 예제: [ISFJ.KR/u/isfj/articles/example](https://isfj.kr/u/isfj/articles/example)
  - [사용자 글 작성 예제](https://github.com/OUS-KR/ISFJ.KR/issues/4)
  - 동일한 글 경로 존재 시 덮어쓰기
  - 글 경로 미입력 시 `ISFJ.KR/u/{사용자 아이디}/` 페이지 수정
- `ISFJ.KR/@{사용자 아이디}/{글 경로}` 형태의 짧은 주소 지원
  - 사용자 글 예제: [ISFJ.KR/@isfj/articles/example](https://isfj.kr/@isfj/articles/example)
 
### [사용자 메뉴 설정](https://github.com/OUS-KR/ISFJ.KR/issues/new?template=04-user-menu-setting-by-issue.yml)

- 사용자 단축주소 및 글 페이지에 들어갈 메뉴 설정
  - [사용자 메뉴 설정 예제](https://github.com/OUS-KR/ISFJ.KR/issues/5)

## 사용 방법

- [Issues 메뉴](https://github.com/OUS-KR/ISFJ.KR/issues) 이동
- [New issue 버튼](https://github.com/OUS-KR/ISFJ.KR/issues/new/choose) 클릭
- 기능 선택 후 폼 작성

## 기타 기능

### 유튜브 단축주소

- 유튜브 영상: `ISFJ.KR/yt/{유튜브 영상 아이디}`
  - 예제: [ISFJ.KR/yt/1ZX1vEDTfY4](https://isfj.kr/yt/1ZX1vEDTfY4), [ISFJ.KR/yt/yebNIHKAC4A](https://isfj.kr/yt/yebNIHKAC4A)
- 유튜브 영상 + 시작 시간 옵션: `ISFJ.KR/{유튜브 영상 아이디}/{시작 시간}`
  - 예제: [ISFJ.KR/yt/1ZX1vEDTfY4/1m6s](https://isfj.kr/yt/1ZX1vEDTfY4/1m6s), [ISFJ.KR/yt/yebNIHKAC4A/56](https://isfj.kr/yt/yebNIHKAC4A/56)
- 유튜브 영상 썸네일: `ISFJ.KR/yt/img/{유튜브 영상 아이디}`
  - 예제: [ISFJ.KR/yt/img/1ZX1vEDTfY4](https://isfj.kr/yt/img/1ZX1vEDTfY4), [ISFJ.KR/yt/img/yebNIHKAC4A](https://isfj.kr/yt/img/yebNIHKAC4A)
- 유튜브 채널 RSS: `ISFJ.KR/yt/rss/{유튜브 채널 아이디}`
  - 예제: [ISFJ.KR/yt/rss/UC-Fnix71vRP64WXeo0ikd0Q](https://isfj.kr/yt/rss/UC-Fnix71vRP64WXeo0ikd0Q)

#### 마크다운 작성 시 사용 방법

- 유튜브 영상 썸네일 링크: `[![{유튜브 영상 썸네일 텍스트}]({유튜브 영상 썸네일 주소})]({유튜브 영상 주소})`
  - 예제: `[![FIFTY FIFTY (피프티피프티) 'Pookie' Official MV](https://ISFJ.KR/yt/img/1ZX1vEDTfY4)](https://ISFJ.KR/yt/1ZX1vEDTfY4/1m6s)`
  [![FIFTY FIFTY (피프티피프티) 'Pookie' Official MV](https://ISFJ.KR/yt/img/1ZX1vEDTfY4)](https://ISFJ.KR/yt/1ZX1vEDTfY4/1m6s)
  - 예제: `[![“Golden” Official Lyric Video | KPop Demon Hunters | Sony Animation](https://ISFJ.KR/yt/img/yebNIHKAC4A)](https://ISFJ.KR/yt/yebNIHKAC4A/56)`
  [![“Golden” Official Lyric Video | KPop Demon Hunters | Sony Animation](https://ISFJ.KR/yt/img/yebNIHKAC4A)](https://ISFJ.KR/yt/yebNIHKAC4A/56)

## 주의사항

- 다음과 같은 콘텐츠 포함 시 제재
  - 불법 행위 또는 범죄를 조장하는 내용 (마약, 폭력, 성범죄, 불법 무기 등 관련 정보 유포 등)
  - 타인의 권리를 침해하는 내용 (명예훼손, 저작권 침해, 개인정보 유출, 초상권 침해 등)
  - 욕설, 비방, 혐오 표현 등 비하 또는 공격적인 내용 (특정 인종, 성별, 종교, 지역 등에 대한 혐오 발언 등)
  - 선정적이거나 성인 콘텐츠 (음란물, 성인용 콘텐츠, 성인 서비스 홍보 등)
  - 도박 또는 사행심을 유도하는 콘텐츠 (불법 도박 사이트 홍보, 사설 토토 등)
  - 허위 사실 유포 또는 사기성 콘텐츠 (거짓 정보, 피싱 링크, 투자 사기 등)
  - 광고 및 스팸성 콘텐츠 (반복적 홍보, 무단 상업 게시물, 무관한 링크 삽입 등)

## 마크다운 문법

[마크다운 문법 예제](https://isfj.kr/@isfj/articles/md_example)

### 섹션 1: 기본 마크다운 문법

#### 1-1. 제목 (Headings)

# H1 제목
## H2 제목
### H3 제목
#### H4 제목
##### H5 제목
###### H6 제목

#### 1-2. 텍스트 스타일

**굵은 텍스트** (Bold)

*기울임 텍스트* (Italic)

***굵고 기울인 텍스트*** (Bold + Italic)

~~취소선~~ (Strikethrough)

`인라인 코드` (Inline Code)

#### 1-3. 링크

[일반 링크](https://example.com)

[GitHub](https://github.com)

[외부 링크 with title](https://example.com "제목")

#### 1-4. 이미지

![대체 텍스트](https://via.placeholder.com/150)

#### 1-5. 리스트

##### 순서 없는 리스트
- 항목 1
- 항목 2
- 항목 3
  - 중첩 항목 2-1
  - 중첩 항목 2-2
- 항목 4

##### 순서 있는 리스트
1. 첫 번째
2. 두 번째
3. 세 번째
   1. 중첩 1
   2. 중첩 2
4. 네 번째

#### 1-6. 인용문 (Blockquote)

> 이것은 인용문입니다.
> 여러 줄도 가능합니다.

> 중첩된 인용문
>> 더 깊은 중첩
>>> 더더 깊은 중첩

#### 1-7. 코드 블록

```javascript
function hello() {
  console.log("Hello, World!");
}
```

```python
def hello():
    print("Hello, World!")
```

```bash
echo "Hello, World!"
```

#### 1-8. 수평선 (Horizontal Rule)

---

#### 1-9. 테이블

| 헤더 1 | 헤더 2 | 헤더 3 |
|--------|--------|--------|
| 셀 1-1 | 셀 1-2 | 셀 1-3 |
| 셀 2-1 | 셀 2-2 | 셀 2-3 |

#### 1-10. 체크리스트

- [x] 완료된 항목
- [ ] 미완료 항목
- [x] 또 다른 완료 항목

---

### 섹션 2: 확장 마크다운 문법 (커스텀)

#### 2-1. Featured Section

:::featured
## 🌟 특별 섹션
이것은 특별히 강조된 섹션입니다.

여러 줄의 텍스트가 가능합니다.
:::

#### 2-2. Card Container

:::card
### 📦 카드 제목
카드 내용입니다.

- 리스트 항목 1
- 리스트 항목 2
:::

#### 2-3. Grid Layout (2열)

:::grid-2
- **📱 프로젝트 A**
- **🤖 프로젝트 B**
- **🎵 프로젝트 C**
- **📊 프로젝트 D**
:::

### 2-4. Grid Layout (3열)

:::grid-3
- **🔴 항목 1**
- **🟢 항목 2**
- **🟡 항목 3**
- **🔵 항목 4**
- **⚫ 항목 5**
- **⚪ 항목 6**
:::

#### 2-5. Link Buttons

[GitHub 방문](https://github.com/){.btn .btn-github width=100%}

[YouTube 구독](https://youtube.com/){.btn .btn-youtube width=50%}

[Twitter 팔로우](https://twitter.com/){.btn .btn-twitter}

[기본 버튼](https://example.com){.btn .btn-primary}

[보조 버튼](https://example.com){.btn .btn-secondary}

#### 2-6. Badges

::badge{success} 성공 ::

::badge{warning} 경고 ::

::badge{info} 정보 ::

::badge{new} 신규 ::

#### 2-7. Youtube

:::youtube{1ZX1vEDTfY4}

:::youtube{yebNIHKAC4A}

---

### 섹션 3: 복합 케이스 (여러 기능 조합)

#### 3-1. Featured + 내부 마크다운

:::featured
## 🎯 완전한 예제

**굵은 텍스트**, *기울임*, ~~취소선~~

- 리스트 항목 1
- 리스트 항목 2

[링크](https://example.com)

```javascript
console.log("코드 블록");
```
:::

#### 3-2. Card + 테이블

:::card
### 데이터 테이블

| 이름 | 값 |
|------|-----|
| **A** | 100 |
| **B** | 200 |
:::

#### 3-3. Grid + Bold/Italic 조합

:::grid-2
- **굵은 텍스트**
- *기울인 텍스트*
- ***굵고 기울인***
- ~~취소선~~
:::

#### 3-4. Featured + Buttons + Badges

:::featured
## 🚀 액션 섹션

[시작하기](https://example.com){.btn .btn-primary}

::badge{success} 준비완료 ::
:::

#### 3-5. 모든 Grid 크기

##### 2열 Grid
:::grid-2
- 항목 1
- 항목 2
- 항목 3
- 항목 4
:::

##### 3열 Grid
:::grid-3
- 항목 1
- 항목 2
- 항목 3
- 항목 4
- 항목 5
- 항목 6
:::

##### 4열 Grid
:::grid-4
- 항목 1
- 항목 2
- 항목 3
- 항목 4
- 항목 5
- 항목 6
- 항목 7
- 항목 8
:::

#### 3-6. Grid Padding

##### 2열 Grid

:::grid-2{p=0}
- ![img](1.jpg)
- ![img](2.jpg)
:::

##### 3열 Grid

:::grid-3{p=0}
- ![이미지1](1.jpg)
- ![이미지2](2.jpg)
- ![이미지3](3.jpg)
:::

#### 3-7. Grid Scrolling

##### 1열 Grid Scrolling

:::grid-1-scroll{padding=20px}
- **John Doe**
  CEO
  
- **Jane Smith**
  CTO
  
- **Mike Lee**
  CFO
:::

##### 2열 Grid Scrolling

:::grid-2-scroll{p=0}
- ![1](1.jpg)
- ![2](2.jpg)
- ![3](3.jpg)
- ![4](4.jpg)
:::

##### 3열 Grid Scrolling

:::grid-3-scroll{padding=10px}
- **제품1**
- **제품2**
- **제품3**
- **제품4**
:::

##### 4열 Grid Scrolling

:::grid-4-scroll{p=0}
- ![1](1.jpg)
- ![2](2.jpg)
- ![3](3.jpg)
- ![4](4.jpg)
- ![5](5.jpg)
:::

---

### 섹션 4: 엣지 케이스

#### 4-1. 긴 텍스트

:::featured
## 긴 텍스트 테스트

**굵은 긴 텍스트:** Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

*기울인 긴 텍스트:* Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
:::

#### 4-2. 특수 문자

다음 문자들이 제대로 처리되나요?
- `<` 와 `>` 꺾쇠
- `&` 앰퍼샌드
- `"` 큰따옴표
- `'` 작은따옴표
- `\` 백슬래시

#### 4-3. 중첩된 구조

:::card
## 카드 내부 구조

### 하위 제목

**굵은 텍스트**와 *기울인 텍스트*

- 리스트 1
- 리스트 2
  - 중첩 1
  - 중첩 2

[링크](https://example.com){.btn .btn-primary}

::badge{info} 배지 ::
:::

#### 4-4. 빈 줄 처리

이것은 문장입니다.

이것은 다른 문장입니다.


이것은 더 큰 간격으로 떨어진 문장입니다.

#### 4-5. 연속된 마크다운 요소

**굵음** *기울임* ***둘다*** ~~취소선~~

[링크1](https://example.com) [링크2](https://example.com)

::badge{success} 배지1 :: ::badge{info} 배지2 ::

#### 4-6. 모든 버튼 타입 연속

[Primary](https://example.com){.btn .btn-primary}
[Secondary](https://example.com){.btn .btn-secondary}
[GitHub](https://example.com){.btn .btn-github}
[YouTube](https://example.com){.btn .btn-youtube}
[Twitter](https://example.com){.btn .btn-twitter}

#### 4-7. 모든 배지 타입

::badge{success} Success ::
::badge{warning} Warning ::
::badge{info} Info ::
::badge{new} New ::

---

### 섹션 5: 실제 Link in Bio 예제

# Link in Bio

:::featured
## 🌟 새로운 프로젝트
AI 기반 콘텐츠 생성 플랫폼입니다!
:::

[GitHub 방문](https://github.com/){.btn .btn-github}
[YouTube 구독](https://youtube.com/){.btn .btn-youtube}
[Twitter 팔로우](https://twitter.com/){.btn .btn-twitter}

---

## 기술 스택

:::card
### 💻 사용 기술

**프론트엔드:** JavaScript, React, Vue.js

**백엔드:** Python, Node.js, Express

**도구:** Git, Docker, AWS
:::

---

## 프로젝트

:::grid-2
- **📱 Project A**
- **🤖 Project B**
- **🎵 Project C**
- **📊 Project D**
:::

::badge{success} Active ::
::badge{info} Verified ::