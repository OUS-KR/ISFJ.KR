// today-game.js - 추억의 도서관 관리하기 (Managing the Library of Memories)

// --- Utility Functions ---
function getDailySeed() {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function mulberry32(seed) {
    return function() {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) | 0;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function getRandomValue(base, variance) {
    const min = base - variance;
    const max = base + variance;
    return Math.floor(currentRandFn() * (max - min + 1)) + min;
}

function getEulReParticle(word) {
    if (!word || word.length === 0) return "를";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "와";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        dedication: 50, // 헌신
        stability: 50,  // 안정
        tradition: 50,  // 전통
        memory: 50,     // 기억
        service: 50,    // 봉사
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { old_books: 10, records: 10, ink: 5, historical_relics: 0 },
        librarians: [
            { id: "elliot", name: "엘리엇", personality: "꼼꼼한", skill: "기록 복원", cooperation: 70 },
            { id: "clara", name: "클라라", personality: "친절한", skill: "방문객 응대", cooperation: 60 }
        ],
        maxLibrarians: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { restorationSuccess: 0 },
        dailyActions: { organized: false, meetingHeld: false, chattedWith: [], minigamePlayed: false },
        archiveRooms: {
            memoryArchive: { built: false, durability: 100, name: "기억의 서고", description: "방대한 기억과 기록을 보관합니다.", effect_description: "기억 스탯 보너스 및 기록 자동 획득." },
            restorationRoom: { built: false, durability: 100, name: "복원의 방", description: "훼손된 낡은 책과 기록을 복원합니다.", effect_description: "봉사 능력 향상 및 낡은 책 생성." },
            mainHall: { built: false, durability: 100, name: "중앙 홀", description: "방문객들을 맞이하고 안내하는 공간입니다.", effect_description: "신규 사서 채용 및 안정성 강화." },
            specialArchive: { built: false, durability: 100, name: "특별 기록실", description: "중요한 역사적 유물을 보관합니다.", effect_description: "과거 유물을 통해 스탯 및 자원 획득." },
            communityLounge: { built: false, durability: 100, name: "커뮤니티 라운지", description: "방문객들이 쉬고 교류하는 공간입니다.", effect_description: "고급 교류 및 역사적 유물 활용 잠금 해제." }
        },
        libraryLevel: 0,
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('isfjLibraryGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('isfjLibraryGame');
    const today = new Date().toISOString().slice(0, 10);
    if (savedState) {
        let loaded = JSON.parse(savedState);
        if (!loaded.dailyBonus) loaded.dailyBonus = { restorationSuccess: 0 };
        if (!loaded.librarians || loaded.librarians.length === 0) {
            loaded.librarians = [
                { id: "elliot", name: "엘리엇", personality: "꼼꼼한", skill: "기록 복원", cooperation: 70 },
                { id: "clara", name: "클라라", personality: "친절한", skill: "방문객 응대", cooperation: 60 }
            ];
        }
        if (!loaded.memory) loaded.memory = 50;
        if (!loaded.service) loaded.service = 50;

        Object.assign(gameState, loaded);

        currentRandFn = mulberry32(getDailySeed() + gameState.day);

        if (gameState.lastPlayedDate !== today) {
            gameState.day += 1;
            gameState.lastPlayedDate = today;
            gameState.manualDayAdvances = 0;
            gameState.dailyEventTriggered = false;
            processDailyEvents();
        }
    } else {
        resetGameState();
        processDailyEvents();
    }
    renderAll();
}

function updateState(changes, displayMessage = null) {
    Object.keys(changes).forEach(key => {
        if (typeof changes[key] === 'object' && changes[key] !== null && !Array.isArray(changes[key])) {
            gameState[key] = { ...gameState[key], ...changes[key] };
        } else {
            gameState[key] = changes[key];
        }
    });
    saveGameState();
    renderAll(displayMessage);
}

// --- UI Rendering ---
function updateGameDisplay(text) {
    const gameArea = document.getElementById('gameArea');
    if(gameArea && text) gameArea.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
}

function renderStats() {
    const statsDiv = document.getElementById('gameStats');
    if (!statsDiv) return;
    const librarianListHtml = gameState.librarians.map(l => `<li>${l.name} (${l.skill}) - 협력: ${l.cooperation}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>개관:</b> ${gameState.day}일차</p>
        <p><b>업무력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>헌신:</b> ${gameState.dedication} | <b>안정:</b> ${gameState.stability} | <b>전통:</b> ${gameState.tradition} | <b>기억:</b> ${gameState.memory} | <b>봉사:</b> ${gameState.service}</p>
        <p><b>자원:</b> 낡은 책 ${gameState.resources.old_books}, 기록 ${gameState.resources.records}, 잉크 ${gameState.resources.ink}, 역사적 유물 ${gameState.resources.historical_relics || 0}</p>
        <p><b>도서관 레벨:</b> ${gameState.libraryLevel}</p>
        <p><b>동료 사서 (${gameState.librarians.length}/${gameState.maxLibrarians}):</b></p>
        <ul>${librarianListHtml}</ul>
        <p><b>기록실:</b></p>
        <ul>${Object.values(gameState.archiveRooms).filter(r => r.built).map(r => `<li>${r.name} (내구성: ${r.durability}) - ${r.effect_description}</li>`).join('') || '없음'}</ul>
    `;
    const manualDayCounter = document.getElementById('manualDayCounter');
    if(manualDayCounter) manualDayCounter.innerText = gameState.manualDayAdvances;
}

function renderChoices(choices) {
    const choicesDiv = document.getElementById('gameChoices');
    if (!choicesDiv) return;
    let dynamicChoices = [];

    if (gameState.currentScenarioId === 'intro') {
        dynamicChoices = gameScenarios.intro.choices;
    } else if (gameState.currentScenarioId === 'action_room_management') {
        dynamicChoices = gameScenarios.action_room_management.choices ? [...gameScenarios.action_room_management.choices] : [];
        if (!gameState.archiveRooms.memoryArchive.built) dynamicChoices.push({ text: "기억의 서고 구축 (낡은 책 50, 기록 20)", action: "build_memoryArchive" });
        if (!gameState.archiveRooms.restorationRoom.built) dynamicChoices.push({ text: "복원의 방 구축 (기록 30, 잉크 30)", action: "build_restorationRoom" });
        if (!gameState.archiveRooms.mainHall.built) dynamicChoices.push({ text: "중앙 홀 확장 (낡은 책 100, 기록 50, 잉크 50)", action: "build_mainHall" });
        if (!gameState.archiveRooms.specialArchive.built) dynamicChoices.push({ text: "특별 기록실 구축 (기록 80, 잉크 40)", action: "build_specialArchive" });
        if (gameState.archiveRooms.restorationRoom.built && gameState.archiveRooms.restorationRoom.durability > 0 && !gameState.archiveRooms.communityLounge.built) {
            dynamicChoices.push({ text: "커뮤니티 라운지 개설 (기록 50, 잉크 100)", action: "build_communityLounge" });
        }
        Object.keys(gameState.archiveRooms).forEach(key => {
            const room = gameState.archiveRooms[key];
            if (room.built && room.durability < 100) {
                dynamicChoices.push({ text: `${room.name} 보수 (기록 10, 잉크 10)`, action: "maintain_room", params: { room: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}'>${choice.text}</button>`).join('');
    choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (gameActions[action]) {
                gameActions[action](JSON.parse(button.dataset.params || '{}'));
            }
        });
    });
}

function renderAll(customDisplayMessage = null) {
    const desc = document.getElementById('gameDescription');
    if (desc) desc.style.display = 'none';
    renderStats();
    
    if (!gameState.currentScenarioId.startsWith('minigame_')) {
        const scenario = gameScenarios[gameState.currentScenarioId] || gameScenarios.intro;
        updateGameDisplay(customDisplayMessage || scenario.text);
        renderChoices(scenario.choices);
    }
}

// --- Game Data (to be themed for ISFJ) ---
const gameScenarios = {
    "intro": { text: "오늘은 도서관에서 무엇을 할까요?", choices: [
        { text: "서고 정리", action: "organize_stacks" },
        { text: "동료 사서와 대화", action: "chat_with_librarians" },
        { text: "정기 회의", action: "hold_regular_meeting" },
        { text: "자료 수집", action: "show_resource_gathering_options" },
        { text: "기록실 관리", action: "show_room_options" },
        { text: "조용한 휴식", action: "show_quiet_rest_options" },
        { text: "오늘의 업무", action: "play_minigame" }
    ]},
    // ... more ISFJ-themed scenarios
};

// ... (Full game logic will be implemented here)

// --- Initialization ---
window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', () => {
            if (gameState.manualDayAdvances >= 5) {
                updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요.");
                return;
            }
            updateState({
                manualDayAdvances: gameState.manualDayAdvances + 1,
                day: gameState.day + 1,
                lastPlayedDate: new Date().toISOString().slice(0, 10),
                dailyEventTriggered: false
            });
            processDailyEvents();
        });
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};