// today-game.js - ISFJ - 추억의 도서관 관리하기 (Managing the Library of Memories)

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
        dedication: 50,
        stability: 50,
        tradition: 50,
        memory: 50,
        service: 50,
        actionPoints: 10, // Represents '업무력'
        maxActionPoints: 10,
        resources: { old_books: 10, records: 10, ink: 5, historical_relics: 0 },
        librarians: [
            { id: "eleanor", name: "엘레노어", personality: "꼼꼼한", skill: "기록 복원", cooperation: 70 },
            { id: "arthur", name: "아서", personality: "친절한", skill: "방문객 응대", cooperation: 60 }
        ],
        maxLibrarians: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { restorationSuccess: 0 },
        dailyActions: { organized: false, heldMeeting: false, chattedWith: [], minigamePlayed: false },
        archive_rooms: {
            memoryArchive: { built: false, durability: 100, name: "기억의 서고", description: "오래된 기억과 기록을 보관합니다.", effect_description: "기록 자동 생성 및 기억력 보너스." },
            restorationRoom: { built: false, durability: 100, name: "복원의 방", description: "훼손된 기록을 복원하고 되살립니다.", effect_description: "잉크 생성 및 헌신도 향상." },
            centralHall: { built: false, durability: 100, name: "중앙 홀", description: "도서관의 중심 공간으로 방문객을 맞이합니다.", effect_description: "새로운 사서 영입 및 봉사 정신 강화." },
            specialArchive: { built: false, durability: 100, name: "특별 기록실", description: "매우 귀중한 역사적 기록을 보관합니다.", effect_description: "과거 기록을 통해 스탯 및 자원 획득." },
            communityLounge: { built: false, durability: 100, name: "커뮤니티 라운지", description: "방문객들이 쉬고 교류하는 공간입니다.", effect_description: "역사적 유물 획득 및 고급 활동 잠금 해제." }
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
        if (!loaded.archive_rooms) {
            loaded.archive_rooms = {
                memoryArchive: { built: false, durability: 100, name: "기억의 서고" },
                restorationRoom: { built: false, durability: 100, name: "복원의 방" },
                centralHall: { built: false, durability: 100, name: "중앙 홀" },
                specialArchive: { built: false, durability: 100, name: "특별 기록실" },
                communityLounge: { built: false, durability: 100, name: "커뮤니티 라운지" }
            };
        }
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
    const librarianListHtml = gameState.librarians.map(l => `<li>${l.name} (${l.skill}) - 협력도: ${l.cooperation}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>${gameState.day}일차 관리</b></p>
        <p><b>업무력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>헌신:</b> ${gameState.dedication} | <b>안정:</b> ${gameState.stability} | <b>전통:</b> ${gameState.tradition} | <b>기억:</b> ${gameState.memory} | <b>봉사:</b> ${gameState.service}</p>
        <p><b>자원:</b> 낡은 책 ${gameState.resources.old_books}, 기록 ${gameState.resources.records}, 잉크 ${gameState.resources.ink}, 역사적 유물 ${gameState.resources.historical_relics || 0}</p>
        <p><b>도서관 레벨:</b> ${gameState.libraryLevel}</p>
        <p><b>동료 사서 (${gameState.librarians.length}/${gameState.maxLibrarians}):</b></p>
        <ul>${librarianListHtml}</ul>
        <p><b>기록실:</b></p>
        <ul>${Object.values(gameState.archive_rooms).filter(r => r.built).map(r => `<li>${r.name} (내구성: ${r.durability})</li>`).join('') || '없음'}</ul>
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
        dynamicChoices = [];
        if (!gameState.archive_rooms.memoryArchive.built) dynamicChoices.push({ text: "기억의 서고 건설 (낡은 책 50, 기록 20)", action: "build_memoryArchive" });
        if (!gameState.archive_rooms.restorationRoom.built) dynamicChoices.push({ text: "복원의 방 건설 (기록 30, 잉크 30)", action: "build_restorationRoom" });
        if (!gameState.archive_rooms.centralHall.built) dynamicChoices.push({ text: "중앙 홀 건설 (낡은 책 100, 기록 50)", action: "build_centralHall" });
        if (!gameState.archive_rooms.specialArchive.built) dynamicChoices.push({ text: "특별 기록실 구축 (기록 80, 잉크 40)", action: "build_specialArchive" });
        if (gameState.archive_rooms.restorationRoom.built && !gameState.archive_rooms.communityLounge.built) {
            dynamicChoices.push({ text: "커뮤니티 라운지 조성 (기록 150, 역사적 유물 5)", action: "build_communityLounge" });
        }
        Object.keys(gameState.archive_rooms).forEach(key => {
            const room = gameState.archive_rooms[key];
            if (room.built && room.durability < 100) {
                dynamicChoices.push({ text: `${room.name} 보수 (기록 10, 잉크 10)`, action: "maintain_room", params: { room: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}' >${choice.text}</button>`).join('');
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

// --- Game Data (ISFJ Themed) ---
const gameScenarios = {
    "intro": { text: "오늘은 도서관을 위해 무엇을 하시겠습니까?", choices: [
        { text: "서고 정리", action: "organize_archives" },
        { text: "동료 사서와 대화", action: "chat_with_colleagues" },
        { text: "정기 회의", action: "hold_regular_meeting" },
        { text: "자료 수집", action: "show_resource_gathering_options" },
        { text: "기록실 관리", action: "show_room_management_options" },
        { text: "조용한 휴식", action: "show_quiet_rest_options" },
        { text: "오늘의 기록 복원", action: "play_minigame" }
    ]},
    "action_resource_gathering": {
        text: "어떤 자료를 수집하시겠습니까?",
        choices: [
            { text: "낡은 책 수집", action: "gather_old_books" },
            { text: "기록 정리", action: "organize_records" },
            { text: "잉크 제작", action: "make_ink" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    "action_room_management": { text: "어떤 기록실을 관리하시겠습니까?", choices: [] },
    "quiet_rest_menu": {
        text: "어떤 휴식을 취하시겠습니까?",
        choices: [
            { text: "오래된 앨범 보기 (업무력 1 소모)", action: "view_old_album" },
            { text: "분실물 찾기 (업무력 1 소모)", action: "find_lost_items" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    // Game Over Scenarios
    "game_over_dedication": { text: "헌신할 대상이 사라졌습니다. 도서관은 먼지 속에 잊혀집니다.", choices: [], final: true },
    "game_over_stability": { text: "도서관의 안정성이 무너졌습니다. 혼란 속에서 아무도 기록을 찾지 않습니다.", choices: [], final: true },
    "game_over_tradition": { text: "전통이 사라진 도서관은 더 이상 존재할 의미를 잃었습니다.", choices: [], final: true },
    "game_over_resources": { text: "도서관을 유지할 자원이 모두 소진되었습니다.", choices: [], final: true },
};

const organizeOutcomes = [
    { weight: 30, condition: (gs) => gs.memory > 60, effect: (gs) => { const v = getRandomValue(10, 5); return { changes: { stability: gs.stability + v }, message: `뛰어난 기억력으로 서고를 완벽하게 정리했습니다! (+${v} 안정)` }; } },
    { weight: 25, condition: () => true, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { tradition: gs.tradition + v }, message: `오래된 기록을 정리하며 도서관의 전통을 되새겼습니다. (+${v} 전통)` }; } },
    { weight: 20, condition: () => true, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { resources: { ...gs.resources, records: gs.resources.records - v } }, message: `정리 중 실수로 기록 일부를 훼손했습니다. (-${v} 기록)` }; } },
    { weight: 15, condition: (gs) => gs.memory < 40, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { service: gs.service - v }, message: `기억이 나지 않아 정리가 비효율적으로 진행됩니다. (-${v} 봉사)` }; } },
];

const chatOutcomes = [
    { weight: 40, condition: (gs, librarian) => librarian.cooperation < 80, effect: (gs, librarian) => { const v = getRandomValue(10, 5); const updated = gs.librarians.map(l => l.id === librarian.id ? { ...l, cooperation: Math.min(100, l.cooperation + v) } : l); return { changes: { librarians: updated }, message: `${librarian.name}${getWaGwaParticle(librarian.name)}의 따뜻한 대화로 협력도가 상승했습니다. (+${v} 협력도)` }; } },
    { weight: 30, condition: () => true, effect: (gs, librarian) => { const v = getRandomValue(5, 2); return { changes: { memory: gs.memory + v }, message: `${librarian.name}에게서 잊고 있던 사실을 전해 들었습니다. (+${v} 기억)` }; } },
    { weight: 20, condition: (gs) => gs.service < 40, effect: (gs, librarian) => { const v = getRandomValue(10, 3); const updated = gs.librarians.map(l => l.id === librarian.id ? { ...l, cooperation: Math.max(0, l.cooperation - v) } : l); return { changes: { librarians: updated }, message: `당신의 봉사 정신이 부족하여 ${librarian.name}이(가) 실망합니다. (-${v} 협력도)` }; } },
];

const meetingOutcomes = [
    { weight: 40, condition: (gs) => gs.stability > 60, effect: (gs) => { const v = getRandomValue(10, 3); return { changes: { tradition: gs.tradition + v }, message: `안정적인 회의 진행으로 도서관의 전통이 강화됩니다. (+${v} 전통)` }; } },
    { weight: 30, condition: () => true, effect: (gs) => { const v = getRandomValue(10, 3); return { changes: { service: gs.service + v }, message: `회의를 통해 방문객들을 위한 새로운 봉사 아이디어를 얻었습니다. (+${v} 봉사)` }; } },
    { weight: 20, condition: (gs) => gs.dedication < 40, effect: (gs) => { const v = getRandomValue(10, 4); return { changes: { stability: gs.stability - v }, message: `헌신이 부족하여 회의 분위기가 어수선합니다. (-${v} 안정)` }; } },
];

const minigames = [
    {
        name: "기록 복원하기",
        description: "찢어진 기록 조각들을 올바르게 맞추어 원래의 내용을 복원하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 0, pieces: ["기억", "사랑", "헌신", "전통"].sort(() => currentRandFn() - 0.5), solution: ["기억", "사랑", "헌신", "전통"] };
            minigames[0].render(gameArea, choicesDiv);
        },
        render: (gameArea, choicesDiv) => {
            const state = gameState.minigameState;
            gameArea.innerHTML = `<p>${minigames[0].description}</p><div id="puzzle-area"></div>`;
            choicesDiv.innerHTML = state.pieces.map(p => `<button class="choice-btn">${p}</button>`).join('');
            choicesDiv.querySelectorAll('.choice-btn').forEach(button => button.addEventListener('click', () => minigames[0].processAction('select_piece', button.innerText)));
        },
        processAction: (actionType, value) => {
            // Simplified logic for placeholder
            if (actionType === 'select_piece') {
                const state = gameState.minigameState;
                const puzzleArea = document.getElementById('puzzle-area');
                puzzleArea.innerText += value + " ";
                if (puzzleArea.innerText.trim().split(' ').length === state.solution.length) {
                    if (puzzleArea.innerText.trim() === state.solution.join(' ')) {
                        state.score = 100;
                    }
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({ memory: gameState.memory + rewards.memory, dedication: gameState.dedication + rewards.dedication, currentScenarioId: 'intro' }, rewards.message);
        }
    },
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { memory: 0, dedication: 0, message: "" };
    if (score >= 100) { rewards.memory = 15; rewards.dedication = 10; rewards.message = "완벽하게 기록을 복원했습니다! (+15 기억, +10 헌신)"; } 
    else { rewards.memory = 5; rewards.message = "기록을 복원했습니다. (+5 기억)"; }
    return rewards;
}

function spendActionPoint() {
    if (gameState.actionPoints <= 0) { updateGameDisplay("업무력이 부족합니다."); return false; }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    organize_archives: () => {
        if (!spendActionPoint()) return;
        const possibleOutcomes = organizeOutcomes.filter(o => !o.condition || o.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    chat_with_colleagues: () => {
        if (!spendActionPoint()) return;
        const librarian = gameState.librarians[Math.floor(currentRandFn() * gameState.librarians.length)];
        const possibleOutcomes = chatOutcomes.filter(o => !o.condition || o.condition(gameState, librarian));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState, librarian);
        updateState(result.changes, result.message);
    },
    hold_regular_meeting: () => {
        if (!spendActionPoint()) return;
        const possibleOutcomes = meetingOutcomes.filter(o => !o.condition || o.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    show_resource_gathering_options: () => updateState({ currentScenarioId: 'action_resource_gathering' }),
    show_room_management_options: () => updateState({ currentScenarioId: 'action_room_management' }),
    show_quiet_rest_options: () => updateState({ currentScenarioId: 'quiet_rest_menu' }),
    gather_old_books: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(10, 4);
        updateState({ resources: { ...gameState.resources, old_books: gameState.resources.old_books + gain } }, `낡은 책을 수집했습니다. (+${gain} 낡은 책)`);
    },
    organize_records: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(10, 4);
        updateState({ resources: { ...gameState.resources, records: gameState.resources.records + gain } }, `기록을 정리했습니다. (+${gain} 기록)`);
    },
    make_ink: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(5, 2);
        updateState({ resources: { ...gameState.resources, ink: gameState.resources.ink + gain } }, `잉크를 제작했습니다. (+${gain} 잉크)`);
    },
    build_memoryArchive: () => {
        if (!spendActionPoint()) return;
        const cost = { old_books: 50, records: 20 };
        if (gameState.resources.old_books >= cost.old_books && gameState.resources.records >= cost.records) {
            gameState.archive_rooms.memoryArchive.built = true;
            const v = getRandomValue(10, 3);
            updateState({ memory: gameState.memory + v, resources: { ...gameState.resources, old_books: gameState.resources.old_books - cost.old_books, records: gameState.resources.records - cost.records } }, `기억의 서고를 건설했습니다! (+${v} 기억)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_restorationRoom: () => {
        if (!spendActionPoint()) return;
        const cost = { records: 30, ink: 30 };
        if (gameState.resources.records >= cost.records && gameState.resources.ink >= cost.ink) {
            gameState.archive_rooms.restorationRoom.built = true;
            const v = getRandomValue(10, 3);
            updateState({ dedication: gameState.dedication + v, resources: { ...gameState.resources, records: gameState.resources.records - cost.records, ink: gameState.resources.ink - cost.ink } }, `복원의 방을 건설했습니다! (+${v} 헌신)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_centralHall: () => {
        if (!spendActionPoint()) return;
        const cost = { old_books: 100, records: 50 };
        if (gameState.resources.old_books >= cost.old_books && gameState.resources.records >= cost.records) {
            gameState.archive_rooms.centralHall.built = true;
            const v = getRandomValue(15, 5);
            updateState({ service: gameState.service + v, resources: { ...gameState.resources, old_books: gameState.resources.old_books - cost.old_books, records: gameState.resources.records - cost.records } }, `중앙 홀을 건설했습니다! (+${v} 봉사)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_specialArchive: () => {
        if (!spendActionPoint()) return;
        const cost = { records: 80, ink: 40 };
        if (gameState.resources.records >= cost.records && gameState.resources.ink >= cost.ink) {
            gameState.archive_rooms.specialArchive.built = true;
            const v = getRandomValue(15, 5);
            updateState({ tradition: gameState.tradition + v, resources: { ...gameState.resources, records: gameState.resources.records - cost.records, ink: gameState.resources.ink - cost.ink } }, `특별 기록실을 구축했습니다! (+${v} 전통)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_communityLounge: () => {
        if (!spendActionPoint()) return;
        const cost = { records: 150, historical_relics: 5 };
        if (gameState.resources.records >= cost.records && gameState.resources.historical_relics >= cost.historical_relics) {
            gameState.archive_rooms.communityLounge.built = true;
            const v = getRandomValue(20, 5);
            updateState({ stability: gameState.stability + v, resources: { ...gameState.resources, records: gameState.resources.records - cost.records, historical_relics: gameState.resources.historical_relics - cost.historical_relics } }, `커뮤니티 라운지를 조성했습니다! (+${v} 안정)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    maintain_room: (params) => {
        if (!spendActionPoint()) return;
        const roomKey = params.room;
        const cost = { records: 10, ink: 10 };
        if (gameState.resources.records >= cost.records && gameState.resources.ink >= cost.ink) {
            gameState.archive_rooms[roomKey].durability = 100;
            updateState({ resources: { ...gameState.resources, records: gameState.resources.records - cost.records, ink: gameState.resources.ink - cost.ink } }, `${gameState.archive_rooms[roomKey].name}을(를) 보수했습니다.`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    view_old_album: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.3) {
            const v = getRandomValue(1, 1);
            updateState({ resources: { ...gameState.resources, historical_relics: (gameState.resources.historical_relics || 0) + v } }, `오래된 앨범에서 중요한 역사적 유물을 발견했습니다! (+${v} 역사적 유물)`);
        } else {
            const v = getRandomValue(10, 5);
            updateState({ memory: gameState.memory + v }, `앨범을 보며 잊고 있던 소중한 기억을 떠올렸습니다. (+${v} 기억)`);
        }
    },
    find_lost_items: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.6) {
            const v = getRandomValue(10, 5);
            updateState({ resources: { ...gameState.resources, records: gameState.resources.records + v } }, `분실물 함에서 가치 있는 기록을 발견했습니다. (+${v} 기록)`);
        } else {
            updateState({}, `아무것도 발견하지 못했습니다.`);
        }
    },
    play_minigame: () => {
        if (!spendActionPoint()) return;
        const minigame = minigames[0];
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 다음 날로 넘어갈 수 없습니다."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
};

function applyStatEffects() {
    let message = "";
    if (gameState.dedication >= 70) { message += "당신의 헌신적인 태도에 모두가 감동합니다. "; }
    if (gameState.stability >= 70) { const v = getRandomValue(5, 2); gameState.resources.records += v; message += `도서관이 안정되어 새로운 기록이 발견됩니다. (+${v} 기록) `; }
    if (gameState.tradition >= 70) { const v = getRandomValue(2, 1); gameState.librarians.forEach(l => l.cooperation = Math.min(100, l.cooperation + v)); message += `도서관의 전통이 사서들의 협력도를 높입니다. (+${v} 협력도) `; }
    if (gameState.memory < 30) { gameState.actionPoints -= 1; message += "기억력이 감퇴하여 업무력이 1 감소합니다. "; }
    if (gameState.service < 30) { Object.keys(gameState.archive_rooms).forEach(key => { if(gameState.archive_rooms[key].built) gameState.archive_rooms[key].durability -= 1; }); message += "봉사 정신이 부족하여 기록실이 노후화됩니다. "; }
    return message;
}

const weightedDailyEvents = [
    { id: "visitor_complaint", weight: 10, condition: () => gameState.service < 40, onTrigger: () => { const v = getRandomValue(10, 3); updateState({ service: gameState.service - v, stability: gameState.stability - v }, `방문객의 불만이 접수되었습니다. (-${v} 봉사, -${v} 안정)`); } },
    { id: "bookworm_outbreak", weight: 5, condition: () => true, onTrigger: () => { const v = getRandomValue(15, 5); updateState({ resources: { ...gameState.resources, old_books: Math.max(0, gameState.resources.old_books - v) }, stability: gameState.stability - 5 }, `책벌레가 발생하여 낡은 책이 훼손되었습니다. (-${v} 낡은 책, -5 안정)`); } },
    { id: "new_donation", weight: 15, condition: () => true, onTrigger: () => { const v = getRandomValue(10, 5); updateState({ tradition: gameState.tradition + v }, `귀중한 기록이 기증되었습니다! (+${v} 전통)`); } },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
    updateState({ actionPoints: 10, dailyEventTriggered: true });
    const statEffectMessage = applyStatEffects();
    let dailyMessage = "도서관에 새로운 아침이 밝았습니다. " + statEffectMessage;

    if (gameState.dedication <= 0) { gameState.currentScenarioId = "game_over_dedication"; }
    else if (gameState.stability <= 0) { gameState.currentScenarioId = "game_over_stability"; }
    else if (gameState.tradition <= 0) { gameState.currentScenarioId = "game_over_tradition"; }
    else if (gameState.resources.old_books <= 0 && gameState.day > 1) { gameState.currentScenarioId = "game_over_resources"; }

    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    if (possibleEvents.length > 0) {
        const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenEvent = possibleEvents.find(event => (cumulativeWeight += event.weight) >= rand);
        if (chosenEvent) {
            eventId = chosenEvent.id;
            if (chosenEvent.onTrigger) chosenEvent.onTrigger();
        }
    }
    if (!gameScenarios[gameState.currentScenarioId]) {
        gameState.currentScenarioId = eventId;
    }
    updateGameDisplay(dailyMessage + (gameScenarios[gameState.currentScenarioId]?.text || ''));
    renderChoices(gameScenarios[gameState.currentScenarioId]?.choices || []);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 도서관을 처음부터 다시 관리하시겠습니까? 모든 기록이 사라집니다.")) {
        localStorage.removeItem('isfjLibraryGame');
        resetGameState();
        saveGameState();
        location.reload();
    }
}

window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', gameActions.manualNextDay);
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};