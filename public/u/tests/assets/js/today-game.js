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

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        dedication: 50,
        stability: 50,
        tradition: 50,
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { memories: 10, oldBooks: 10, donations: 5, historical_relics: 0 },
        librarians: [
            { id: "ella", name: "엘라 사서", personality: "꼼꼼한", skill: "기록 복원", loyalty: 70 },
            { id: "leo", name: "레오 사서", personality: "친절한", skill: "방문객 응대", loyalty: 60 }
        ],
        maxLibrarians: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { restorationSuccess: 0 },
        dailyActions: { organized: false, meetingHeld: false, talkedTo: [], minigamePlayed: false },
        archives: {
            memoryArchive: { built: false, durability: 100 },
            restorationRoom: { built: false, durability: 100 },
            mainHall: { built: false, durability: 100 },
            specialCollection: { built: false, durability: 100 },
            communityLounge: { built: false, durability: 100 }
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
                { id: "ella", name: "엘라 사서", personality: "꼼꼼한", skill: "기록 복원", loyalty: 70 },
                { id: "leo", name: "레오 사서", personality: "친절한", skill: "방문객 응대", loyalty: 60 }
            ];
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
    const librarianListHtml = gameState.librarians.map(l => `<li>${l.name} (${l.skill}) - 충성도: ${l.loyalty}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>개관:</b> ${gameState.day}일차</p>
        <p><b>업무력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>헌신:</b> ${gameState.dedication} | <b>안정:</b> ${gameState.stability} | <b>전통:</b> ${gameState.tradition}</p>
        <p><b>자원:</b> 기억 조각 ${gameState.resources.memories}, 오래된 책 ${gameState.resources.oldBooks}, 기부금 ${gameState.resources.donations}, 역사적 유물 ${gameState.resources.historical_relics || 0}</p>
        <p><b>도서관 레벨:</b> ${gameState.libraryLevel}</p>
        <p><b>사서 (${gameState.librarians.length}/${gameState.maxLibrarians}):</b></p>
        <ul>${librarianListHtml}</ul>
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
    } else if (gameState.currentScenarioId === 'action_facility_management') {
        dynamicChoices = gameScenarios.action_facility_management.choices ? [...gameScenarios.action_facility_management.choices] : [];
        if (!gameState.archives.memoryArchive.built) dynamicChoices.push({ text: "기억의 서고 건설 (기억 조각 50, 오래된 책 20)", action: "build_memory_archive" });
        if (!gameState.archives.restorationRoom.built) dynamicChoices.push({ text: "복원의 방 구축 (오래된 책 30, 기부금 30)", action: "build_restoration_room" });
        if (!gameState.archives.mainHall.built) dynamicChoices.push({ text: "중앙 홀 확장 (기억 조각 100, 오래된 책 50, 기부금 50)", action: "build_main_hall" });
        if (!gameState.archives.specialCollection.built) dynamicChoices.push({ text: "특별 기록실 신설 (오래된 책 80, 기부금 40)", action: "build_special_collection" });
        if (gameState.archives.restorationRoom.built && gameState.archives.restorationRoom.durability > 0 && !gameState.archives.communityLounge.built) {
            dynamicChoices.push({ text: "커뮤니티 라운지 개설 (오래된 책 50, 기부금 100)", action: "build_community_lounge" });
        }
        Object.keys(gameState.archives).forEach(key => {
            const facility = gameState.archives[key];
            if (facility.built && facility.durability < 100) {
                dynamicChoices.push({ text: `${key} 보수 (오래된 책 10, 기부금 10)`, action: "maintain_facility", params: { facility: key } });
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

// --- Game Data ---
const gameScenarios = {
    "intro": { text: "오늘의 업무는 무엇입니까?", choices: [
        { text: "서고 정리", action: "organize" },
        { text: "동료 사서와 대화", action: "talk_to_librarians" },
        { text: "정기 회의", action: "hold_meeting" },
        { text: "자료 수집", action: "show_resource_collection_options" },
        { text: "기록실 관리", action: "show_facility_options" },
        { text: "오늘의 미니게임", action: "play_minigame" }
    ]},
    "daily_event_damage": {
        text: "기록물 일부가 훼손되었습니다. 어떻게 처리하시겠습니까?",
        choices: [
            { text: "밤을 새워 완벽하게 복원한다.", action: "handle_damage", params: { choice: "restore" } },
            { text: "동료에게 도움을 요청한다.", action: "handle_damage", params: { choice: "ask_help" } },
            { text: "조용히 폐기하고 숨긴다.", action: "ignore_event" }
        ]
    },
    "daily_event_visitor_complaint": { text: "방문객이 도서관이 너무 조용하다며 불평합니다. (-10 안정)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_book_worm": { text: "책벌레가 오래된 책 일부를 갉아먹었습니다. (-10 오래된 책)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_donation": {
        text: "한 독지가가 희귀한 역사적 유물을 기증하고 싶어합니다. [기부금 50]을 사용하여 안전하게 운송하면 [역사적 유물]을 얻을 수 있습니다.",
        choices: [
            { text: "기증을 받는다", action: "accept_donation" },
            { text: "정중히 거절한다", action: "decline_donation" }
        ]
    },
    "daily_event_new_librarian": {
        choices: [
            { text: "그의 성실함을 보고 즉시 채용한다.", action: "welcome_new_unique_librarian" },
            { text: "기존 사서들과의 조화를 지켜본다.", action: "observe_librarian" },
            { text: "우리 도서관과는 맞지 않는 것 같다.", action: "reject_librarian" }
        ]
    },
    "game_over_dedication": { text: "헌신이 부족하여 도서관의 기록들이 모두 먼지가 되었습니다.", choices: [], final: true },
    "game_over_stability": { text: "도서관의 안정이 무너졌습니다. 더 이상 운영할 수 없습니다.", choices: [], final: true },
    "game_over_tradition": { text: "도서관의 전통이 사라졌습니다. 이곳은 더 이상 의미가 없습니다.", choices: [], final: true },
    "game_over_resources": { text: "자원이 모두 고갈되어 도서관을 유지할 수 없습니다.", choices: [], final: true },
    "action_resource_collection": {
        text: "어떤 자료를 수집하시겠습니까?",
        choices: [
            { text: "잊혀진 기억 수집 (기억 조각)", action: "perform_gather_memories" },
            { text: "고서 구매 (오래된 책)", action: "perform_buy_old_books" },
            { text: "기부금 모금 (기부금)", "action": "perform_collect_donations" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_facility_management": {
        text: "어떤 기록실을 관리하시겠습니까?",
        choices: []
    },
    "resource_collection_result": {
        text: "",
        choices: [{ text: "확인", action: "show_resource_collection_options" }]
    },
    "facility_management_result": {
        text: "",
        choices: [{ text: "확인", action: "show_facility_options" }]
    },
    "damage_resolution_result": {
        text: "",
        choices: [{ text: "확인", action: "return_to_intro" }]
    }
};

function calculateMinigameReward(minigameName, score) {
    let rewards = { dedication: 0, stability: 0, tradition: 0, message: "" };

    switch (minigameName) {
        case "기억력 순서 맞추기":
            if (score >= 51) {
                rewards.dedication = 15;
                rewards.stability = 10;
                rewards.tradition = 5;
                rewards.message = `완벽한 기억력입니다! 모든 기록의 위치를 기억했습니다. (+15 헌신, +10 안정, +5 전통)`;
            } else if (score >= 21) {
                rewards.dedication = 10;
                rewards.stability = 5;
                rewards.message = `훌륭한 기억력입니다. (+10 헌신, +5 안정)`;
            } else if (score >= 0) {
                rewards.dedication = 5;
                rewards.message = `훈련을 완료했습니다. (+5 헌신)`;
            } else {
                rewards.message = `훈련을 완료했지만, 아쉽게도 보상은 없습니다.`;
            }
            break;
        case "기록 복원하기":
            rewards.dedication = 10;
            rewards.message = `훼손된 기록을 완벽하게 복원했습니다! (+10 헌신)`;
            break;
        case "분류 퀴즈":
            rewards.stability = 10;
            rewards.message = `모든 책을 정확한 위치에 분류했습니다. (+10 안정)`;
            break;
        case "방문객 응대하기":
            rewards.tradition = 10;
            rewards.message = `친절한 응대로 도서관의 좋은 전통을 이어갔습니다. (+10 전통)`;
            break;
        case "틀린 그림 찾기":
            rewards.dedication = 5;
            rewards.stability = 5;
            rewards.message = `꼼꼼함 덕분에 숨겨진 오류를 발견했습니다. (+5 헌신, +5 안정)`;
            break;
        default:
            rewards.message = `미니게임 ${minigameName}을(를) 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "기억력 순서 맞추기",
        description: "화면에 나타나는 책들의 위치 순서를 기억하고 정확하게 입력하세요. 단계가 올라갈수록 어려워집니다!",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { currentSequence: [], playerInput: [], stage: 1, score: 0, showingSequence: false };
            minigames[0].render(gameArea, choicesDiv);
            minigames[0].showSequence();
        },
        render: (gameArea, choicesDiv) => {
            gameArea.innerHTML = `
                <p><b>단계:</b> ${gameState.minigameState.stage} | <b>점수:</b> ${gameState.minigameState.score}</p>
                <p id="sequenceDisplay" style="font-size: 2em; font-weight: bold; min-height: 1.5em;"></p>
                <p>순서를 기억하고 입력하세요:</p>
                <div id="playerInputDisplay" style="font-size: 1.5em; min-height: 1.5em;">${gameState.minigameState.playerInput.join(' ')}</div>
            `;
            choicesDiv.innerHTML = `
                <div class="number-pad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `<button class="choice-btn num-btn" data-value="${num}">${num}</button>`).join('')}
                    <button class="choice-btn num-btn" data-value="0">0</button>
                    <button class="choice-btn submit-btn" data-action="submitSequence">입력 완료</button>
                    <button class="choice-btn reset-btn" data-action="resetInput">초기화</button>
                </div>
            `;
            choicesDiv.querySelectorAll('.num-btn').forEach(button => {
                button.addEventListener('click', () => minigames[0].processAction('addInput', button.dataset.value));
            });
            choicesDiv.querySelector('.submit-btn').addEventListener('click', () => minigames[0].processAction('submitSequence'));
            choicesDiv.querySelector('.reset-btn').addEventListener('click', () => minigames[0].processAction('resetInput'));
        },
        showSequence: () => {
            gameState.minigameState.showingSequence = true;
            gameState.minigameState.currentSequence = [];
            const sequenceLength = gameState.minigameState.stage + 2;
            for (let i = 0; i < sequenceLength; i++) {
                gameState.minigameState.currentSequence.push(Math.floor(currentRandFn() * 10));
            }

            const sequenceDisplay = document.getElementById('sequenceDisplay');
            let i = 0;
            const interval = setInterval(() => {
                if (i < gameState.minigameState.currentSequence.length) {
                    sequenceDisplay.innerText = gameState.minigameState.currentSequence[i];
                    i++;
                } else {
                    clearInterval(interval);
                    sequenceDisplay.innerText = "입력하세요!";
                    gameState.minigameState.showingSequence = false;
                }
            }, 800);
        },
        processAction: (actionType, value = null) => {
            if (gameState.minigameState.showingSequence) return;

            if (actionType === 'addInput') {
                gameState.minigameState.playerInput.push(parseInt(value));
                document.getElementById('playerInputDisplay').innerText = gameState.minigameState.playerInput.join(' ');
            } else if (actionType === 'resetInput') {
                gameState.minigameState.playerInput = [];
                document.getElementById('playerInputDisplay').innerText = '';
            } else if (actionType === 'submitSequence') {
                const correct = gameState.minigameState.currentSequence.every((num, i) => num === gameState.minigameState.playerInput[i]);

                if (correct && gameState.minigameState.playerInput.length === gameState.minigameState.currentSequence.length) {
                    gameState.minigameState.score += gameState.minigameState.currentSequence.length * 10;
                    gameState.minigameState.stage++;
                    gameState.minigameState.playerInput = [];
                    updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    setTimeout(() => minigames[0].showSequence(), 1500);
                } else {
                    updateGameDisplay("오답입니다. 게임 종료.");
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
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    { name: "기록 복원하기", description: "훼손된 기록을 꼼꼼하게 복원하여 원래의 모습을 되찾아주세요.", start: (ga, cd) => { ga.innerHTML = "<p>기록 복원하기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[1].end()'>종료</button>"; gameState.minigameState = { score: 10 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[1].name, gameState.minigameState.score); updateState({ dedication: gameState.dedication + r.dedication, stability: gameState.stability + r.stability, tradition: gameState.tradition + r.tradition, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "분류 퀴즈", description: "새로 들어온 책들을 도서관 규칙에 맞게 정확히 분류하세요.", start: (ga, cd) => { ga.innerHTML = "<p>분류 퀴즈 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[2].end()'>종료</button>"; gameState.minigameState = { score: 15 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[2].name, gameState.minigameState.score); updateState({ dedication: gameState.dedication + r.dedication, stability: gameState.stability + r.stability, tradition: gameState.tradition + r.tradition, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "방문객 응대하기", description: "도서관을 찾은 방문객에게 친절하게 응대하고 필요한 정보를 찾아주세요.", start: (ga, cd) => { ga.innerHTML = "<p>방문객 응대하기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[3].end()'>종료</button>"; gameState.minigameState = { score: 20 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[3].name, gameState.minigameState.score); updateState({ dedication: gameState.dedication + r.dedication, stability: gameState.stability + r.stability, tradition: gameState.tradition + r.tradition, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "틀린 그림 찾기", description: "두 개의 기록화에서 미묘하게 다른 부분을 모두 찾아내세요.", start: (ga, cd) => { ga.innerHTML = "<p>틀린 그림 찾기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[4].end()'>종료</button>"; gameState.minigameState = { score: 25 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[4].name, gameState.minigameState.score); updateState({ dedication: gameState.dedication + r.dedication, stability: gameState.stability + r.stability, tradition: gameState.tradition + r.tradition, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } }
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
    organize: () => {
        if (!spendActionPoint()) return;
        if (gameState.dailyActions.organized) { updateState({ dailyActions: { ...gameState.dailyActions, organized: true } }, "오늘은 이미 모든 서고를 정리했습니다."); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, organized: true } };
        let message = "서고를 정리하며 잊혀진 기록들을 발견합니다.";
        const rand = currentRandFn();
        if (rand < 0.3) { message += " 오래된 책 더미를 발견했습니다. (+2 오래된 책)"; changes.resources = { ...gameState.resources, oldBooks: gameState.resources.oldBooks + 2 }; }
        else if (rand < 0.6) { message += " 방문객의 감사 편지를 발견했습니다. (+2 안정)"; changes.stability = gameState.stability + 2; }
        else { message += " 특별한 것은 발견하지 못했습니다."; }
        
        updateState(changes, message);
    },
    talk_to_librarians: () => {
        if (!spendActionPoint()) return;
        const librarian = gameState.librarians[Math.floor(currentRandFn() * gameState.librarians.length)];
        if (gameState.dailyActions.talkedTo.includes(librarian.id)) { updateState({ dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, librarian.id] } }, `${librarian.name}${getWaGwaParticle(librarian.name)} 이미 대화했습니다.`); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, librarian.id] } };
        let message = `${librarian.name}${getWaGwaParticle(librarian.name)} 대화했습니다. `;
        if (librarian.loyalty > 80) { message += `그는 당신의 헌신에 감동하며 도서관의 전통에 대한 이야기를 들려주었습니다. (+5 전통)`; changes.tradition = gameState.tradition + 5; }
        else if (librarian.loyalty < 40) { message += `그는 업무에 지쳐 보입니다. 더 많은 격려가 필요합니다. (-5 안정)`; changes.stability = gameState.stability - 5; }
        else { message += `그와의 대화를 통해 도서관 운영에 대한 조언을 얻었습니다. (+2 안정)`; changes.stability = gameState.stability + 2; }
        
        updateState(changes, message);
    },
    hold_meeting: () => {
        if (!spendActionPoint()) return;
        if (gameState.dailyActions.meetingHeld) {
            const message = "오늘은 이미 정기 회의를 진행했습니다. (-5 안정)";
            gameState.stability -= 5;
            updateState({ stability: gameState.stability }, message);
            return;
        }
        updateState({ dailyActions: { ...gameState.dailyActions, meetingHeld: true } });
        const rand = currentRandFn();
        let message = "정기 회의를 진행했습니다. ";
        if (rand < 0.5) { message += "사서들의 협력으로 도서관의 안정성이 향상되었습니다. (+10 안정, +5 전통)"; updateState({ stability: gameState.stability + 10, tradition: gameState.tradition + 5 }); }
        else { message += "사소한 의견 차이가 있었지만, 당신의 중재로 잘 해결되었습니다. (+5 헌신)"; updateState({ dedication: gameState.dedication + 5 }); }
        updateGameDisplay(message);
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
    handle_damage: (params) => {
        if (!spendActionPoint()) return;
        const { choice } = params;
        let message = "";
        let reward = { dedication: 0, stability: 0, tradition: 0 };
        
        if (choice === "restore") {
            message = "밤을 새워 기록을 완벽하게 복원했습니다. 당신의 헌신에 모두가 감동합니다. (+10 헌신, -5 안정)";
            reward.dedication += 10;
            reward.stability -= 5;
        } else {
            message = "동료의 도움으로 기록을 복원했습니다. (+5 안정, +5 헌신)";
            reward.stability += 5;
            reward.dedication += 5;
        }
        
        updateState({ ...reward, currentScenarioId: 'damage_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const message = "훼손된 기록을 숨겼습니다. 도서관의 전통과 안정이 무너집니다. (-10 전통, -5 안정)";
        updateState({ tradition: gameState.tradition - 10, stability: gameState.stability - 5, currentScenarioId: 'damage_resolution_result' }, message);
    },
    show_resource_collection_options: () => updateState({ currentScenarioId: 'action_resource_collection' }),
    show_facility_options: () => updateState({ currentScenarioId: 'action_facility_management' }),
    perform_gather_memories: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.libraryLevel * 0.1) + (gameState.dailyBonus.restorationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "잊혀진 기억 조각을 수집했습니다! (+5 기억 조각)";
            changes.resources = { ...gameState.resources, memories: gameState.resources.memories + 5 };
        } else {
            message = "기억 조각을 수집하지 못했습니다.";
        }
        updateState(changes, message);
    },
    perform_buy_old_books: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.libraryLevel * 0.1) + (gameState.dailyBonus.restorationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "희귀한 고서를 구매했습니다! (+5 오래된 책)";
            changes.resources = { ...gameState.resources, oldBooks: gameState.resources.oldBooks + 5 };
        } else {
            message = "고서를 구매하지 못했습니다.";
        }
        updateState(changes, message);
    },
    perform_collect_donations: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.libraryLevel * 0.1) + (gameState.dailyBonus.restorationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "기부금을 모금했습니다! (+5 기부금)";
            changes.resources = { ...gameState.resources, donations: gameState.resources.donations + 5 };
        } else {
            message = "모금에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_memory_archive: () => {
        if (!spendActionPoint()) return;
        const cost = { memories: 50, oldBooks: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.oldBooks >= cost.oldBooks && gameState.resources.memories >= cost.memories) {
            gameState.archives.memoryArchive.built = true;
            message = "기억의 서고를 건설했습니다!";
            changes.tradition = gameState.tradition + 10;
            changes.resources = { ...gameState.resources, oldBooks: gameState.resources.oldBooks - cost.oldBooks, memories: gameState.resources.memories - cost.memories };
        } else {
            message = "자원이 부족하여 건설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_restoration_room: () => {
        if (!spendActionPoint()) return;
        const cost = { oldBooks: 30, donations: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.oldBooks >= cost.oldBooks && gameState.resources.donations >= cost.donations) {
            gameState.archives.restorationRoom.built = true;
            message = "복원의 방을 구축했습니다!";
            changes.stability = gameState.stability + 10;
            changes.resources = { ...gameState.resources, oldBooks: gameState.resources.oldBooks - cost.oldBooks, donations: gameState.resources.donations - cost.donations };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_main_hall: () => {
        if (!spendActionPoint()) return;
        const cost = { memories: 100, oldBooks: 50, donations: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.oldBooks >= cost.oldBooks && gameState.resources.donations >= cost.donations && gameState.resources.memories >= cost.memories) {
            gameState.archives.mainHall.built = true;
            message = "중앙 홀을 확장했습니다!";
            changes.tradition = gameState.tradition + 20;
            changes.stability = gameState.stability + 20;
            changes.resources = { ...gameState.resources, oldBooks: gameState.resources.oldBooks - cost.oldBooks, donations: gameState.resources.donations - cost.donations, memories: gameState.resources.memories - cost.memories };
        } else {
            message = "자원이 부족하여 확장할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_special_collection: () => {
        if (!spendActionPoint()) return;
        const cost = { oldBooks: 80, donations: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.oldBooks >= cost.oldBooks && gameState.resources.donations >= cost.donations) {
            gameState.archives.specialCollection.built = true;
            message = "특별 기록실을 신설했습니다!";
            changes.dedication = gameState.dedication + 15;
            changes.tradition = gameState.tradition + 10;
            changes.resources = { ...gameState.resources, oldBooks: gameState.resources.oldBooks - cost.oldBooks, donations: gameState.resources.donations - cost.donations };
        } else {
            message = "자원이 부족하여 신설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_community_lounge: () => {
        if (!spendActionPoint()) return;
        const cost = { oldBooks: 50, donations: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.oldBooks >= cost.oldBooks && gameState.resources.donations >= cost.donations) {
            gameState.archives.communityLounge.built = true;
            message = "커뮤니티 라운지를 개설했습니다!";
            changes.resources = { ...gameState.resources, oldBooks: gameState.resources.oldBooks - cost.oldBooks, donations: gameState.resources.donations - cost.donations };
        } else {
            message = "자원이 부족하여 개설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    maintain_facility: (params) => {
        if (!spendActionPoint()) return;
        const facilityKey = params.facility;
        const cost = { oldBooks: 10, donations: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.oldBooks >= cost.oldBooks && gameState.resources.donations >= cost.donations) {
            gameState.archives[facilityKey].durability = 100;
            message = `${facilityKey} 기록실의 보수를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, oldBooks: gameState.resources.oldBooks - cost.oldBooks, donations: gameState.resources.donations - cost.donations };
        } else {
            message = "보수에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    upgrade_library: () => {
        if (!spendActionPoint()) return;
        const cost = 20 * (gameState.libraryLevel + 1);
        if (gameState.resources.oldBooks >= cost && gameState.resources.donations >= cost) {
            gameState.libraryLevel++;
            updateState({ resources: { ...gameState.resources, oldBooks: gameState.resources.oldBooks - cost, donations: gameState.resources.donations - cost }, libraryLevel: gameState.libraryLevel });
            updateGameDisplay(`도서관을 업그레이드했습니다! 모든 복원 성공률이 10% 증가합니다. (현재 레벨: ${gameState.libraryLevel})`);
        } else { updateGameDisplay(`업그레이드에 필요한 자원이 부족합니다. (오래된 책 ${cost}, 기부금 ${cost} 필요)`); }
        updateState({ currentScenarioId: 'intro' });
    },
    review_archives: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.3) { updateState({ resources: { ...gameState.resources, oldBooks: gameState.resources.oldBooks + 20, donations: gameState.resources.donations + 20 } }); updateGameDisplay("기록 보관소에서 잊혀진 기부금을 발견했습니다! (+20 오래된 책, +20 기부금)"); }
        else if (rand < 0.5) { updateState({ stability: gameState.stability + 10, tradition: gameState.tradition + 10 }); updateGameDisplay("과거의 기록에서 도서관의 안정을 다지는 지혜를 발견했습니다. (+10 안정, +10 전통)"); }
        else { updateGameDisplay("기록 보관소를 살펴보았지만, 특별한 것은 발견하지 못했습니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    accept_donation: () => {
        if (!spendActionPoint()) return;
        if (gameState.resources.donations >= 50) {
            updateState({ resources: { ...gameState.resources, donations: gameState.resources.donations - 50, historical_relics: (gameState.resources.historical_relics || 0) + 1 } });
            updateGameDisplay("희귀한 역사적 유물을 기증받았습니다! 도서관의 전통이 깊어집니다.");
        } else { updateGameDisplay("기증품을 운송할 기부금이 부족합니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    decline_donation: () => {
        if (!spendActionPoint()) return;
        updateGameDisplay("기증을 정중히 거절했습니다. 다음 기회를 기다려야겠습니다.");
        updateState({ currentScenarioId: 'intro' });
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 미니게임은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;
        
        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];
        
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } }); 
        
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    }
};

function applyStatEffects() {
    let message = "";
    if (gameState.dedication >= 70) {
        gameState.dailyBonus.restorationSuccess += 0.1;
        message += "높은 헌신도 덕분에 기록 복원 성공률이 증가합니다. ";
    }
    if (gameState.dedication < 30) {
        gameState.librarians.forEach(l => l.loyalty = Math.max(0, l.loyalty - 5));
        message += "낮은 헌신도로 인해 사서들의 충성도가 하락합니다. ";
    }

    if (gameState.stability >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "높은 안정성 덕분에 업무력이 증가합니다. ";
    }
    if (gameState.stability < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "안정성이 낮아져 업무에 차질이 생깁니다. ";
    }

    if (gameState.tradition >= 70) {
        Object.keys(gameState.archives).forEach(key => {
            if (gameState.archives[key].built) gameState.archives[key].durability = Math.min(100, gameState.archives[key].durability + 1);
        });
        message += "깊은 전통 덕분에 기록실 관리가 더 잘 이루어집니다. ";
    }
    if (gameState.tradition < 30) {
        Object.keys(gameState.archives).forEach(key => {
            if (gameState.archives[key].built) gameState.archives[key].durability = Math.max(0, gameState.archives[key].durability - 2);
        });
        message += "전통이 약화되어 기록실이 빠르게 노후화됩니다. ";
    }
    return message;
}

function generateRandomLibrarian() {
    const names = ["클라라", "아서", "아이린", "에드워드"];
    const personalities = ["신중한", "학구적인", "따뜻한", "원칙주의적인"];
    const skills = ["기록 복원", "방문객 응대", "고문서 해독", "분류"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        loyalty: 50
    };
}

// --- Daily/Initialization Logic ---
function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    updateState({
        actionPoints: 10,
        maxActionPoints: 10,
        dailyActions: { organized: false, meetingHeld: false, talkedTo: [], minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { restorationSuccess: 0 }
    });

    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    gameState.librarians.forEach(l => {
        if (l.skill === '기록 복원') { gameState.resources.memories++; skillBonusMessage += `${l.name}의 솜씨 덕분에 기억 조각을 추가로 얻었습니다. `; }
        else if (l.skill === '방문객 응대') { gameState.resources.donations++; skillBonusMessage += `${l.name}의 친절함 덕분에 기부금을 추가로 얻었습니다. `; }
        else if (l.skill === '분류') { gameState.tradition++; skillBonusMessage += `${l.name} 덕분에 도서관의 전통이 +1 상승했습니다. `; }
    });

    Object.keys(gameState.archives).forEach(key => {
        const facility = gameState.archives[key];
        if(facility.built) {
            facility.durability -= 1;
            if(facility.durability <= 0) {
                facility.built = false;
                durabilityMessage += `${key} 기록실이 파손되었습니다! 보수가 필요합니다. `;
            }
        }
    });

    gameState.resources.memories -= gameState.librarians.length * 2;
    let dailyMessage = "새로운 하루가 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.memories < 0) {
        gameState.stability -= 10;
        dailyMessage += "기억 조각이 부족하여 도서관의 안정이 흔들립니다! (-10 안정)";
    }
    
    const rand = currentRandFn();
    let eventId = "intro";
    if (rand < 0.15) { eventId = "daily_event_visitor_complaint"; updateState({resources: {...gameState.resources, stability: Math.max(0, gameState.resources.stability - 10)}}); }
    else if (rand < 0.30) { eventId = "daily_event_book_worm"; updateState({resources: {...gameState.resources, oldBooks: Math.max(0, gameState.resources.oldBooks - 10)}}); }
    else if (rand < 0.5 && gameState.librarians.length >= 2) { eventId = "daily_event_damage"; }
    else if (rand < 0.7 && gameState.archives.mainHall.built && gameState.librarians.length < gameState.maxLibrarians) {
        eventId = "daily_event_new_librarian";
        const newLibrarian = generateRandomLibrarian();
        gameState.pendingNewLibrarian = newLibrarian;
        gameScenarios["daily_event_new_librarian"].text = `새로운 사서 ${newLibrarian.name}(${newLibrarian.personality}, ${newLibrarian.skill})이(가) 합류하고 싶어 합니다. (현재 사서 수: ${gameState.librarians.length} / ${gameState.maxLibrarians})`;
    }
    else if (rand < 0.85 && gameState.archives.mainHall.built) { eventId = "daily_event_donation"; }
    
    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 도서관을 초기화하시겠습니까? 모든 기록이 사라집니다.")) {
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
