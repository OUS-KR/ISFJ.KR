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
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

function showFeedback(isSuccess, message) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    if (feedbackMessage) {
        feedbackMessage.innerText = message;
        feedbackMessage.className = `feedback-message ${isSuccess ? 'correct' : 'incorrect'}`;
    }
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
        actionPoints: 10, // Internally actionPoints, but represents '업무력' in UI
        maxActionPoints: 10,
        resources: { old_books: 10, records: 10, ink: 5, historical_artifacts: 0 },
        librarians: [
            { id: "anna", name: "안나", personality: "꼼꼼한", skill: "기록 복원", trust: 70 },
            { id: "ben", name: "벤", personality: "친절한", skill: "방문객 응대", trust: 60 }
        ],
        maxLibrarians: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { restorationSuccess: 0 }, // Re-themed from gatheringSuccess
        dailyActions: { organized: false, chatted: false, met: false, minigamePlayed: false }, // Re-themed
        recordRooms: {
            archiveOfMemories: { built: false, durability: 100, name: "기억의 서고", description: "오래된 기록들을 안전하게 보관합니다.", effect_description: "기억 및 안정 증가." },
            restorationRoom: { built: false, durability: 100, name: "복원의 방", description: "훼손된 기록들을 복원하고 보존합니다.", effect_description: "헌신 및 전통 증가." },
            centralHall: { built: false, durability: 100, name: "중앙 홀", description: "방문객들을 맞이하고 도서관의 중심 역할을 합니다.", effect_description: "봉사 및 안정 증가." },
            specialArchive: { built: false, durability: 100, name: "특별 기록실", description: "희귀하고 중요한 기록들을 특별 관리합니다.", effect_description: "기억 및 전통 증가." },
            communityLounge: { built: false, durability: 100, name: "커뮤니티 라운지", description: "방문객과 사서들이 교류하는 공간입니다.", effect_description: "봉사 및 헌신 증가." }
        },
        libraryLevel: 0, // Re-themed from toolsLevel
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
        // Patch for old save files
        if (!loaded.dailyBonus) loaded.dailyBonus = { restorationSuccess: 0 };
        if (!loaded.librarians || loaded.librarians.length === 0) {
            loaded.librarians = [
                { id: "anna", name: "안나", personality: "꼼꼼한", skill: "기록 복원", trust: 70 },
                { id: "ben", name: "벤", personality: "친절한", skill: "방문객 응대", trust: 60 }
            ];
        }
        // Ensure new stats are initialized if loading old save
        if (loaded.dedication === undefined) loaded.dedication = 50;
        if (loaded.stability === undefined) loaded.stability = 50;
        if (loaded.tradition === undefined) loaded.tradition = 50;
        if (loaded.memory === undefined) loaded.memory = 50;
        if (loaded.service === undefined) loaded.service = 50;
        if (loaded.libraryLevel === undefined) loaded.libraryLevel = 0;

        Object.assign(gameState, loaded);

        // Always initialize currentRandFn after loading state
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
    const librarianListHtml = gameState.librarians.map(l => `<li>${l.name} (${l.skill}) - 신뢰도: ${l.trust}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>날짜:</b> ${gameState.day}일</p>
        <p><b>업무력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>헌신:</b> ${gameState.dedication} | <b>안정:</b> ${gameState.stability} | <b>전통:</b> ${gameState.tradition} | <b>기억:</b> ${gameState.memory} | <b>봉사:</b> ${gameState.service}</p>
        <p><b>자원:</b> 낡은 책 ${gameState.resources.old_books}, 기록 ${gameState.resources.records}, 잉크 ${gameState.resources.ink}, 역사적 유물 ${gameState.resources.historical_artifacts || 0}</p>
        <p><b>도서관 레벨:</b> ${gameState.libraryLevel}</p>
        <p><b>사서 (${gameState.librarians.length}/${gameState.maxLibrarians}):</b></p>
        <ul>${librarianListHtml}</ul>
        <p><b>구축된 기록실:</b></p>
        <ul>${Object.values(gameState.recordRooms).filter(r => r.built).map(r => `<li>${r.name} (내구도: ${r.durability}) - ${r.effect_description}</li>`).join('') || '없음'}</ul>
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
    } else if (gameState.currentScenarioId === 'action_record_room_management') {
        dynamicChoices = gameScenarios.action_record_room_management.choices ? [...gameScenarios.action_record_room_management.choices] : [];
        // Build options
        if (!gameState.recordRooms.archiveOfMemories.built) dynamicChoices.push({ text: "기억의 서고 구축 (낡은 책 50, 기록 20)", action: "build_archiveOfMemories" });
        if (!gameState.recordRooms.restorationRoom.built) dynamicChoices.push({ text: "복원의 방 구축 (기록 30, 잉크 30)", action: "build_restorationRoom" });
        if (!gameState.recordRooms.centralHall.built) dynamicChoices.push({ text: "중앙 홀 구축 (낡은 책 100, 기록 50, 잉크 50)", action: "build_centralHall" });
        if (!gameState.recordRooms.specialArchive.built) dynamicChoices.push({ text: "특별 기록실 구축 (기록 80, 잉크 40)", action: "build_specialArchive" });
        if (gameState.recordRooms.restorationRoom.built && gameState.recordRooms.restorationRoom.durability > 0 && !gameState.recordRooms.communityLounge.built) {
            dynamicChoices.push({ text: "커뮤니티 라운지 구축 (기록 50, 잉크 100)", action: "build_communityLounge" });
        }
        // Maintenance options
        Object.keys(gameState.recordRooms).forEach(key => {
            const room = gameState.recordRooms[key];
            if (room.built && room.durability < 100) {
                dynamicChoices.push({ text: `${room.name} 보수 (기록 10, 잉크 10)`, action: "maintain_record_room", params: { room: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else { // For any other scenario, use its predefined choices
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

// --- Game Data ---
const gameScenarios = {
    "intro": { text: "추억의 도서관에서 무엇을 할까요?", choices: [
        { text: "서고 정리", action: "organize_archive" },
        { text: "동료 사서와 대화", action: "chat_with_librarian" },
        { text: "정기 회의 개최", action: "hold_meeting" },
        { text: "자료 수집", action: "show_material_collection_options" },
        { text: "기록실 관리", action: "show_record_room_management_options" },
        { text: "조용한 휴식", action: "show_quiet_rest_options" },
        { text: "오늘의 기록", action: "play_minigame" }
    ]},
    "daily_event_visitor_complaint": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_bookworm_infestation": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_lost_artifact": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_librarian_dispute": {
        text: "안나와 벤 사이에 업무 방식에 대한 작은 의견 차이가 생겼습니다. 둘 다 당신의 판단을 기다리는 것 같습니다.",
        choices: [
            { text: "안나의 관점을 먼저 들어준다.", action: "handle_librarian_dispute", params: { first: "anna", second: "ben" } },
            { text: "벤의 관점을 먼저 들어준다.", action: "handle_librarian_dispute", params: { first: "ben", second: "anna" } },
            { text: "둘을 불러 조화로운 해결책을 찾는다.", action: "mediate_librarian_dispute" },
            { text: "신경 쓰지 않는다.", action: "ignore_event" }
        ]
    },
    "daily_event_new_librarian": {
        choices: [
            { text: "유능한 사서를 영입한다.", action: "welcome_new_unique_librarian" },
            { text: "도서관에 필요한지 좀 더 지켜본다.", action: "observe_librarian" },
            { text: "정중히 거절한다.", action: "reject_librarian" }
        ]
    },
    "daily_event_historical_discovery": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_forgotten_tradition": {
        text: "오랫동안 잊혀졌던 도서관의 전통이 발견되었습니다. 이를 복원할 기회입니다.",
        choices: [
            { text: "전통을 복원한다 (업무력 1 소모)", action: "restore_tradition" },
            { text: "지금은 다른 일에 집중한다", action: "decline_tradition_restoration" }
        ]
    },
    "daily_event_memory_loss": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_service_crisis": {
        text: "도서관 서비스에 대한 불만이 커지고 있습니다. 방문객들의 봉사 만족도가 흔들립니다.",
        choices: [
            { text: "서비스 개선 방안을 모색한다 (업무력 1 소모)", action: "improve_service" },
            { text: "현상 유지를 고수한다", action: "maintain_current_service" }
        ]
    },
    "game_over_dedication": { text: "도서관에 대한 헌신이 사라져 더 이상 기록을 돌볼 수 없습니다. 추억의 도서관은 폐쇄되었습니다.", choices: [], final: true },
    "game_over_stability": { text: "도서관의 안정이 무너져 모든 기록이 혼란에 빠졌습니다. 추억의 도서관은 붕괴되었습니다.", choices: [], final: true },
    "game_over_tradition": { text: "도서관의 전통이 사라져 정체성을 잃었습니다. 추억의 도서관은 잊혀졌습니다.", choices: [], final: true },
    "game_over_memory": { text: "도서관의 기억이 유실되어 더 이상 과거를 알 수 없습니다. 추억의 도서관은 공허해졌습니다.", choices: [], final: true },
    "game_over_service": { text: "도서관의 봉사가 중단되어 방문객들이 떠나기 시작했습니다. 추억의 도서관은 버려졌습니다.", choices: [], final: true },
    "game_over_resources": { text: "도서관의 자원이 모두 고갈되어 더 이상 운영할 수 없습니다.", choices: [], final: true },
    "action_material_collection": {
        text: "어떤 자료를 수집하시겠습니까?",
        choices: [
            { text: "낡은 책 수집", action: "collect_old_books" },
            { text: "기록 복원", action: "restore_records" },
            { text: "잉크 확보", "action": "secure_ink" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_record_room_management": {
        text: "어떤 기록실을 관리하시겠습니까?",
        choices: [] // Choices will be dynamically added in renderChoices
    },
    "material_collection_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_material_collection_options" }] // Return to gathering menu
    },
    "record_room_management_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_record_room_management_options" }] // Return to facility management menu
    },
    "librarian_dispute_resolution_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "quiet_rest_menu": {
        text: "어떤 조용한 휴식을 취하시겠습니까?",
        choices: [
            { text: "오래된 앨범 보기 (업무력 1 소모)", action: "view_old_albums" },
            { text: "분실물 찾기 (업무력 1 소모)", action: "find_lost_items" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
};

const meetingOutcomes = [
    {
        condition: (gs) => gs.stability < 40,
        weight: 40,
        effect: (gs) => {
            const stabilityLoss = getRandomValue(10, 4);
            const traditionLoss = getRandomValue(5, 2);
            const dedicationLoss = getRandomValue(5, 2);
            return {
                changes: { stability: gs.stability - stabilityLoss, tradition: gs.tradition - traditionLoss, dedication: gs.dedication - dedicationLoss },
                message: `회의를 시작하자마자 사서들의 불만이 터져 나왔습니다. 낮은 안정으로 인해 분위기가 험악합니다. (-${stabilityLoss} 안정, -${traditionLoss} 전통, -${dedicationLoss} 헌신)`
            };
        }
    },
    {
        condition: (gs) => gs.service > 70 && gs.dedication > 60,
        weight: 30,
        effect: (gs) => {
            const stabilityGain = getRandomValue(15, 5);
            const traditionGain = getRandomValue(10, 3);
            const dedicationGain = getRandomValue(10, 3);
            return {
                changes: { stability: gs.stability + stabilityGain, tradition: gs.tradition + traditionGain, dedication: gs.dedication + dedicationGain },
                message: `높은 봉사 정신과 헌신을 바탕으로 건설적인 회의가 진행되었습니다! (+${stabilityGain} 안정, +${traditionGain} 전통, +${dedicationGain} 헌신)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.old_books < gs.librarians.length * 4,
        weight: 25,
        effect: (gs) => {
            const memoryGain = getRandomValue(10, 3);
            const stabilityGain = getRandomValue(5, 2);
            return {
                changes: { memory: gs.memory + memoryGain, stability: gs.stability + stabilityGain },
                message: `낡은 책이 부족한 상황에 대해 논의했습니다. 모두가 효율적인 자료 관리에 동의하며 당신의 리더십을 신뢰했습니다. (+${memoryGain} 기억, +${stabilityGain} 안정)`
            };
        }
    },
    {
        condition: (gs) => gs.librarians.some(l => l.trust < 50),
        weight: 20,
        effect: (gs) => {
            const librarian = gs.librarians.find(l => l.trust < 50);
            const trustGain = getRandomValue(10, 4);
            const dedicationGain = getRandomValue(5, 2);
            const stabilityGain = getRandomValue(5, 2);
            const updatedLibrarians = gs.librarians.map(l => l.id === librarian.id ? { ...l, trust: Math.min(100, l.trust + trustGain) } : l);
            return {
                changes: { librarians: updatedLibrarians, dedication: gs.dedication + dedicationGain, stability: gs.stability + stabilityGain },
                message: `회의 중, ${librarian.name}이(가) 조심스럽게 불만을 토로했습니다. 그의 의견을 존중하고 해결을 약속하자 신뢰를 얻었습니다. (+${trustGain} ${librarian.name} 신뢰도, +${dedicationGain} 헌신, +${stabilityGain} 안정)`
            };
        }
    },
    {
        condition: () => true, // Default positive outcome
        weight: 20,
        effect: (gs) => {
            const stabilityGain = getRandomValue(5, 2);
            const traditionGain = getRandomValue(3, 1);
            return {
                changes: { stability: gs.stability + stabilityGain, tradition: gs.tradition + traditionGain },
                message: `평범한 회의였지만, 모두가 한자리에 모여 의견을 나눈 것만으로도 의미가 있었습니다. (+${stabilityGain} 안정, +${traditionGain} 전통)`
            };
        }
    },
    {
        condition: (gs) => gs.tradition < 40 || gs.dedication < 40,
        weight: 25, // Increased weight when conditions met
        effect: (gs) => {
            const stabilityLoss = getRandomValue(5, 2);
            const traditionLoss = getRandomValue(5, 2);
            const dedicationLoss = getRandomValue(5, 2);
            return {
                changes: { stability: gs.stability - stabilityLoss, tradition: gs.tradition - traditionLoss, dedication: gs.dedication - dedicationLoss },
                message: `회의는 길어졌지만, 의견 차이만 확인하고 끝났습니다. 사서들의 안정과 전통, 당신의 헌신이 약간 감소했습니다. (-${stabilityLoss} 안정, -${traditionLoss} 전통, -${dedicationLoss} 헌신)`
            };
        }
    }
];

const organizeArchiveOutcomes = [
    {
        condition: (gs) => gs.resources.old_books < 20,
        weight: 30,
        effect: (gs) => {
            const oldBooksGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, old_books: gs.resources.old_books + oldBooksGain } },
                message: `서고 정리 중 낡은 책을 발견했습니다! (+${oldBooksGain} 낡은 책)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.records < 20,
        weight: 25,
        effect: (gs) => {
            const recordsGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, records: gs.resources.records + recordsGain } },
                message: `서고 정리 중 훼손된 기록을 발견했습니다! (+${recordsGain} 기록)`
            };
        }
    },
    {
        condition: () => true, // General positive discovery
        weight: 20,
        effect: (gs) => {
            const memoryGain = getRandomValue(5, 2);
            const traditionGain = getRandomValue(5, 2);
            return {
                changes: { memory: gs.memory + memoryGain, tradition: gs.tradition + traditionGain },
                message: `서고를 정리하며 새로운 기억과 전통을 얻었습니다. (+${memoryGain} 기억, +${traditionGain} 전통)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 25, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const actionLoss = getRandomValue(2, 1);
            const stabilityLoss = getRandomValue(5, 2);
            const memoryLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, stability: gs.stability - stabilityLoss, memory: gs.memory - memoryLoss },
                message: `서고 정리에 너무 깊이 빠져 업무력을 소모하고 안정과 기억이 감소했습니다. (-${actionLoss} 업무력, -${stabilityLoss} 안정, -${memoryLoss} 기억)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 15, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const dedicationLoss = getRandomValue(5, 2);
            const serviceLoss = getRandomValue(5, 2);
            return {
                changes: { dedication: gs.dedication - dedicationLoss, service: gs.service - serviceLoss },
                message: `서고 정리 중 예상치 못한 어려움에 부딪혀 헌신과 봉사가 약간 감소했습니다. (-${dedicationLoss} 헌신, -${serviceLoss} 봉사)`
            };
        }
    }
];

const chatWithLibrarianOutcomes = [
    {
        condition: (gs, librarian) => librarian.trust < 60,
        weight: 40,
        effect: (gs, librarian) => {
            const trustGain = getRandomValue(10, 5);
            const dedicationGain = getRandomValue(5, 2);
            const serviceGain = getRandomValue(5, 2);
            const updatedLibrarians = gs.librarians.map(l => l.id === librarian.id ? { ...l, trust: Math.min(100, l.trust + trustGain) } : l);
            return {
                changes: { librarians: updatedLibrarians, dedication: gs.dedication + dedicationGain, service: gs.service + serviceGain },
                message: `${librarian.name}${getWaGwaParticle(librarian.name)} 깊은 대화를 나누며 신뢰와 당신의 봉사 정신을 얻었습니다. (+${trustGain} ${librarian.name} 신뢰도, +${dedicationGain} 헌신, +${serviceGain} 봉사)`
            };
        }
    },
    {
        condition: (gs, librarian) => librarian.personality === "친절한",
        weight: 20,
        effect: (gs, librarian) => {
            const serviceGain = getRandomValue(10, 3);
            const dedicationGain = getRandomValue(5, 2);
            return {
                changes: { service: gs.service + serviceGain, dedication: gs.dedication + dedicationGain },
                message: `${librarian.name}${getWaGwaParticle(librarian.name)}와 즐거운 대화를 나누며 봉사 정신과 헌신이 상승했습니다. (+${serviceGain} 봉사, +${dedicationGain} 헌신)`
            };
        }
    },
    {
        condition: (gs, librarian) => librarian.skill === "기록 복원",
        weight: 15,
        effect: (gs, librarian) => {
            const recordsGain = getRandomValue(5, 2);
            return {
                changes: { resources: { ...gs.resources, records: gs.resources.records + recordsGain } },
                message: `${librarian.name}${getWaGwaParticle(librarian.name)}에게서 기록 복원에 대한 유용한 정보를 얻어 기록을 추가로 확보했습니다. (+${recordsGain} 기록)`
            };
        }
    },
    {
        condition: (gs, librarian) => true, // Default positive outcome
        weight: 25,
        effect: (gs, librarian) => {
            const stabilityGain = getRandomValue(5, 2);
            const memoryGain = getRandomValue(3, 1);
            return {
                changes: { stability: gs.stability + stabilityGain, memory: gs.memory + memoryGain },
                message: `${librarian.name}${getWaGwaParticle(librarian.name)} 소소한 이야기를 나누며 안정과 당신의 기억이 조금 더 단단해졌습니다. (+${stabilityGain} 안정, +${memoryGain} 기억)`
            };
        }
    },
    {
        condition: (gs, librarian) => gs.stability < 40 || librarian.trust < 40,
        weight: 20, // Increased weight when conditions met
        effect: (gs, librarian) => {
            const trustLoss = getRandomValue(10, 3);
            const stabilityLoss = getRandomValue(5, 2);
            const dedicationLoss = getRandomValue(5, 2);
            const updatedLibrarians = gs.librarians.map(l => l.id === librarian.id ? { ...l, trust: Math.max(0, l.trust - trustLoss) } : l);
            return {
                changes: { librarians: updatedLibrarians, stability: gs.stability - stabilityLoss, dedication: gs.dedication - dedicationLoss },
                message: `${librarian.name}${getWaGwaParticle(librarian.name)} 대화 중 오해를 사서 신뢰도와 안정, 당신의 헌신이 감소했습니다. (-${trustLoss} ${librarian.name} 신뢰도, -${stabilityLoss} 안정, -${dedicationLoss} 헌신)`
            };
        }
    },
    {
        condition: (gs) => gs.stability < 30,
        weight: 15, // Increased weight when conditions met
        effect: (gs, librarian) => {
            const actionLoss = getRandomValue(1, 0);
            const memoryLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, memory: gs.memory - memoryLoss },
                message: `${librarian.name}${getWaGwaParticle(librarian.name)} 대화가 길어졌지만, 특별한 소득은 없었습니다. 당신의 기억이 감소했습니다. (-${actionLoss} 업무력, -${memoryLoss} 기억)`
            };
        }
    }
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { dedication: 0, stability: 0, tradition: 0, memory: 0, service: 0, message: "" };

    switch (minigameName) {
        case "기록 복원하기":
            if (score >= 51) {
                rewards.dedication = 15;
                rewards.memory = 10;
                rewards.stability = 5;
                rewards.service = 5;
                rewards.message = `최고의 기록 복원 전문가가 되셨습니다! (+15 헌신, +10 기억, +5 안정, +5 봉사)`;
            } else if (score >= 21) {
                rewards.dedication = 10;
                rewards.memory = 5;
                rewards.stability = 3;
                rewards.message = `훌륭한 기록 복원입니다! (+10 헌신, +5 기억, +3 안정)`;
            } else {
                rewards.dedication = 5;
                rewards.message = `기록 복원하기를 완료했습니다. (+5 헌신)`;
            }
            break;
        case "고문서 해독 챌린지": // Placeholder for now, but re-themed
            rewards.memory = 2;
            rewards.tradition = 1;
            rewards.message = `고문서 해독 챌린지를 완료했습니다. (+2 기억, +1 전통)`;
            break;
        case "도서관 미로 찾기": // Placeholder for now, but re-themed
            rewards.stability = 2;
            rewards.dedication = 1;
            rewards.message = `도서관 미로 찾기를 완료했습니다. (+2 안정, +1 헌신)`;
            break;
        case "방문객 응대 시뮬레이션": // Placeholder for now, but re-themed
            rewards.service = 2;
            rewards.memory = 1;
            rewards.message = `방문객 응대 시뮬레이션을 완료했습니다. (+2 봉사, +1 기억)`;
            break;
        case "전통 의식 재현": // Placeholder for now, but re-themed
            rewards.tradition = 2;
            rewards.service = 1;
            rewards.message = `전통 의식 재현을 완료했습니다. (+2 전통, +1 봉사)`;
            break;
        default:
            rewards.message = `미니게임 ${minigameName}${getEulReParticle(minigameName)} 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "기록 복원하기",
        description: "훼손된 기록 조각들을 맞춰 원래의 기록을 복원하세요. 정확하고 빠르게 복원할수록 높은 점수를 얻습니다!",
        start: (gameArea, choicesDiv) => {
            const fragments = ["오래된", "지식", "기록", "도서관", "추억", "역사", "전통", "보존", "관리", "봉사"];
            gameState.minigameState = {
                targetRecord: fragments.sort(() => currentRandFn() - 0.5).slice(0, 3).join(' '),
                restoredFragments: [],
                score: 0,
                fragmentInput: ""
            };
            minigames[0].render(gameArea, choicesDiv);
        },
        render: (gameArea, choicesDiv) => {
            const state = gameState.minigameState;
            gameArea.innerHTML = `
                <p><b>목표 기록:</b> ${state.targetRecord}</p>
                <p><b>복원된 조각:</b> ${state.restoredFragments.join(' ')}</p>
                <p><b>점수:</b> ${state.score}</p>
                <input type="text" id="recordFragmentInput" placeholder="기록 조각을 입력하세요" style="font-size: 1.2em; padding: 8px; width: 80%; margin-top: 10px;" autocomplete="off">
            `;
            choicesDiv.innerHTML = `
                <button class="choice-btn" data-action="addFragment">조각 추가</button>
                <button class="choice-btn" data-action="completeRestoration">복원 완료</button>
            `;
            const input = document.getElementById('recordFragmentInput');
            input.value = state.fragmentInput;
            input.focus();
            input.addEventListener('input', (e) => { state.fragmentInput = e.target.value; });
            choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const action = button.dataset.action;
                    if (action === "addFragment") {
                        minigames[0].processAction('addFragment', state.fragmentInput);
                    } else if (action === "completeRestoration") {
                        minigames[0].processAction('completeRestoration');
                    }
                });
            });
        },
        processAction: (actionType, value = null) => {
            const state = gameState.minigameState;
            if (actionType === 'addFragment') {
                const fragment = value.trim();
                if (fragment.length > 0) {
                    state.restoredFragments.push(fragment);
                    state.score += fragment.length * 2; // Score based on fragment length
                    state.fragmentInput = "";
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                }
            } else if (actionType === 'completeRestoration') {
                if (state.restoredFragments.join(' ') === state.targetRecord) {
                    state.score += 100;
                    updateGameDisplay("기록 복원 성공! 완벽하게 복원되었습니다.");
                    minigames[0].end();
                } else {
                    updateGameDisplay("기록 복원 실패! 원래 기록과 다릅니다.");
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                dedication: gameState.dedication + rewards.dedication,
                stability: gameState.stability + rewards.stability,
                tradition: gameState.tradition + rewards.tradition,
                memory: gameState.memory + rewards.memory,
                service: gameState.service + rewards.service,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "고문서 해독 챌린지",
        description: "오래된 고문서에 숨겨진 의미를 해독하는 챌린지입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 10 };
            gameArea.innerHTML = `<p>${minigames[1].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[1].processAction('endGame')">게임 종료</button>`;
        },
        render: () {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[1].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[1].name, gameState.minigameState.score);
            updateState({
                memory: gameState.memory + rewards.memory,
                tradition: gameState.tradition + rewards.tradition,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "도서관 미로 찾기",
        description: "복잡한 서고에서 원하는 책을 찾아 미로를 탈출하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 15 };
            gameArea.innerHTML = `<p>${minigames[2].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[2].processAction('endGame')">게임 종료</button>`;
        },
        render: () {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[2].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[2].name, gameState.minigameState.score);
            updateState({
                stability: gameState.stability + rewards.stability,
                dedication: gameState.dedication + rewards.dedication,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "방문객 응대 시뮬레이션",
        description: "다양한 방문객들의 질문과 요청에 친절하고 정확하게 응대하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 20 };
            gameArea.innerHTML = `<p>${minigames[3].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[3].processAction('endGame')">게임 종료</button>`;
        },
        render: () {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[3].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[3].name, gameState.minigameState.score);
            updateState({
                service: gameState.service + rewards.service,
                memory: gameState.memory + rewards.memory,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "전통 의식 재현",
        description: "도서관의 오래된 전통 의식을 정확한 절차에 따라 재현하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 25 };
            gameArea.innerHTML = `<p>${minigames[4].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[4].processAction('endGame')">게임 종료</button>`;
        },
        render: () {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[4].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[4].name, gameState.minigameState.score);
            updateState({
                tradition: gameState.tradition + rewards.tradition,
                service: gameState.service + rewards.service,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    }
];

// --- Game Actions ---
function spendActionPoint() {
    if (gameState.actionPoints <= 0) {
        updateGameDisplay("업무력이 부족합니다.");
        return false;
    }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    organize_archive: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = organizeArchiveOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = organizeArchiveOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, organized: true } }, result.message);
    },
    chat_with_librarian: () => {
        if (!spendActionPoint()) return;
        const librarian = gameState.librarians[Math.floor(currentRandFn() * gameState.librarians.length)];
        if (gameState.dailyActions.chatted) { updateState({ dailyActions: { ...gameState.dailyActions, chatted: true } }, `${librarian.name}${getWaGwaParticle(librarian.name)} 이미 충분히 대화했습니다.`); return; }

        const possibleOutcomes = chatWithLibrarianOutcomes.filter(outcome => outcome.condition(gameState, librarian));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = chatWithLibrarianOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState, librarian);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, chatted: true } }, result.message);
    },
    hold_meeting: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = meetingOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = meetingOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            lastPlayedDate: new Date().toISOString().slice(0, 10),
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
    handle_librarian_dispute: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { dedication: 0, stability: 0, service: 0 };

        const trustGain = getRandomValue(10, 3);
        const trustLoss = getRandomValue(5, 2);
        const dedicationGain = getRandomValue(5, 2);
        const serviceGain = getRandomValue(5, 2);

        const updatedLibrarians = gameState.librarians.map(l => {
            if (l.id === first) {
                l.trust = Math.min(100, l.trust + trustGain);
                message += `${l.name}의 관점을 먼저 들어주었습니다. ${l.name}의 신뢰도가 상승했습니다. `;
                reward.dedication += dedicationGain;
                reward.service += serviceGain;
            } else if (l.id === second) {
                l.trust = Math.max(0, l.trust - trustLoss);
                message += `${second}의 신뢰도가 약간 하락했습니다. `;
            }
            return l;
        });

        updateState({ ...reward, librarians: updatedLibrarians, currentScenarioId: 'librarian_dispute_resolution_result' }, message);
    },
    mediate_librarian_dispute: () => {
        if (!spendActionPoint()) return;
        const stabilityGain = getRandomValue(10, 3);
        const traditionGain = getRandomValue(5, 2);
        const serviceGain = getRandomValue(5, 2);
        const message = `당신의 지혜로운 중재로 안나와 벤의 의견 차이가 조화를 이루었습니다. 도서관의 안정과 당신의 봉사 정신이 강화되었습니다! (+${stabilityGain} 안정, +${traditionGain} 전통, +${serviceGain} 봉사)`;
        updateState({ stability: gameState.stability + stabilityGain, tradition: gameState.tradition + traditionGain, service: gameState.service + serviceGain, currentScenarioId: 'librarian_dispute_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const stabilityLoss = getRandomValue(10, 3);
        const traditionLoss = getRandomValue(5, 2);
        const message = `의견 차이를 무시했습니다. 사서들의 불만이 커지고 도서관의 분위기가 침체됩니다. (-${stabilityLoss} 안정, -${traditionLoss} 전통)`;
        const updatedLibrarians = gameState.librarians.map(l => {
            l.trust = Math.max(0, l.trust - 5);
            return l;
        });
        updateState({ stability: gameState.stability - stabilityLoss, tradition: gameState.tradition - traditionLoss, librarians: updatedLibrarians, currentScenarioId: 'librarian_dispute_resolution_result' }, message);
    },
    restore_tradition: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const traditionGain = getRandomValue(10, 3);
            const memoryGain = getRandomValue(5, 2);
            message = `오래된 전통을 복원했습니다. 도서관의 전통과 기억이 상승합니다. (+${traditionGain} 전통, +${memoryGain} 기억)`;
            changes.tradition = gameState.tradition + traditionGain;
            changes.memory = gameState.memory + memoryGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "전통을 복원할 업무력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    decline_tradition_restoration: () => {
        if (!spendActionPoint()) return;
        const traditionLoss = getRandomValue(10, 3);
        const stabilityLoss = getRandomValue(5, 2);
        updateState({ tradition: gameState.tradition - traditionLoss, stability: gameState.stability - stabilityLoss, currentScenarioId: 'intro' }, `전통 복원을 미루었습니다. 도서관의 전통과 안정이 감소합니다. (-${traditionLoss} 전통, -${stabilityLoss} 안정)`);
    },
    improve_service: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const serviceGain = getRandomValue(10, 3);
            const dedicationGain = getRandomValue(5, 2);
            message = `서비스 개선 방안을 모색했습니다. 방문객들의 봉사 만족도와 당신의 헌신이 상승합니다. (+${serviceGain} 봉사, +${dedicationGain} 헌신)`;
            changes.service = gameState.service + serviceGain;
            changes.dedication = gameState.dedication + dedicationGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "서비스 개선 방안을 모색할 업무력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    maintain_current_service: () => {
        if (!spendActionPoint()) return;
        const serviceLoss = getRandomValue(10, 3);
        const memoryLoss = getRandomValue(5, 2);
        updateState({ service: gameState.service - serviceLoss, memory: gameState.memory - memoryLoss, currentScenarioId: 'intro' }, `현상 유지를 고수했습니다. 방문객들의 봉사 만족도와 도서관의 기억이 감소합니다. (-${serviceLoss} 봉사, -${memoryLoss} 기억)`);
    },
    welcome_new_unique_librarian: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        if (gameState.librarians.length < gameState.maxLibrarians && gameState.pendingNewLibrarian) {
            const dedicationGain = getRandomValue(10, 3);
            const stabilityGain = getRandomValue(5, 2);
            const serviceGain = getRandomValue(5, 2);
            gameState.librarians.push(gameState.pendingNewLibrarian);
            message = `새로운 사서 ${gameState.pendingNewLibrarian.name}을(를) 유능한 인재로 영입했습니다! 도서관의 헌신과 안정, 봉사가 상승합니다. (+${dedicationGain} 헌신, +${stabilityGain} 안정, +${serviceGain} 봉사)`;
            changes.dedication = gameState.dedication + dedicationGain;
            changes.stability = gameState.stability + stabilityGain;
            changes.service = gameState.service + serviceGain;
            changes.pendingNewLibrarian = null;
        } else {
            message = "새로운 사서를 영입할 수 없습니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    observe_librarian: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();
        if (rand < 0.7) { // Small Win
            const memoryGain = getRandomValue(5, 2);
            message = `새로운 사서를 관찰하며 흥미로운 점을 발견했습니다. 당신의 기억이 상승합니다. (+${memoryGain} 기억)`;
            changes.memory = gameState.memory + memoryGain;
        } else { // Small Loss
            const stabilityLoss = getRandomValue(5, 2);
            message = `사서를 관찰하는 동안, 당신의 우유부단함이 도서관에 좋지 않은 인상을 주었습니다. (-${stabilityLoss} 안정)`;
            changes.stability = gameState.stability - stabilityLoss;
        }
        changes.pendingNewLibrarian = null;
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    reject_librarian: () => {
        if (!spendActionPoint()) return;
        const dedicationLoss = getRandomValue(10, 3);
        const stabilityLoss = getRandomValue(5, 2);
        const serviceLoss = getRandomValue(5, 2);
        message = `새로운 사서의 영입을 거절했습니다. 도서관의 헌신과 안정, 봉사가 감소합니다. (-${dedicationLoss} 헌신, -${stabilityLoss} 안정, -${serviceLoss} 봉사)`;
        updateState({ dedication: gameState.dedication - dedicationLoss, stability: gameState.stability - stabilityLoss, service: gameState.service - serviceLoss, pendingNewLibrarian: null, currentScenarioId: 'intro' }, message);
    },
    show_material_collection_options: () => updateState({ currentScenarioId: 'action_material_collection' }),
    show_record_room_management_options: () => updateState({ currentScenarioId: 'action_record_room_management' }),
    show_quiet_rest_options: () => updateState({ currentScenarioId: 'quiet_rest_menu' }),
    collect_old_books: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.libraryLevel * 0.1) + (gameState.dailyBonus.restorationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const oldBooksGain = getRandomValue(5, 2);
            message = `낡은 책을 성공적으로 수집했습니다! (+${oldBooksGain} 낡은 책)`;
            changes.resources = { ...gameState.resources, old_books: gameState.resources.old_books + oldBooksGain };
        } else {
            message = "낡은 책 수집에 실패했습니다.";
        }
        updateState(changes, message);
    },
    restore_records: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.libraryLevel * 0.1) + (gameState.dailyBonus.restorationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const recordsGain = getRandomValue(5, 2);
            message = `기록을 성공적으로 복원했습니다! (+${recordsGain} 기록)`;
            changes.resources = { ...gameState.resources, records: gameState.resources.records + recordsGain };
        } else {
            message = "기록 복원에 실패했습니다.";
        }
        updateState(changes, message);
    },
    secure_ink: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.libraryLevel * 0.1) + (gameState.dailyBonus.restorationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const inkGain = getRandomValue(5, 2);
            message = `잉크를 성공적으로 확보했습니다! (+${inkGain} 잉크)`;
            changes.resources = { ...gameState.resources, ink: gameState.resources.ink + inkGain };
        } else {
            message = "잉크 확보에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_archiveOfMemories: () => {
        if (!spendActionPoint()) return;
        const cost = { old_books: 50, records: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.old_books >= cost.old_books && gameState.resources.records >= cost.records) {
            gameState.recordRooms.archiveOfMemories.built = true;
            const memoryGain = getRandomValue(10, 3);
            message = `기억의 서고를 구축했습니다! (+${memoryGain} 기억)`;
            changes.memory = gameState.memory + memoryGain;
            changes.resources = { ...gameState.resources, old_books: gameState.resources.old_books - cost.old_books, records: gameState.resources.records - cost.records };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_restorationRoom: () => {
        if (!spendActionPoint()) return;
        const cost = { records: 30, ink: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.records >= cost.records && gameState.resources.ink >= cost.ink) {
            gameState.recordRooms.restorationRoom.built = true;
            const dedicationGain = getRandomValue(10, 3);
            message = `복원의 방을 구축했습니다! (+${dedicationGain} 헌신)`;
            changes.dedication = gameState.dedication + dedicationGain;
            changes.resources = { ...gameState.resources, records: gameState.resources.records - cost.records, ink: gameState.resources.ink - cost.ink };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_centralHall: () => {
        if (!spendActionPoint()) return;
        const cost = { old_books: 100, records: 50, ink: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.old_books >= cost.old_books && gameState.resources.records >= cost.records && gameState.resources.ink >= cost.ink) {
            gameState.recordRooms.centralHall.built = true;
            const serviceGain = getRandomValue(20, 5);
            const stabilityGain = getRandomValue(20, 5);
            message = `중앙 홀을 구축했습니다! (+${serviceGain} 봉사, +${stabilityGain} 안정)`;
            changes.service = gameState.service + serviceGain;
            changes.stability = gameState.stability + stabilityGain;
            changes.resources = { ...gameState.resources, old_books: gameState.resources.old_books - cost.old_books, records: gameState.resources.records - cost.records, ink: gameState.resources.ink - cost.ink };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_specialArchive: () => {
        if (!spendActionPoint()) return;
        const cost = { records: 80, ink: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.records >= cost.records && gameState.resources.ink >= cost.ink) {
            gameState.recordRooms.specialArchive.built = true;
            const memoryGain = getRandomValue(15, 5);
            const traditionGain = getRandomValue(10, 3);
            message = `특별 기록실을 구축했습니다! (+${memoryGain} 기억, +${traditionGain} 전통)`;
            changes.memory = gameState.memory + memoryGain;
            changes.tradition = gameState.tradition + traditionGain;
            changes.resources = { ...gameState.resources, records: gameState.resources.records - cost.records, ink: gameState.resources.ink - cost.ink };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_communityLounge: () => {
        if (!spendActionPoint()) return;
        const cost = { records: 50, ink: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.records >= cost.records && gameState.resources.ink >= cost.ink) {
            gameState.recordRooms.communityLounge.built = true;
            message = "커뮤니티 라운지를 구축했습니다!";
            changes.resources = { ...gameState.resources, records: gameState.resources.records - cost.records, ink: gameState.resources.ink - cost.ink };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    maintain_record_room: (params) => {
        if (!spendActionPoint()) return;
        const roomKey = params.room;
        const cost = { records: 10, ink: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.records >= cost.records && gameState.resources.ink >= cost.ink) {
            gameState.recordRooms[roomKey].durability = 100;
            message = `${gameState.recordRooms[roomKey].name} 기록실의 보수를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, records: gameState.resources.records - cost.records, ink: gameState.resources.ink - cost.ink };
        } else {
            message = "보수에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    view_old_albums: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.1) { // Big Win
            const oldBooksGain = getRandomValue(30, 10);
            const recordsGain = getRandomValue(20, 5);
            const inkGain = getRandomValue(15, 5);
            message = `오래된 앨범에서 대박! 엄청난 자료를 얻었습니다! (+${oldBooksGain} 낡은 책, +${recordsGain} 기록, +${inkGain} 잉크)`;
            changes.resources = { ...gameState.resources, old_books: gameState.resources.old_books + oldBooksGain, records: gameState.resources.records + recordsGain, ink: gameState.resources.ink + inkGain };
        } else if (rand < 0.4) { // Small Win
            const memoryGain = getRandomValue(10, 5);
            message = `오래된 앨범을 보며 기억이 되살아납니다. (+${memoryGain} 기억)`;
            changes.memory = gameState.memory + memoryGain;
        } else if (rand < 0.7) { // Small Loss
            const memoryLoss = getRandomValue(5, 2);
            message = `아쉽게도 앨범이 훼손되어 기억이 조금 흐려집니다. (-${memoryLoss} 기억)`;
            changes.memory = gameState.memory - memoryLoss;
        } else { // No Change
            message = `오래된 앨범을 보았지만, 특별한 것은 없었습니다.`;
        }
        updateState({ ...changes, currentScenarioId: 'quiet_rest_menu' }, message);
    },
    find_lost_items: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.2) { // Big Catch (Historical Artifacts)
            const historicalArtifactsGain = getRandomValue(3, 1);
            message = `분실물 찾기 대성공! 역사적 유물을 발견했습니다! (+${historicalArtifactsGain} 역사적 유물)`;
            changes.resources = { ...gameState.resources, historical_artifacts: (gameState.resources.historical_artifacts || 0) + historicalArtifactsGain };
        } else if (rand < 0.6) { // Normal Catch (Records)
            const recordsGain = getRandomValue(10, 5);
            message = `기록을 찾았습니다! (+${recordsGain} 기록)`;
            changes.resources = { ...gameState.resources, records: gameState.resources.records + recordsGain };
        } else { // No Change
            message = `아쉽게도 아무것도 찾지 못했습니다.`;
        }
        updateState({ ...changes, currentScenarioId: 'quiet_rest_menu' }, message);
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 기록은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;

        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];

        gameState.currentScenarioId = `minigame_${minigame.name}`;

        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });

        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    show_material_collection_options: () => updateState({ currentScenarioId: 'action_material_collection' }),
    show_record_room_management_options: () => updateState({ currentScenarioId: 'action_record_room_management' }),
    show_quiet_rest_options: () => updateState({ currentScenarioId: 'quiet_rest_menu' }),
};

function applyStatEffects() {
    let message = "";
    // High Dedication: Resource collection success chance increase
    if (gameState.dedication >= 70) {
        gameState.dailyBonus.restorationSuccess += 0.1;
        message += "높은 헌신 덕분에 자료 수집 성공률이 증가합니다. ";
    }
    // Low Dedication: Stability decrease
    if (gameState.dedication < 30) {
        gameState.stability = Math.max(0, gameState.stability - getRandomValue(5, 2));
        message += "헌신 부족으로 안정성이 감소합니다. ";
    }

    // High Stability: Action points increase
    if (gameState.stability >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "넘치는 안정 덕분에 업무력이 증가합니다. ";
    }
    // Low Stability: Action points decrease
    if (gameState.stability < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "안정 부족으로 업무력이 감소합니다. ";
    }

    // High Tradition: Memory and Service boost
    if (gameState.tradition >= 70) {
        const memoryGain = getRandomValue(5, 2);
        const serviceGain = getRandomValue(5, 2);
        gameState.memory = Math.min(100, gameState.memory + memoryGain);
        gameState.service = Math.min(100, gameState.service + serviceGain);
        message += `당신의 높은 전통 존중 덕분에 도서관의 기억과 봉사가 향상됩니다! (+${memoryGain} 기억, +${serviceGain} 봉사) `;
    }
    // Low Tradition: Memory and Service decrease
    if (gameState.tradition < 30) {
        const memoryLoss = getRandomValue(5, 2);
        const serviceLoss = getRandomValue(5, 2);
        gameState.memory = Math.max(0, gameState.memory - memoryLoss);
        gameState.service = Math.max(0, gameState.service - serviceLoss);
        message += "전통 부족으로 도서관의 기억과 봉사가 흐려집니다. (-${memoryLoss} 기억, -${serviceLoss} 봉사) ";
    }

    // High Memory: Dedication boost or rare resource discovery
    if (gameState.memory >= 70) {
        const dedicationGain = getRandomValue(5, 2);
        gameState.dedication = Math.min(100, gameState.dedication + dedicationGain);
        message += "당신의 뛰어난 기억력 덕분에 새로운 헌신을 불러일으킵니다. (+${dedicationGain} 헌신) ";
        if (currentRandFn() < 0.2) { // 20% chance for historical artifacts discovery
            const amount = getRandomValue(1, 1);
            gameState.resources.historical_artifacts += amount;
            message += "역사적 유물을 발견했습니다! (+${amount} 역사적 유물) ";
        }
    }
    // Low Memory: Dedication decrease or action point loss
    if (gameState.memory < 30) {
        const dedicationLoss = getRandomValue(5, 2);
        gameState.dedication = Math.max(0, gameState.dedication - dedicationLoss);
        message += "기억 부족으로 헌신이 감소합니다. (-${dedicationLoss} 헌신) ";
        if (currentRandFn() < 0.1) { // 10% chance for action point loss
            const actionLoss = getRandomValue(1, 0);
            gameState.actionPoints = Math.max(0, gameState.actionPoints - actionLoss);
            message += "비효율적인 업무로 업무력을 낭비했습니다. (-${actionLoss} 업무력) ";
        }
    }

    // High Service: Librarian trust increase
    if (gameState.service >= 70) {
        gameState.librarians.forEach(l => l.trust = Math.min(100, l.trust + getRandomValue(2, 1)));
        message += "높은 봉사 정신 덕분에 사서들의 신뢰가 깊어집니다. ";
    }
    // Low Service: Librarian trust decrease
    if (gameState.service < 30) {
        gameState.librarians.forEach(l => l.trust = Math.max(0, l.trust - getRandomValue(5, 2)));
        message += "낮은 봉사 정신으로 인해 사서들의 신뢰가 하락합니다. ";
    }

    return message;
}

function generateRandomLibrarian() {
    const names = ["클라라", "다니엘", "에바", "프레드", "그레이스"];
    const personalities = ["꼼꼼한", "친절한", "차분한", "지혜로운"];
    const skills = ["기록 복원", "방문객 응대", "고문서 해독"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        trust: 50
    };
}

// --- Daily/Initialization Logic ---
const weightedDailyEvents = [
    { id: "daily_event_visitor_complaint", weight: 10, condition: () => true, onTrigger: () => {
        const serviceLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_visitor_complaint.text = `방문객의 불만으로 봉사 만족도가 감소합니다. (-${serviceLoss} 봉사)`;
        updateState({ service: Math.max(0, gameState.service - serviceLoss) });
    } },
    { id: "daily_event_bookworm_infestation", weight: 10, condition: () => true, onTrigger: () => {
        const oldBooksLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_bookworm_infestation.text = `책벌레가 발생하여 낡은 책 일부가 훼손되었습니다. (-${oldBooksLoss} 낡은 책)`;
        updateState({ resources: { ...gameState.resources, old_books: Math.max(0, gameState.resources.old_books - oldBooksLoss) } });
    } },
    { id: "daily_event_lost_artifact", weight: 7, condition: () => true, onTrigger: () => {
        const historicalArtifactsLoss = getRandomValue(1, 1);
        gameScenarios.daily_event_lost_artifact.text = `역사적 유물 일부가 분실되었습니다. (-${historicalArtifactsLoss} 역사적 유물)`;
        updateState({ resources: { ...gameState.resources, historical_artifacts: Math.max(0, gameState.resources.historical_artifacts - historicalArtifactsLoss) } });
    } },
    { id: "daily_event_librarian_dispute", weight: 15, condition: () => gameState.librarians.length >= 2 },
    { id: "daily_event_new_librarian", weight: 10, condition: () => gameState.recordRooms.centralHall.built && gameState.librarians.length < gameState.maxLibrarians, onTrigger: () => {
        const newLibrarian = generateRandomLibrarian();
        gameState.pendingNewLibrarian = newLibrarian;
        gameScenarios["daily_event_new_librarian"].text = `새로운 사서 ${newLibrarian.name}(${newLibrarian.personality}, ${newLibrarian.skill})이(가) 도서관에 합류하고 싶어 합니다. (현재 사서 수: ${gameState.librarians.length} / ${gameState.maxLibrarians})`;
    }},
    { id: "daily_event_historical_discovery", weight: 10, condition: () => true, onTrigger: () => {
        const historicalArtifactsGain = getRandomValue(1, 1);
        const memoryGain = getRandomValue(5, 2);
        gameScenarios.daily_event_historical_discovery.text = `도서관 서고에서 새로운 역사적 유물을 발견했습니다! (+${historicalArtifactsGain} 역사적 유물, +${memoryGain} 기억)`;
        updateState({ resources: { ...gameState.resources, historical_artifacts: gameState.resources.historical_artifacts + historicalArtifactsGain }, memory: gameState.memory + memoryGain });
    } },
    { id: "daily_event_forgotten_tradition", weight: 15, condition: () => true },
    { id: "daily_event_memory_loss", weight: 12, condition: () => gameState.memory < 50, onTrigger: () => {
        const memoryLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_memory_loss.text = `도서관의 기억 일부가 희미해졌습니다. (-${memoryLoss} 기억)`;
        updateState({ memory: Math.max(0, gameState.memory - memoryLoss) });
    } },
    { id: "daily_event_service_crisis", weight: 15, condition: () => true },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    // Reset daily actions and action points
    updateState({
        actionPoints: 10, // Reset to base maxActionPoints
        maxActionPoints: 10, // Reset maxActionPoints to base
        dailyActions: { organized: false, chatted: false, met: false, minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { restorationSuccess: 0 } // Reset daily bonus
    });

    // Apply stat effects
    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    // Daily skill bonus & durability decay
    gameState.librarians.forEach(l => {
        if (l.skill === '기록 복원') { gameState.resources.records++; skillBonusMessage += `${l.name}의 기록 복원 기술 덕분에 기록을 추가로 얻었습니다. `; }
        else if (l.skill === '방문객 응대') { gameState.resources.ink++; skillBonusMessage += `${l.name}의 방문객 응대 기술 덕분에 잉크를 추가로 얻었습니다. `; }
        else if (l.skill === '고문서 해독') { gameState.resources.historical_artifacts++; skillBonusMessage += `${l.name}의 고문서 해독 기술 덕분에 역사적 유물을 추가로 얻었습니다. `; }
    });

    Object.keys(gameState.recordRooms).forEach(key => {
        const room = gameState.recordRooms[key];
        if(room.built) {
            room.durability -= 1;
            if(room.durability <= 0) {
                room.built = false;
                durabilityMessage += `${key} 기록실이 파손되었습니다! 보수가 필요합니다. `; 
            }
        }
    });

    gameState.resources.old_books -= gameState.librarians.length * 2; // Old books consumption
    let dailyMessage = "새로운 날이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.old_books < 0) {
        gameState.dedication -= 10;
        dailyMessage += "낡은 책이 부족하여 사서들이 힘들어합니다! (-10 헌신)";
    } else {
        dailyMessage += "";
    }

    // Check for game over conditions
    if (gameState.dedication <= 0) { gameState.currentScenarioId = "game_over_dedication"; }
    else if (gameState.stability <= 0) { gameState.currentScenarioId = "game_over_stability"; }
    else if (gameState.tradition <= 0) { gameState.currentScenarioId = "game_over_tradition"; }
    else if (gameState.memory <= 0) { gameState.currentScenarioId = "game_over_memory"; }
    else if (gameState.service <= 0) { gameState.currentScenarioId = "game_over_service"; }
    else if (gameState.resources.old_books < -(gameState.librarians.length * 5)) { gameState.currentScenarioId = "game_over_resources"; }

    // --- New Weighted Random Event Logic ---
    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
    const rand = currentRandFn() * totalWeight;

    let cumulativeWeight = 0;
    let chosenEvent = null;

    for (const event of possibleEvents) {
        cumulativeWeight += event.weight;
        if (rand < cumulativeWeight) {
            chosenEvent = event;
            break;
        }
    }

    if (chosenEvent) {
        eventId = chosenEvent.id;
        if (chosenEvent.onTrigger) {
            chosenEvent.onTrigger();
        }
    }

    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 추억의 도서관을 포기하시겠습니까? 모든 기록이 사라집니다.")) {
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
