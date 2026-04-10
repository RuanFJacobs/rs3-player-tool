import { skillMilestones } from "./milestones.js";

let currentSortMode = "default";
let currentSortDirection = "desc";
let currentSkills = [];
let currentUsername = "";
let selectedUsername = "";
let currentOverall = null;
let currentCombatLevel = 0;
let secondPlayerData = null;
let secondOverall = null;
let secondCombatLevel = 0;
let secondUsername = "";
let activeCompareInput = "compare-username-1";
let trainingMode = "p2p";
let trainingSkills = [];
let trainingUsername = "";
let expandedTrainingSkill = null;
let currentView = "player";
let currentRankingsCategory = "0";
let currentRankingsData = [];
let rankingsPinnedPlayer = null;
let currentRankingsPage = 1;
let activityUsername = "";
let activityEntries = [];
let activityQuestNames = [];

const displayOrder = [
        "Attack", "Constitution", "Mining", "Strength", "Agility", "Smithing", "Defence", "Herblore",
        "Fishing", "Ranged", "Thieving", "Cooking", "Prayer", "Crafting", "Firemaking", "Magic",
        "Fletching", "Woodcutting", "Runecrafting", "Slayer", "Farming", "Construction", "Hunter",
        "Summoning", "Dungeoneering", "Divination", "Invention", "Archaeology", "Necromancy"
];

const savedSelectedUsername = localStorage.getItem("selectedUsername");

if (savedSelectedUsername) {
    selectedUsername = savedSelectedUsername;
}

const savedSortMode = localStorage.getItem("currentSortMode");
const savedSortDirection = localStorage.getItem("currentSortDirection");

if (savedSortMode) {
    currentSortMode = savedSortMode;
}

if (savedSortDirection) {
    currentSortDirection = savedSortDirection;
}

const savedTrainingMode = localStorage.getItem("trainingMode");

if (savedTrainingMode) {
    trainingMode = savedTrainingMode;
}

const savedRankingsCategory = localStorage.getItem("currentRankingsCategory");
const savedRankingsPage = localStorage.getItem("currentRankingsPage");

if (savedRankingsCategory) {
    currentRankingsCategory = savedRankingsCategory;
}

if (savedRankingsPage) {
    currentRankingsPage = Number(savedRankingsPage);
}


function showView(viewName) {
    currentView = viewName;

    localStorage.setItem("currentView", viewName);

    const views = ["player", "compare", "training", "activity", "rankings"];
    const navButtons = document.querySelectorAll(".nav-button");

    views.forEach(view => {
        const viewElement = document.getElementById(`${view}-view`);
        if (viewElement) {
            viewElement.style.display = view === viewName ? "block" : "none";
        }
    });

    navButtons.forEach(button => {
        button.classList.remove("active-nav");

        if (button.dataset.view === viewName) {
            button.classList.add("active-nav");
        }
    });

    // Rankings should work even with no selected player
    if (viewName === "rankings") {
        const categorySelect = document.getElementById("rankings-category");
        const input = document.getElementById("rankings-player-search");

        if (input) {
            input.value = selectedUsername || "";
        }

        if (categorySelect) {
            categorySelect.value = currentRankingsCategory || "0";
        }

        if (!currentRankingsData.length) {
            loadRankings(currentRankingsPage || 1);
        } else {
            renderRankings();
        }
    }
     

    if (selectedUsername) {
        if (viewName === "player") {
            const input = document.getElementById("username");

            if (input && input.value !== selectedUsername) {
                input.value = selectedUsername;
                searchPlayer();
            }
        }

        if (viewName === "activity") {
            const input = document.getElementById("activity-username");

            if (input && input.value !== selectedUsername) {
                input.value = selectedUsername;
                searchPlayerActivity();
            }
        }

        if (viewName === "training") {
            const input = document.getElementById("training-username");

            if (input && input.value !== selectedUsername) {
                input.value = selectedUsername;
                searchTrainingPlayer();
            }
        }

        if (viewName === "compare") {
            const input1 = document.getElementById("compare-username-1");
            const input2 = document.getElementById("compare-username-2");

            if (input1 && !input1.value) {
                input1.value = selectedUsername;
            }

            if (input2 && !input2.value) {
                activeCompareInput = "compare-username-2";
            }
        }
    }
}

function refreshAllRecentSearches() {
    renderRecentSearches();
    renderCompareRecentSearches();
    renderTrainingRecentSearches();
    renderActivityRecentSearches();
    renderRankingsRecentSearches();
}

function renderRecentSearchList(containerId, onClickHandler) {
    const container = document.getElementById(containerId);
    const searches = JSON.parse(localStorage.getItem("recentSearches")) || [];

    if (!container) return;

    if (searches.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = `
        <div class="recent-searches">
            ${searches.map(name => `
                <button class="recent-btn" data-username="${name}">${name}</button>
            `).join("")}
        </div>
    `;

    const recentButtons = container.querySelectorAll(".recent-btn");
    recentButtons.forEach(button => {
        button.addEventListener("click", function () {
            onClickHandler(this.dataset.username);
        });
    });
}

function renderRecentSearches() {
    renderRecentSearchList("recent-searches-container", searchRecent);
}

function renderCompareRecentSearches() {
    renderRecentSearchList("compare-recents-container", fillCompareRecent);
}

function renderTrainingRecentSearches() {
    renderRecentSearchList("training-recents-container", fillTrainingRecent);
}

function renderActivityRecentSearches() {
    renderRecentSearchList("activity-recents-container", fillActivityRecent);
}

function renderRankingsRecentSearches() {
    renderRecentSearchList("rankings-recents-container", fillRankingsRecent);
}

function openPlayerFromRankings(username) {
    selectedUsername = username;
    localStorage.setItem("selectedUsername", username);

    showView("player");
}

// Sorting function for the sort buttons
function setSortMode(mode) {
    currentSortMode = mode;

    if (mode === "default") {
        currentSortDirection = "desc";
    } else if (mode === "rank") {
        currentSortDirection = "desc"; // best rank first
    } else {
        currentSortDirection = "desc"; // highest first
    }

    localStorage.setItem("currentSortMode", mode);
    localStorage.setItem("currentSortDirection", currentSortDirection);

    if (currentSkills.length > 0) {
        renderStats();
    }
}

function setSortModeFromSelect(value) {
    setSortMode(value);
}

function toggleSortDirection() {
    if (currentSortMode === "default") return;

    currentSortDirection = currentSortDirection === "desc" ? "asc" : "desc";

    localStorage.setItem("currentSortDirection", currentSortDirection);

    if (currentSkills.length > 0) {
        renderStats();
    }
}

function getCombatPreference(skills) {
    const MAX_STYLE_XP = 200000000;
    const PROFILE_THRESHOLD = 0.05;

    const getSkill = name =>
        skills.find(s => s.name === name) || { xp: 0, rank: Number.MAX_SAFE_INTEGER };

    const attack = getSkill("Attack");
    const strength = getSkill("Strength");
    const ranged = getSkill("Ranged");
    const magic = getSkill("Magic");
    const necromancy = getSkill("Necromancy");

    const styles = [
        {
            key: "Melee",
            label: "Melee",
            xp: (attack.xp + strength.xp) / 2,
            rank: Math.min(attack.rank, strength.rank)
        },
        {
            key: "Ranged",
            label: "Ranged",
            xp: ranged.xp,
            rank: ranged.rank
        },
        {
            key: "Magic",
            label: "Magic",
            xp: magic.xp,
            rank: magic.rank
        },
        {
            key: "Necromancy",
            label: "Necromancy",
            xp: necromancy.xp,
            rank: necromancy.rank
        }
    ].map(style => ({
        ...style,
        normalizedXp: Math.min(Math.max(0, style.xp), MAX_STYLE_XP) / MAX_STYLE_XP
    }));

    const totalNormalized = styles.reduce((sum, style) => sum + style.normalizedXp, 0) || 1;

    const sorted = [...styles].sort((a, b) => {
        if (b.normalizedXp !== a.normalizedXp) {
            return b.normalizedXp - a.normalizedXp;
        }
        return a.rank - b.rank;
    });

    const topStyle = sorted[0];
    const includedStyles = sorted.filter(style =>
        Math.abs(topStyle.normalizedXp - style.normalizedXp) <= PROFILE_THRESHOLD
    );

    let favourite = topStyle.label;
    let profileType = "Single";

    if (includedStyles.length === 2) {
        favourite = "Hybrid";
        profileType = "Hybrid";
    } else if (includedStyles.length === 3) {
        favourite = "Tribrid";
        profileType = "Tribrid";
    } else if (includedStyles.length === 4) {
        favourite = "Balanced";
        profileType = "Balanced";
    }

    const segments = styles.map(style => ({
        ...style,
        percent: (style.normalizedXp / totalNormalized) * 100
    }));

    return {
        favourite,
        profileType,
        profileStyles: includedStyles.map(style => style.label),
        segments
    };
}

// Set Level Caps for each skill
function getActualCap() {
    return 99;
}
function getVirtualCap(skillName) {
    if (skillName === "Invention") {
        return 150;
    }
    return 120;
}

function getSummaryClass(winner) {
    if (winner === "Tie") return "summary-tie";
    return "summary-win";
}

function renderCompareStats() {
    const statsDiv = document.getElementById("compare-stats");

    const overallLevelWinner =
        currentOverall.level > secondOverall.level ? currentUsername :
        secondOverall.level > currentOverall.level ? secondUsername :
        "Tie";

    const overallXPWinner =
        currentOverall.xp > secondOverall.xp ? currentUsername :
        secondOverall.xp > currentOverall.xp ? secondUsername :
        "Tie";

    const combatWinner =
        currentCombatLevel > secondCombatLevel ? currentUsername :
        secondCombatLevel > currentCombatLevel ? secondUsername :
        "Tie";

        const overallRankWinner =
        currentOverall.rank < secondOverall.rank ? currentUsername :
        secondOverall.rank < currentOverall.rank ? secondUsername :
        "Tie";

    const overallScore = {
        [currentUsername]: 0,
        [secondUsername]: 0
    };

    if (overallLevelWinner !== "Tie") overallScore[overallLevelWinner]++;
    if (overallXPWinner !== "Tie") overallScore[overallXPWinner]++;
    if (combatWinner !== "Tie") overallScore[combatWinner]++;
    if (overallRankWinner !== "Tie") overallScore[overallRankWinner]++;

    let overallBannerText = "Overall comparison is tied";
    let overallBannerClass = "summary-tie";

    if (overallScore[currentUsername] > overallScore[secondUsername]) {
        overallBannerText = `<span class="banner-winner">${currentUsername}</span> is ahead overall!`;
        overallBannerClass = "summary-win";
    } else if (overallScore[secondUsername] > overallScore[currentUsername]) {
        overallBannerText = `<span class="banner-winner">${secondUsername}</span> is ahead overall!`;
        overallBannerClass = "summary-win";
    }

    const totalXP1 = currentOverall.xp >= 0 ? currentOverall.xp.toLocaleString() : "N/A";
    const totalXP2 = secondOverall.xp >= 0 ? secondOverall.xp.toLocaleString() : "N/A";

    const totalLevelDiff = Math.abs(currentOverall.level - secondOverall.level);
    const totalXPDiff = Math.abs(currentOverall.xp - secondOverall.xp);
    const combatDiff = Math.abs(currentCombatLevel - secondCombatLevel);
    const overallRankDiff = Math.abs(currentOverall.rank - secondOverall.rank);

    const totalLevelDiffText = totalLevelDiff === 0
        ? "Tie"
        : `+${totalLevelDiff.toLocaleString()} total level${totalLevelDiff !== 1 ? "s" : ""}`;

    const totalXPDiffText = totalXPDiff === 0
        ? "Tie"
        : `+${totalXPDiff.toLocaleString()} XP`;

    const combatDiffText = combatDiff === 0
        ? "Tie"
        : `+${combatDiff.toLocaleString()} combat level${combatDiff !== 1 ? "s" : ""}`;

    const overallRankDiffText = overallRankDiff === 0
        ? "Tie"
        : `+${overallRankDiff.toLocaleString()} overall rank${overallRankDiff !== 1 ? "s" : ""}`;

    let html = `
        <h2>${currentUsername} vs ${secondUsername}</h2>
        
        <div class="overall-banner ${overallBannerClass}">
            ${overallBannerText}
        </div>

        <div class="compare-summary">
            <div class="summary-card ${getSummaryClass(overallLevelWinner)}">
                <h4>Total Level</h4>
                <p>${currentUsername}: ${currentOverall.level}</p>
                <p>${secondUsername}: ${secondOverall.level}</p>
                <p class="summary-winner-label">Winner:</p>
                <p class="summary-winner">${overallLevelWinner}</p>
                <p class="summary-difference">${totalLevelDiffText}</p>
            </div>

            <div class="summary-card ${getSummaryClass(overallXPWinner)}">
                <h4>Total XP</h4>
                <p>${currentUsername}: ${totalXP1}</p>
                <p>${secondUsername}: ${totalXP2}</p>
                <p class="summary-winner-label">Winner:</p>
                <p class="summary-winner">${overallXPWinner}</p>
                <p class="summary-difference">${totalXPDiffText}</p>
            </div>

            <div class="summary-card ${getSummaryClass(combatWinner)}">
                <h4>Combat Level</h4>
                <p>${currentUsername}: ${currentCombatLevel}</p>
                <p>${secondUsername}: ${secondCombatLevel}</p>
                <p class="summary-winner-label">Winner:</p>
                <p class="summary-winner">${combatWinner}</p>
                <p class="summary-difference">${combatDiffText}</p>
            </div>

            <div class="summary-card ${getSummaryClass(overallRankWinner)}">
                <h4>Overall Rank</h4>
                <p>${currentUsername}: ${currentOverall.rank.toLocaleString()}</p>
                <p>${secondUsername}: ${secondOverall.rank.toLocaleString()}</p>
                <p class="summary-winner-label">Winner:</p>
                <p class="summary-winner">${overallRankWinner}</p>
                <p class="summary-difference">${overallRankDiffText}</p>
            </div>
        </div>

        <div class="compare-header-row">
            <div class="compare-player-name">${currentUsername}</div>
            <div></div>
            <div class="compare-player-name">${secondUsername}</div>
        </div>
    `;

    html += `<div class="compare-grid">`;

    for (const skillName of displayOrder) {
        const skillA = currentSkills.find(s => s.name === skillName);
        const skillB = secondPlayerData.find(s => s.name === skillName);

        const aWins =
            skillA.displayLevel > skillB.displayLevel ||
            (skillA.displayLevel === skillB.displayLevel && skillA.xp > skillB.xp);

        const bWins =
            skillB.displayLevel > skillA.displayLevel ||
            (skillA.displayLevel === skillB.displayLevel && skillB.xp > skillA.xp);

        const classA = aWins ? "compare-win" : bWins ? "compare-loss" : "";
        const classB = bWins ? "compare-win" : aWins ? "compare-loss" : "";

        const xpA = skillA.xp >= 0 ? skillA.xp.toLocaleString() : "N/A";
        const xpB = skillB.xp >= 0 ? skillB.xp.toLocaleString() : "N/A";

        let winnerText = "Tie";
        let isTie = false;
        let differenceText = "Tie";

        if (aWins) {
            winnerText = currentUsername;

            const xpDiff = skillA.xp - skillB.xp;
            differenceText = `+${xpDiff.toLocaleString()} XP`;
          
        } else if (bWins) {
            winnerText = secondUsername;

            const xpDiff = skillB.xp - skillA.xp;
            differenceText = `+${xpDiff.toLocaleString()} XP`;            

        } else {
            isTie = true;
        }

        let winnerSymbol = "";

        if (aWins) winnerSymbol = "← ";
        else if (bWins) winnerSymbol = "→ ";

        const winnerClass = isTie ? "tie" : "win";

        html += `
            <div class="compare-card ${classA}">
                <img src="${getSkillIcon(skillName)}" alt="${skillName}" class="skill-icon">
                <p><strong>${skillName}</strong></p>
                <p>Level ${skillA.displayLevel}</p>
                <p class="xp">XP ${xpA}</p>
                <p class="rank">Rank ${skillA.rank.toLocaleString()}</p>
            </div>

            <div class="compare-card compare-skill-name">
                <img src="${getSkillIcon(skillName)}" alt="${skillName}" class="skill-icon">
                <h4>${skillName}</h4>
                <p class="compare-winner-label">Winner:</p>
                <p class="compare-winner-name ${winnerClass}">
                    ${winnerSymbol}${winnerText}</p>
                <p class="compare-difference-value">${differenceText}</p>
            </div>

            <div class="compare-card ${classB}">
                <img src="${getSkillIcon(skillName)}" alt="${skillName}" class="skill-icon">
                <p><strong>${skillName}</strong></p>
                <p>Level ${skillB.displayLevel}</p>
                <p class="xp">XP ${xpB}</p>
                <p class="rank">Rank ${skillB.rank.toLocaleString()}</p>
            </div>
        `;
    }

    html += `</div>`;

    statsDiv.innerHTML = html;
}

// Display Skills
function renderStats() {
    const statsDiv = document.getElementById("stats");

    let skillsToRender = [...currentSkills];

    if (currentSortMode === "default") {
        skillsToRender.sort((a, b) => {
            return displayOrder.indexOf(a.name) - displayOrder.indexOf(b.name);
        });
    } else if (currentSortMode === "level") {
        skillsToRender.sort((a, b) => {
            if (b.displayLevel !== a.displayLevel) {
                return b.displayLevel - a.displayLevel;
            }
            if (b.xp !== a.xp) {
                return b.xp - a.xp;
            }
            return displayOrder.indexOf(a.name) - displayOrder.indexOf(b.name);
        });
    } else if (currentSortMode === "xp") {
        skillsToRender.sort((a, b) => {
            if (b.xp !== a.xp) {
                return b.xp - a.xp;
            }
        return displayOrder.indexOf(a.name) - displayOrder.indexOf(b.name);
        });
    } else if (currentSortMode === "rank") {
        skillsToRender.sort((a, b) => {
            if (a.rank !== b.rank) {
                return a.rank - b.rank;
            }
            return displayOrder.indexOf(a.name) - displayOrder.indexOf(b.name);
        });
    }

    if (currentSortDirection === "asc" && currentSortMode !== "default") {
        skillsToRender.reverse();
    }
      
    let html = ``;

    const overallXPDisplay = currentOverall.xp >= 0 ? currentOverall.xp.toLocaleString() : "N/A";
    const combatPreference = getCombatPreference(currentSkills);
    const totalRankDisplay = currentOverall.rank > 0 ? currentOverall.rank.toLocaleString() : "N/A";
    const centreIconsHtml = combatPreference.profileStyles.map(style => `
        <img
            src="${getSkillIcon(style)}"
            alt="${style}"
            class="combat-style-icon combat-style-icon-multi"
        >
    `).join("");

    html += `
        <div id="player-summary-export" class="overall-wrapper">
            <div class="export-username">${currentUsername}</div>
            
            <div class="player-summary-card">
                <div class="player-summary-left">
                    <div class="player-summary-title-row">
                        <h3>Combat Preference</h3>
                    </div>

                    <div class="combat-preference-panel">
                        <div
                            class="combat-preference-ring"
                            style="background: conic-gradient(
                                #c94b3c 0% ${combatPreference.segments[0].percent}%,
                                #4f9b3d ${combatPreference.segments[0].percent}% ${combatPreference.segments[0].percent + combatPreference.segments[1].percent}%,
                                #4169e1 ${combatPreference.segments[0].percent + combatPreference.segments[1].percent}% ${combatPreference.segments[0].percent + combatPreference.segments[1].percent + combatPreference.segments[2].percent}%,
                                #8a63d2 ${combatPreference.segments[0].percent + combatPreference.segments[1].percent + combatPreference.segments[2].percent}% 100%
                            );"
                        >
                            <div class="combat-preference-inner">
                                <div class="combat-style-icons-group combat-style-icons-${combatPreference.profileStyles.length}">
                                    ${centreIconsHtml}
                                </div>
                                <span class="combat-preference-label">Preferred Style</span>
                                <strong>${combatPreference.favourite}</strong>
                            </div>
                        </div>

                        <div class="combat-preference-legend">
                            ${combatPreference.segments.map(segment => `
                                <div class="combat-legend-row">
                                    <span class="combat-legend-swatch combat-${segment.key.toLowerCase()}"></span>
                                    <img 
                                        src="${getSkillIcon(segment.label)}"
                                        alt="${segment.label}"
                                        class="combat-legend-icon"
                                    >
                                    <span class="combat-legend-text">
                                        ${segment.label}
                                    </span>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                </div>

                <div class="player-summary-right">
                    <div class="summary-stat-box">
                        <span class="summary-stat-label">Total Level</span>
                        <img src="${getSkillIcon('Levels')}" alt="Levels" class="summary-stat-icon">
                        <strong class="summary-stat-value">${currentOverall.level.toLocaleString()}</strong>
                    </div>

                    <div class="summary-stat-box">
                        <span class="summary-stat-label">Combat Level</span>
                        <img src="${getSkillIcon('Combat')}" alt="Combat" class="summary-stat-icon">
                        <strong class="summary-stat-value">${currentCombatLevel}</strong>
                    </div>

                    <div class="summary-stat-box summary-stat-box-wide">
                        <span class="summary-stat-label">Overall Rank</span>
                        <strong class="summary-stat-value">${totalRankDisplay}</strong>
                    </div>

                    <div class="summary-stat-box summary-stat-box-wide">
                        <span class="summary-stat-label">Total XP</span>
                        <strong class="summary-stat-value">${overallXPDisplay}</strong>
                    </div>
                </div>
            </div>

            <div class="summary-actions">
                <button class="export-summary-btn" onclick="exportPlayerSummary()" title="Export summary">
                    Export Summary
                </button>
            </div>  
        </div>
    
        <div class="sort-bar">
            <div class="sort-group">
                <label for="skill-sort-mode" class="sort-label">Sort by:</label>

                <select id="skill-sort-mode" class="sort-select" onchange="setSortModeFromSelect(this.value)">
                    <option value="default" ${currentSortMode === "default" ? "selected" : ""}>Default</option>
                    <option value="level" ${currentSortMode === "level" ? "selected" : ""}>Level</option>
                    <option value="xp" ${currentSortMode === "xp" ? "selected" : ""}>XP</option>
                    <option value="rank" ${currentSortMode === "rank" ? "selected" : ""}>Rank</option>
                </select>
                
                ${currentSortMode !== "default" ? `
                    <button
                        class="sort-direction-icon-btn"
                        onclick="toggleSortDirection()"
                        title="Toggle sort direction"
                    >
                        <img 
                            src="/icons/${currentSortDirection === "desc" ? "descending.png" : "ascending.png"}"
                            alt="Sort direction"
                        >
                    </button>
                ` : ""}
            </div>
        </div>
    
        <div class="skills-grid">
    `;

    for (const skill of skillsToRender) {
        const xpDisplay = skill.xp >= 0 ? skill.xp.toLocaleString() : "N/A";

        const actualCap = getActualCap(skill.name);
        const virtualCap = getVirtualCap(skill.name);

        const isMax = skill.displayLevel >= actualCap;
        const isVirtualMax = skill.displayLevel >= virtualCap;
        const is200m = skill.xp >= 200000000;

        let extraClass = "";

        if (is200m) {
            extraClass = "xp-max";
        } else if (isVirtualMax) {
            extraClass = "virtual-max";
        } else if (isMax) {
            extraClass = "max";
        }

        html += `
            <div class="skill-card ${extraClass}" onclick="openTrainingFromSkill('${skill.name}')">
                <img src="${getSkillIcon(skill.name)}" alt="${skill.name}" class="skill-icon">
                <h4>${skill.name}</h4>
                <p>Level ${skill.displayLevel}</p>
                <p class="xp">XP ${xpDisplay}</p>
                ${currentSortMode === "rank" ? `<p class="rank">Rank ${skill.rank.toLocaleString()}</p>` : ""}
            </div>
        `;
    }

    statsDiv.innerHTML = html;
}

// Returns the XP required for a given level
function getXpForLevel(level) {
    let points = 0;

    for (let lvl = 1; lvl < level; lvl++) {
        points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    }

    return Math.floor(points / 4);
}

// Different Xp scaling for Invention
const inventionVirtualXp = {
    121: 83370445,
    122: 86186124,
    123: 89066630,
    124: 92012904,
    125: 95025896,
    126: 98106559,
    127: 101255855,
    128: 104474750,
    129: 107764216,
    130: 111125230,
    131: 114558777,
    132: 118065845,
    133: 121647430,
    134: 125304532,
    135: 129038159,
    136: 132849323,
    137: 136739041,
    138: 140708338,
    139: 144758242,
    140: 148889790,
    141: 153104021,
    142: 157401983,
    143: 161784728,
    144: 166253312,
    145: 170808801,
    146: 175452262,
    147: 180184770,
    148: 185007406,
    149: 189921255,
    150: 194927409
};

// Returns a display level based on XP
// Default visible cap: 99
// Virtual cap: 120
// Invention virtual cap: 150
function getDisplayLevel(skillName, xp, fallbackLevel) {
    if (xp < 0) {
        return fallbackLevel;
    }

    // Invention: trust API level up to 120, then use exact virtual thresholds
    if (skillName === "Invention") {
        if (xp < inventionVirtualXp[121]) {
            return fallbackLevel;
        }

        let displayLevel = 120;

        for (let level = 121; level <= 150; level++) {
            if (xp >= inventionVirtualXp[level]) {
                displayLevel = level;
            } else {
                break;
            }
        }

        return displayLevel;
    }

    // All other skills: normal virtual levels up to 120
    let displayLevel = 1;

    for (let level = 1; level <= 120; level++) {
        if (xp >= getXpForLevel(level)) {
            displayLevel = level;
        } else {
            break;
        }
    }

    return displayLevel;
}

// Combat level calculation
function calculateCombatLevel(skills) {
    const get = name => skills.find(s => s.name === name)?.level || 1;

    const attack = get("Attack");
    const strength = get("Strength");
    const defence = get("Defence");
    const constitution = get("Constitution");
    const prayer = get("Prayer");
    const ranged = get("Ranged");
    const magic = get("Magic");
    const summoning = get("Summoning");
    const necromancy = get("Necromancy");

    // Find the strongest combat style contribution
    const dominantStyle = Math.max(
        attack + strength,
        ranged * 2,
        magic * 2,
        necromancy * 2
    );

    // RS3 combat formula
    const combatLevel = (
        1 / 4 *
        (
            1.3 * dominantStyle +
            defence +
            constitution +
            Math.floor(prayer / 2) +
            Math.floor(summoning / 2)
        )
    );

    return Math.floor(combatLevel);
}


// Save recent search
function saveRecentSearch(username) {
    let searches = JSON.parse(localStorage.getItem("recentSearches")) || [];

    // Remove if already exists (avoid duplicates)
    searches = searches.filter(name => name.toLowerCase() !== username.toLowerCase());

    // Add to front
    searches.unshift(username);

    // Limit to 5
    searches = searches.slice(0, 5);

    localStorage.setItem("recentSearches", JSON.stringify(searches));
}

// Load recent searches on page load
function searchRecent(username) {
    const input = document.getElementById("username");

    if (input) {
        input.value = username;
        input.focus();
    }

    searchPlayer();
}

function fillCompareRecent(username) {
    const firstInput = document.getElementById("compare-username-1");
    const secondInput = document.getElementById("compare-username-2");

    if (!firstInput || !secondInput) return;

    // If a selected player exists, keep them in slot 1 unless the user explicitly clicked slot 1
    if (selectedUsername && activeCompareInput !== "compare-username-1") {
        if (!firstInput.value) {
            firstInput.value = selectedUsername;
        }

        secondInput.value = username;

        if (firstInput.value.trim() && secondInput.value.trim()) {
            searchComparePlayers();
        }

        return;
    }

    const targetInput = document.getElementById(activeCompareInput);

    if (targetInput) {
        targetInput.value = username;
    }

    const firstValue = firstInput.value.trim();
    const secondValue = secondInput.value.trim();

    if (activeCompareInput === "compare-username-1" && firstValue && !secondValue) {
        secondInput.focus();
        activeCompareInput = "compare-username-2";
        return;
    }

    if (firstValue && secondValue) {
        searchComparePlayers();
    }
}

// Get skill icon based on skill name
function getSkillIcon(skillName) {
    if (skillName === "Combat") {
        return "/icons/combat.png";
    }

    return `/icons/${skillName.toLowerCase()}.png`;
}

function getSpecialTrainingNote(skillName, mode) {
    if (skillName === "Constitution") {
        if (mode === "f2p") {
            return "Trained automatically through Melee, Ranged, or Magic combat.<br><br>Open the official RuneScape Wiki training guide for one of the following combat skills.";
        }

        return "Trained automatically through Melee, Ranged, Magic, or Combat-based Necromancy.<br><br>Open the official RuneScape Wiki training guide for one of the following combat skills.";
    }

    if (skillName === "Defence") {
        if (mode === "f2p") {
            return "Requires combat XP settings. Can be shared with Melee, Ranged, or Magic combat XP.<br>Go to Setting > Combat & Action Bar > Combat XP to change combat XP options.<br><br>Open the official RuneScape Wiki training guide for one of the following combat skills.";
        }

        return "Requires combat XP settings. Can be shared with Melee, Ranged, Magic or Necromancy combat XP.<br>Go to Setting > Combat & Action Bar > Combat XP to change combat XP options.<br><br>Open the official RuneScape Wiki training guide for one of the following combat skills.";
    }

    return "";
}

function isSpecialTrainingSkill(skillName) {
    return skillName === "Constitution" || skillName === "Defence";
}

function getSpecialTrainingOptions(skillName, mode) {
    if (skillName === "Constitution") {
        if (mode === "f2p") {
            return [
                { label: "Melee Training", url: "https://runescape.wiki/w/Free-to-play_Melee_training" },
                { label: "Ranged Training", url: "https://runescape.wiki/w/Free-to-play_Ranged_training" },
                { label: "Magic Training", url: "https://runescape.wiki/w/Free-to-play_Magic_training" }
            ];
        }

        return [
            { label: "Melee Training", url: "https://runescape.wiki/w/Pay-to-play_Melee_training" },
            { label: "Ranged Training", url: "https://runescape.wiki/w/Pay-to-play_Ranged_training" },
            { label: "Magic Training", url: "https://runescape.wiki/w/Pay-to-play_Magic_training" },
            { label: "Necromancy Training", url: "https://runescape.wiki/w/Pay-to-play_Necromancy_training" }
        ];
    }

    if (skillName === "Defence") {
        if (mode === "f2p") {
            return [
                { label: "Melee Training", url: "https://runescape.wiki/w/Free-to-play_Melee_training" },
                { label: "Ranged Training", url: "https://runescape.wiki/w/Free-to-play_Ranged_training" },
                { label: "Magic Training", url: "https://runescape.wiki/w/Free-to-play_Magic_training" }
            ];
        }

        return [
            { label: "Melee Training", url: "https://runescape.wiki/w/Pay-to-play_Melee_training" },
            { label: "Ranged Training", url: "https://runescape.wiki/w/Pay-to-play_Ranged_training" },
            { label: "Magic Training", url: "https://runescape.wiki/w/Pay-to-play_Magic_training" },
            { label: "Necromancy Training", url: "https://runescape.wiki/w/Pay-to-play_Necromancy_training" }
        ];
    }

    return [];
}

function toggleTrainingSkill(skillName) {
    if (expandedTrainingSkill === skillName) {
        expandedTrainingSkill = null;
    } else {
        expandedTrainingSkill = skillName;
    }

    if (trainingSkills.length > 0) {
        renderTrainingStats();
    }
}

function renderTrainingDetail(skill, mode) {
    const xpDisplay = skill.xp >= 0 ? skill.xp.toLocaleString() : "N/A";
    const upcomingMilestones = getUpcomingMilestones(skill);

    let milestoneHTML = "";

    if (upcomingMilestones.length > 0) {
        milestoneHTML = `
            <div class="training-milestones">
                <div class="training-detail-label">Important unlocks:</div>

                ${upcomingMilestones.slice(0, 7).map(m => `
                    <div class="milestone-row">
                        <span class="milestone-level">Level ${m.level}</span>
                        <span class="milestone-name">${m.name}</span>
                        <div class="milestone-note">${m.note}</div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    // Special handling for Defence / Constitution
    if (isSpecialTrainingSkill(skill.name)) {
        const trainingOptions = getSpecialTrainingOptions(skill.name, mode);
        const trainingNote = getSpecialTrainingNote(skill.name, mode);

        return `
            <div class="training-detail-panel">
                <div class="training-detail-header">
                    <img src="${getSkillIcon(skill.name)}" alt="${skill.name}" class="skill-icon">
                    <div>
                        <h4>${skill.name}</h4>
                        <p>Level ${skill.displayLevel}</p>
                        <p class="xp">XP ${xpDisplay}</p>
                    </div>
                </div>

                ${milestoneHTML}

                <p class="training-detail-note">${trainingNote}</p>

                <div class="training-detail-actions">
                    <span class="training-detail-label">How to train:</span>
                    ${trainingOptions.map(option => `
                        <a href="${option.url}" target="_blank" rel="noopener noreferrer" class="special-training-btn">
                            ${option.label}
                        </a>
                    `).join("")}
                </div>
            </div>
        `;
    }

    // Default handling for normal skills
    const wikiLink = getTrainingWikiLink(skill.name, mode);

    return `
        <div class="training-detail-panel">
            <div class="training-detail-header">
                <img src="${getSkillIcon(skill.name)}" alt="${skill.name}" class="skill-icon">
                <div>
                    <h4>${skill.name}</h4>
                    <p>Level ${skill.displayLevel}</p>
                    <p class="xp">XP ${xpDisplay}</p>
                </div>
            </div>

            ${milestoneHTML}

            <p class="training-detail-note">
                Open the official RuneScape Wiki training guide for ${skill.name}.
            </p>

            <div class="training-detail-actions">
                <a href="${wikiLink}" target="_blank" rel="noopener noreferrer" class="special-training-btn">
                    How to train?
                </a>
            </div>
        </div>
    `;
}

function setTrainingMode(mode) {
    trainingMode = mode;
    expandedTrainingSkill = null;

    localStorage.setItem("trainingMode", trainingMode);

    const f2pBtn = document.getElementById("training-f2p-button");
    const p2pBtn = document.getElementById("training-p2p-button");

    if (f2pBtn && p2pBtn) {
        f2pBtn.classList.toggle("active-sort", mode === "f2p");
        p2pBtn.classList.toggle("active-sort", mode === "p2p");
    }

    if (trainingSkills.length > 0) {
        renderTrainingStats();
    }
}

function getTrainingWikiLink(skillName, mode) {
    const formattedSkill = skillName.replace(/\s/g, "_");

    if (mode === "f2p") {
        return `https://runescape.wiki/w/Free-to-play_${formattedSkill}_training`;
    }

    return `https://runescape.wiki/w/Pay-to-play_${formattedSkill}_training`;
}

function getUpcomingMilestones(skill) {
    const milestones = skillMilestones[skill.name];

    if (!milestones) return [];

    return milestones.filter(m => skill.displayLevel < m.level);
}

function isF2PSkill(skillName) {
    const f2pSkills = [
        "Attack",
        "Constitution",
        "Mining",
        "Strength",
        "Defence",
        "Ranged",
        "Magic",
        "Cooking",
        "Woodcutting",
        "Fletching",
        "Fishing",
        "Firemaking",
        "Crafting",
        "Smithing",
        "Runecrafting"
    ];

    return f2pSkills.includes(skillName);
}

function getClosestMilestones(skills, limit = 3) {
    const upcoming = [];

    for (const skill of skills) {
        const milestones = getUpcomingMilestones(skill);

        if (milestones.length > 0) {
            const nextMilestone = milestones[0];
            const levelsRemaining = nextMilestone.level - skill.displayLevel;

            upcoming.push({
                skillName: skill.name,
                currentLevel: skill.displayLevel,
                targetLevel: nextMilestone.level,
                unlockName: nextMilestone.name,
                unlockNote: nextMilestone.note,
                levelsRemaining
            });
        }
    }

    upcoming.sort((a, b) => {
        if (a.levelsRemaining !== b.levelsRemaining) {
            return a.levelsRemaining - b.levelsRemaining;
        }

        return a.targetLevel - b.targetLevel;
    });

    return upcoming.slice(0, limit);
}

function renderTrainingStats() {
    const statsDiv = document.getElementById("training-stats");

    let skillsToRender = [...trainingSkills];

    if (trainingMode === "f2p") {
        skillsToRender = skillsToRender.filter(skill => isF2PSkill(skill.name));
    }

    skillsToRender.sort((a, b) => {
        if (a.xp !== b.xp) {
            return a.xp - b.xp;
        }
        return a.displayLevel - b.displayLevel;
    });

    const prioritySkills = skillsToRender.slice(0, 3);
    const priorityNames = prioritySkills.map(skill => skill.name);
    const closestMilestones = getClosestMilestones(trainingSkills, 3);

    let recommendationText = "No recommendations available yet.";

    if (prioritySkills.length === 3) {
        recommendationText = `Recommended focus: ${prioritySkills[0].name}, ${prioritySkills[1].name}, and ${prioritySkills[2].name} are currently your lowest XP skills in ${trainingMode.toUpperCase()}.`;
    } else if (prioritySkills.length > 0) {
        recommendationText = `Recommended focus: ${prioritySkills.map(skill => skill.name).join(", ")}.`;
    }

    let html = `
        <h2>${trainingUsername}</h2>
        <h3>Training Planner (${trainingMode.toUpperCase()})</h3>

        <div class="training-recommendation-box">
            <h4>Recommendation</h4>
            <p>${recommendationText}</p>
            <p class="training-recommendation-note">
                Start with your lowest skills first to keep your account balanced and make steady overall progress.
            </p>

            ${closestMilestones.length > 0 ? `
                <div class="training-closest-unlocks">
                    <h4>Closest Important Unlocks</h4>
                    ${closestMilestones.map(m => `
                        <div class="player-milestone-row">
                            <img src="${getSkillIcon(m.skillName)}" alt="${m.skillName}" class="skill-icon">
                            <div class="player-milestone-text">
                                <p><strong>${m.skillName}</strong> — Level ${m.targetLevel}</p>
                                <p>${m.unlockName}</p>
                                <p class="player-milestone-note">${m.unlockNote}</p>
                            </div>
                        </div>
                    `).join("")}
                </div>
            ` : ""}
        </div>

        <div class="skills-grid">
    `;

    for (let i = 0; i < skillsToRender.length; i += 3) {
        const rowSkills = skillsToRender.slice(i, i + 3);

        for (const skill of rowSkills) {
            const xpDisplay = skill.xp >= 0 ? skill.xp.toLocaleString() : "N/A";
            const isPriority = priorityNames.includes(skill.name);
            const isExpanded = expandedTrainingSkill === skill.name;

            html += `
                <div
                    class="skill-card training-card ${isPriority ? "training-priority" : ""} ${isExpanded ? "expanded-training-card" : ""}"
                    onclick="toggleTrainingSkill('${skill.name}')"
                >
                    <img src="${getSkillIcon(skill.name)}" alt="${skill.name}" class="skill-icon">
                    <h4>${skill.name}</h4>
                    <p>Level ${skill.displayLevel}</p>
                    <p class="xp">XP ${xpDisplay}</p>
                </div>
            `;
        }

        const expandedSkillInRow = rowSkills.find(skill => expandedTrainingSkill === skill.name);

        if (expandedSkillInRow) {
            html += `
                <div class="training-detail-row">
                    ${renderTrainingDetail(expandedSkillInRow, trainingMode)}
                </div>
            `;
        }
    }

    html += `</div>`;

    statsDiv.innerHTML = html;
}

function getRankingsCategoryName(categoryValue) {
    const categoryNames = {
        "0": "Overall",
        "1": "Attack",
        "2": "Defence",
        "3": "Strength",
        "4": "Constitution",
        "5": "Ranged",
        "6": "Prayer",
        "7": "Magic",
        "8": "Cooking",
        "9": "Woodcutting",
        "10": "Fletching",
        "11": "Fishing",
        "12": "Firemaking",
        "13": "Crafting",
        "14": "Smithing",
        "15": "Mining",
        "16": "Herblore",
        "17": "Agility",
        "18": "Thieving",
        "19": "Slayer",
        "20": "Farming",
        "21": "Runecrafting",
        "22": "Hunter",
        "23": "Construction",
        "24": "Summoning",
        "25": "Dungeoneering",
        "26": "Divination",
        "27": "Invention",
        "28": "Archaeology",
        "29": "Necromancy"
    };

    return categoryNames[categoryValue] || "Unknown";
}

function loadFirstRankingsPage() {
    currentRankingsPage = 1;
    localStorage.setItem("currentRankingsPage", 1);
    loadRankings(1);
}

function loadRankingsPageJump(offset) {
    const targetPage = Math.max(1, currentRankingsPage + offset);
    loadRankings(targetPage);
}

function renderRankingRow(player, extraClass = "") {
    const xpDisplay = !isNaN(Number(player.xp)) ? Number(player.xp).toLocaleString() : player.xp;
    const rankDisplay = !isNaN(Number(player.rank)) ? Number(player.rank).toLocaleString() : player.rank;
    const levelDisplay = !isNaN(Number(player.level)) ? Number(player.level).toLocaleString() : player.level;

    const tag = player.isSelected
        ? `<span class="ranking-row-tag">Selected</span>`
        : "";

    const safeName = player.name.replace(/'/g, "\\'");

    return `
        <div class="ranking-row ${extraClass}" onclick="openPlayerFromRankings('${safeName}')">
            <div class="ranking-row-rank">#${rankDisplay}</div>
            <div class="ranking-row-name">
                <strong>${player.name}</strong>
                ${tag}
            </div>
            <div class="ranking-row-level">Level ${levelDisplay}</div>
            <div class="ranking-row-xp">${xpDisplay} XP</div>
        </div>
    `;
}

function renderRankings() {
    const resultsDiv = document.getElementById("rankings-results");
    const categoryName = getRankingsCategoryName(currentRankingsCategory);

    if (!currentRankingsData.length) {
        resultsDiv.innerHTML = `<p>No rankings found for ${categoryName}.</p>`;
        return;
    }

    const mergedRows = buildMergedRankingsList(
        currentRankingsData,
        rankingsPinnedPlayer
    );

    let html = `<div class="rankings-table">`;

    for (const player of mergedRows) {
        let extraClass = "";

        if (player.isSelected) extraClass += " ranking-row-selected";
        if (String(player.rank) === "1") extraClass += " ranking-first";
        else if (String(player.rank) === "2") extraClass += " ranking-second";
        else if (String(player.rank) === "3") extraClass += " ranking-third";

        html += renderRankingRow(player, extraClass.trim());
    }

    html += `</div>`;
    html += renderRankingsPagination();

    resultsDiv.innerHTML = html;
}

function renderRankingsPagination() {
    const startPage = Math.max(1, currentRankingsPage - 7);
    const endPage = currentRankingsPage + 7;

    let html = `
        <div class="rankings-page-bar">
            <button
                class="rankings-page-nav"
                onclick="loadFirstRankingsPage()"
                ${currentRankingsPage === 1 ? "disabled" : ""}
            >
                FIRST
            </button>
            <button
                class="rankings-page-nav"
                onclick="loadPreviousRankingsPage()"
                ${currentRankingsPage === 1 ? "disabled" : ""}
            >
                ← PREV
            </button>
    `;

    for (let page = startPage; page <= endPage; page++) {
        html += `
            <button
                class="rankings-page-number ${page === currentRankingsPage ? "active" : ""}"
                onclick="loadRankings(${page})"
            >
                ${page}
            </button>
        `;
    }

    html += `
            <button
                class="rankings-page-nav"
                onclick="loadNextRankingsPage()"
            >
                NEXT →
            </button>
        </div>
    `;

    return html;
}

function parseRankingsHTML(htmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    const rows = Array.from(doc.querySelectorAll("table tr"));
    const parsed = [];

    for (const row of rows) {
        const cells = row.querySelectorAll("td");

        if (cells.length >= 4) {
            const rank = cells[0].textContent.trim();
            const name = cells[1].textContent.trim();
            const level = cells[2].textContent.trim();
            const xp = cells[3].textContent.trim();

            if (rank && name && !isNaN(Number(rank))) {
                parsed.push({
                    rank,
                    name,
                    level,
                    xp
                });
            }
        }
    }

    return parsed.slice(0, 25);
}

function getRankingsPageFromRank(rank) {
    const rankNumber = Number(String(rank).replace(/,/g, "").trim());

    if (!rankNumber || rankNumber < 1) {
        return 1;
    }

    return Math.floor((rankNumber - 1) / 25) + 1;
}

function loadNextRankingsPage() {
    loadRankings(currentRankingsPage + 1);
}

function loadPreviousRankingsPage() {
    if (currentRankingsPage > 1) {
        loadRankings(currentRankingsPage - 1);
    }
}

function getRankingEntryFromPlayerData(playerData, category) {
    if (!playerData) return null;

    if (category === "0") {
        return {
            rank: String(playerData.overall.rank),
            name: playerData.username,
            level: String(playerData.overall.level),
            xp: String(playerData.overall.xp)
        };
    }

    const categoryName = getRankingsCategoryName(category);
    const skill = playerData.skills.find(s => s.name === categoryName);

    if (!skill) return null;

    return {
        rank: String(skill.rank),
        name: playerData.username,
        level: String(skill.level),   // important: raw level, not displayLevel
        xp: String(skill.xp)
    };
}

function buildMergedRankingsList(pageRows, selectedEntry = null) {
    const byName = new Map();

    for (const row of pageRows) {
        byName.set(row.name.toLowerCase(), {
            ...row,
            isSelected: false
        });
    }

    if (selectedEntry) {
        const key = selectedEntry.name.toLowerCase();
        const existing = byName.get(key);

        byName.set(key, {
            ...(existing || {}),
            ...selectedEntry,
            isSelected: true
        });
    }

    return [...byName.values()].sort((a, b) => Number(a.rank) - Number(b.rank));
}

function sentenceKey(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function splitSentences(text) {
    return text
        .split(/(?<=[.?!])\s+/)
        .map(s => s.trim())
        .filter(Boolean);
}

function dedupeSentences(sentences) {
    const seen = new Set();
    const result = [];

    for (const s of sentences) {
        const key = sentenceKey(s);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(s);
        }
    }

    return result;
}

function normalizeRawActivityText(text) {
    let clean = text
        .replace(/Jagex[\s\S]*$/i, "")
        .replace(/This website and its contents[\s\S]*$/i, "")
        .replace(/Terms\s*&?\s*Conditions[\s\S]*$/i, "")
        .replace(/Privacy Policy[\s\S]*$/i, "")
        .replace(/RuneScape Cookie Policy[\s\S]*$/i, "")
        .replace(/English\s+Deutsch\s+Français[\s\S]*$/i, "")
        .replace(/\s+/g, " ")
        .trim();

    let sentences = splitSentences(clean);

    sentences = dedupeSentences(sentences);

    return sentences.join(" ").trim();
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
}

function stripOuterPunctuation(str) {
    return str
        .replace(/^[\s,.:;\-–—]+/, "")
        .replace(/[\s,.:;\-–—]+$/, "")
        .trim();
}

function ensurePeriod(str) {
    const clean = str.trim().replace(/[.?!]+$/, "");
    return clean ? `${clean}.` : "";
}

function formatQuestActivity(text, questNames = []) {
    const questText = text.replace(/^quest complete:\s*/i, "").trim();

    const matchedQuest = [...questNames]
        .sort((a, b) => b.length - a.length)
        .find(name => questText.toLowerCase().startsWith(name.toLowerCase()));

    if (!matchedQuest) {
        return ensurePeriod(`I completed ${questText}`);
    }

    let remainder = stripOuterPunctuation(questText.slice(matchedQuest.length));

    const firstSentence = splitSentences(remainder)[0] || "";
    remainder = stripOuterPunctuation(firstSentence);

    if (!remainder) {
        return `I completed ${matchedQuest}.`;
    }

    return `I completed ${matchedQuest}, ${ensurePeriod(remainder).slice(0, -1)}.`;
}

function sanitizeActivityDescription(text, username = "") {
    let clean = (text || "")
        .replace(/�+/g, "")                  // broken encoding leftovers
        .replace(/\s+/g, " ")
        .trim();

    // strip footer/page junk if it appears
    clean = clean
        .replace(/Jagex[\s\S]*$/i, "")
        .replace(/This website and its contents[\s\S]*$/i, "")
        .replace(/Terms\s*&?\s*Conditions[\s\S]*$/i, "")
        .replace(/Privacy Policy[\s\S]*$/i, "")
        .replace(/RuneScape Cookie Policy[\s\S]*$/i, "")
        .replace(/Manage Cookies[\s\S]*$/i, "")
        .replace(/English\s+Deutsch\s+Français[\s\S]*$/i, "")
        .trim();

    // strip the searched username if it somehow leaks into the entry
    if (username) {
        const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        clean = clean
            .replace(new RegExp(`^${escaped}\\s+`, "i"), "")
            .replace(new RegExp(`\\s+${escaped}$`, "i"), "")
            .trim();
    }

    return clean;
}

function formatBroadProgressActivity(text) {
    const clean = text.trim();

    // Completed X ...
    let match = clean.match(/^completed\s+(.+?)\s+i\s+/i);
    if (match) {
        return `Completed ${stripOuterPunctuation(match[1])}.`;
    }

    // 250 Quest Points obtained ...
    match = clean.match(/^(\d[\d,]*)\s+quest points obtained\b/i);
    if (match) {
        return `Reached ${match[1]} Quest Points.`;
    }

    // Levelled all skills over 29 ...
    match = clean.match(/^levelled all skills over\s+(\d+)\b/i);
    if (match) {
        return `Reached level ${match[1]} in all skills.`;
    }

    // Most flags captured ...
    match = clean.match(/^(most .+?)\.\s/i);
    if (match) {
        return `${stripOuterPunctuation(match[1])}.`;
    }

    // X reached / obtained / achieved ...
    match = clean.match(/^(.+?)\s+(reached|obtained|achieved)\b/i);
    if (match) {
        return `${stripOuterPunctuation(match[1])} ${match[2].toLowerCase()}.`;
    }

    // fallback: first sentence only
    const firstSentence = splitSentences(clean)[0] || clean;
    return ensurePeriod(firstSentence);
}

function classifyAndFormatActivity(description, questNames = []) {
    const text = normalizeRawActivityText(description);
    const lower = text.toLowerCase();

    let category = "activity";
    let title = "Recent Activity";
    let cleanDescription = text;

    // QUESTS
    if (lower.startsWith("quest complete:")) {
        category = "quest";
        title = "Quest Complete";
        cleanDescription = formatQuestActivity(text, questNames);
    }

    // XP milestones
    else if (/\b(\d[\d,]*)xp in\b/i.test(text) || lower.includes("experience points")) {
        category = "skill";
        title = "Level Up";

        const match = text.match(/^(\d[\d,]*)xp in\s+(.+?)(?:\s+i now have|\s+skill|$)/i);
        if (match) {
            const xp = Number(match[1].replace(/,/g, "")).toLocaleString();
            const skill = toTitleCase(stripOuterPunctuation(match[2]));
            cleanDescription = `My ${skill} reached ${xp} XP.`;
        } else {
            cleanDescription = ensurePeriod(text);
        }
    }

    // Level ups
    else if (
        lower.startsWith("levelled up ") ||
        lower.startsWith("leveled up ") ||
        lower.includes("i levelled my") ||
        lower.includes("i leveled my") ||
        lower.includes("i am now level")
    ) {
        category = "skill";
        title = "Level Up";

        let skill = "";
        let level = "";

        // Full 2-sentence pattern
        let match =
            text.match(/^levelled up\s+(.+?)\.\s*i levelled my\s+(.+?)\s+skill,\s*i am now level\s+(\d+)/i) ||
            text.match(/^leveled up\s+(.+?)\.\s*i leveled my\s+(.+?)\s+skill,\s*i am now level\s+(\d+)/i);

        if (match) {
            skill = match[2].trim();
            level = match[3].trim();
        } else {
            // Shorter fallback pattern
            match =
                text.match(/i levelled my\s+(.+?)\s+skill,\s*i am now level\s+(\d+)/i) ||
                text.match(/i leveled my\s+(.+?)\s+skill,\s*i am now level\s+(\d+)/i);

        if (match) {
            skill = match[1].trim();
            level = match[2].trim();
            }
        }
    
        if (skill && level) {
            cleanDescription = `My ${toTitleCase(stripOuterPunctuation(skill))} reached level ${level}.`;
        } else {
            cleanDescription = ensurePeriod(splitSentences(text)[0] || text);
        }
    }

    // Item drops / pets / drops from bosses / drops from special actions
    else if (
        lower.startsWith("i found ") ||
        lower.includes(" it dropped ") ||
        lower.includes(" after defeating ") ||
        lower.includes(" after killing ") ||
        lower.includes(" while skilling")
    ) {
        category = "drop";
        title = "Item Found";

        const m =
            text.match(/^i found\s+(.+?)\s+after defeating\s+(.+?)(?:,\s*i found\s+.+)?\.?$/i) ||
            text.match(/^i found\s+(.+?)\s+after killing\s+(.+?)(?:,\s*it dropped\s+.+)?\.?$/i) ||
            text.match(/^i found\s+(.+?)\s+after putting\s+(.+?)\s+back into hibernation(?:,\s*i found\s+.+)?\.?$/i) ||
            text.match(/^i found\s+(.+?)\.\s*i found\s+.+$/i) ||
            text.match(/^i found\s+(.+?)\s+while skilling(?:,\s*i found\s+.+)?\.?$/i);

        if (m) {
            const item = toTitleCase(stripOuterPunctuation(m[1]).replace(/^(a|an)\s+/i, ""));
            const source = m[2] ? toTitleCase(stripOuterPunctuation(m[2]).replace(/^(a|an)\s+/i, "")) : "";

            if (/while skilling/i.test(text)) {
                cleanDescription = `I found ${item} while skilling.`;
            } else if (/after putting/i.test(text)) {
                cleanDescription = `I found ${item} from ${source}.`;
            } else if (source) {
                cleanDescription = `I found ${item} from ${source}.`;
            } else {
                cleanDescription = `I found ${item}.`;
            }
        } else {
            const firstSentence = splitSentences(text)[0] || text;
            cleanDescription = ensurePeriod(firstSentence);
        }
    }

    // Boss counts
    else if (/^i killed\s+\d+/i.test(text)) {
        category = "boss";
        title = "Boss Kill";

        const match = text.match(/^i killed\s+(\d+)\s+(.+?)\.\s*/i);
        if (match) {
            const count = match[1].trim();
            const target = toTitleCase(stripOuterPunctuation(match[2]));
            cleanDescription = `I defeated ${count} ${target}.`;
        } else {
            cleanDescription = ensurePeriod(text.replace(/^i killed\s+/i, "I defeated "));
        }
    }

    // Single boss kill
    else if (lower.includes("boss monster") || lower.includes("killed a boss monster")) {
        category = "boss";
        title = "Boss Kill";

        const match = text.match(/called:\s*(.+?)\s+in\s+(.+?)\.?$/i);
        if (match) {
            const boss = toTitleCase(stripOuterPunctuation(match[1]));
            const place = toTitleCase(stripOuterPunctuation(match[2]));
            cleanDescription = `I defeated ${boss} in ${place}.`;
        } else {
            cleanDescription = ensurePeriod(text);
        }
    }

    // Broad progression / notable activity
    else if (
        lower.startsWith("completed ") ||
        lower.includes(" quest points obtained") ||
        lower.startsWith("levelled all skills over ") ||
        lower.includes(" milestone") ||
        lower.includes(" for the first time") ||
        lower.includes(" achieved ") ||
        lower.includes(" obtained ")
    ) {
        category = "activity";
        title = "Recent Activity";
        cleanDescription = formatBroadProgressActivity(text);
    }

    // Generic notable activities
    else if (lower.includes("dungeon floor")) {
        category = "activity";
        title = "Recent Activity";

        const match = text.match(/dungeon floor\s+(\d+)/i);
        cleanDescription = match
            ? `Reached dungeon floor ${match[1]}.`
            : ensurePeriod(splitSentences(text)[0] || text);
    }

    else {
        category = "activity";
        title = "Recent Activity";
        cleanDescription = ensurePeriod(splitSentences(text)[0] || text);
    }

    return {
        category,
        title,
        description: cleanDescription
    };
}

function parseActivityHTML(htmlText, questNames = []) {
    const entries = [];
    const seen = new Set();

    // Remove scripts/styles first
    const cleanedHtml = htmlText
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ");

    // Convert HTML to plain text
    const text = cleanedHtml
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();

    // Match repeated activity patterns directly from text
    // Example:
    // Jellieman 26-Mar-2026 07:58 Quest complete: A Soul's Bane ...
    const regex = /([A-Za-z0-9 _\-]+?)\s+(\d{1,2}-[A-Za-z]{3}-\d{4})\s+(\d{2}:\d{2})\s+(.+?)(?=(?:[A-Za-z0-9 _\-]+?\s+\d{1,2}-[A-Za-z]{3}-\d{4}\s+\d{2}:\d{2}\s)|$)/g;

    let match;

    while ((match = regex.exec(text)) !== null) {
        const username = match[1].trim();
        const date = match[2].trim();
        const time = match[3].trim();

        let description = sanitizeActivityDescription(match[4], activityUsername);

        if (!description) continue;

        const uniqueKey = `${username}|${date}|${time}|${description}`;
        if (seen.has(uniqueKey)) continue;
        seen.add(uniqueKey);

        const formatted = classifyAndFormatActivity(description, questNames);

        entries.push({
            username,
            date,
            time,
            title: formatted.title,
            description: formatted.description,
            category: formatted.category
        });
    }

    return entries.slice(0, 10);
}

function renderActivity() {
    const resultsDiv = document.getElementById("activity-results");

    if (!activityEntries.length) {
        resultsDiv.innerHTML = "<p>No recent activity available.</p>";
        return;
    }

    let html = `
        <h2>${activityUsername}</h2>
        
        <div class="activity-grid">
    `;

    for (const entry of activityEntries) {
        const meta = [entry.date, entry.time].filter(Boolean).join(" • ");

        html += `
            <div class="activity-card activity-${entry.category}">
                <div class="activity-top-row">
                    <span class="activity-badge activity-badge-${entry.category}">
                        ${entry.title}
                    </span>
                    <span class="activity-meta">${meta}</span>
                </div>
                <p class="activity-description">${entry.description}</p>
            </div>
        `;
    }

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function fillActivityRecent(username) {
    const input = document.getElementById("activity-username");

    if (input) {
        input.value = username;
        input.focus();
    }

    searchPlayerActivity();
}

async function openTrainingFromSkill(skillName) {
    if (!selectedUsername) return;

    showView("training");

    const input = document.getElementById("training-username");
    if (input) {
        input.value = selectedUsername;
    }

    await searchTrainingPlayer();

    expandedTrainingSkill = skillName;
    renderTrainingStats();
}

async function exportPlayerSummary() {
    const element = document.getElementById("player-summary-export");
    const actions = element?.querySelector(".summary-actions");

    if (!element) return;

    if (actions) {
        actions.style.display = "none";
    }

    const canvas = await html2canvas(element, {
        backgroundColor: "#0b0b0b",
        scale: 2
    });

    if (actions) {
        actions.style.display = "";
    }

    const link = document.createElement("a");
    const username = currentUsername || "player";

    link.download = `${username}-summary.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

async function fillRankingsRecent(username) {
    const input = document.getElementById("rankings-player-search");

    if (input) {
        input.value = username;
        input.focus();
    }

    await searchRankingsPlayer();
}

async function getRankingsEntryForUsername(username) {
    if (!username) return null;

    try {
        const playerData = await fetchPlayerData(username);
        return getRankingEntryFromPlayerData(playerData, currentRankingsCategory);
    } catch {
        return null;
    }
}

async function loadPinnedRankingsPlayer() {
    if (!selectedUsername) {
        rankingsPinnedPlayer = null;
        return;
    }

    try {
        const playerData = await fetchPlayerData(selectedUsername);
        rankingsPinnedPlayer = getRankingEntryFromPlayerData(playerData, currentRankingsCategory);
    } catch {
        rankingsPinnedPlayer = null;
    }
}

async function searchRankingsPlayer() {
    const input = document.getElementById("rankings-player-search");
    const username = input.value.trim();

    if (!username) {
        rankingsPinnedPlayer = null;
        renderRankings();
        return;
    }

    try {
        const playerData = await fetchPlayerData(username);

        selectedUsername = playerData.username;
        localStorage.setItem("selectedUsername", selectedUsername);

        currentUsername = playerData.username;
        currentSkills = playerData.skills;
        currentOverall = playerData.overall;
        currentCombatLevel = playerData.combatLevel;

        input.value = playerData.username;

        saveRecentSearch(playerData.username);
        refreshAllRecentSearches();

        await loadPinnedRankingsPlayer();

        let targetPage = 1;

        if (rankingsPinnedPlayer?.rank) {
            targetPage = getRankingsPageFromRank(rankingsPinnedPlayer.rank);
        }

        currentRankingsPage = targetPage;
        localStorage.setItem("currentRankingsPage", targetPage);

        await loadRankings(targetPage);

    } catch (error) {
        console.error("Error searching rankings player:", error);
    }
}

async function fetchQuestNames(username) {
    const response = await fetch(`/api/quests?player=${encodeURIComponent(username)}`);
    
    if (!response.ok) {
        return [];
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const names = Array.from(doc.querySelectorAll("h3"))
        .map(el => el.textContent.trim())
        .filter(Boolean);

    return [...new Set(names)].sort((a, b) => b.length - a.length);
}

async function searchPlayerActivity() {
    const input = document.getElementById("activity-username");
    const resultsDiv = document.getElementById("activity-results");
    const username = input.value.trim();

    if (!username) {
        resultsDiv.innerHTML = "<p>Please enter a username.</p>";
        return;
    }

    resultsDiv.innerHTML = `<p>Loading activity for <strong>${username}</strong>...</p>`;

    try {
        const response = await fetch(`/api/activity?player=${encodeURIComponent(username)}`);

        if (!response.ok) {
            throw new Error("Activity not available");
        }

        const htmlText = await response.text();
        
        selectedUsername = username;

        localStorage.setItem("selectedUsername", selectedUsername);

        activityUsername = username;
        activityQuestNames = await fetchQuestNames(username);
        activityEntries = parseActivityHTML(htmlText, activityQuestNames);

        saveRecentSearch(username);
        refreshAllRecentSearches();
        renderActivity();
    } catch (error) {
        console.error("Error loading activity:", error);

        resultsDiv.innerHTML = `
            <p>No recent activity found.</p>
            <p>This player's Adventurer's Log may be private or unavailable.</p>
        `;
    }
}

async function loadRankings(page = 1) {
    const categorySelect = document.getElementById("rankings-category");
    const resultsDiv = document.getElementById("rankings-results");

    currentRankingsCategory = categorySelect?.value || "0";
    currentRankingsPage = page;

    localStorage.setItem("currentRankingsCategory", currentRankingsCategory);
    localStorage.setItem("currentRankingsPage", page);

    resultsDiv.innerHTML = `<p>Loading ${getRankingsCategoryName(currentRankingsCategory)} rankings.</p>`;

    try {
        const response = await fetch(`/api/rankings?category=${encodeURIComponent(currentRankingsCategory)}&page=${page}`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const htmlText = await response.text();
        currentRankingsData = parseRankingsHTML(htmlText);

        if (!currentRankingsData.length) {
            return false;
        }

        await loadPinnedRankingsPlayer();
        renderRankings();
        return true;
    } catch (error) {
        console.error("Error loading rankings:", error);

        resultsDiv.innerHTML = `
            <p>Could not load rankings.</p>
            <p>Please try again.</p>
        `;

        return false;
    }
}

async function fetchPlayerData(username) {
    const url = `/api/rs3?player=${encodeURIComponent(username)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    const dataText = await response.text();
    const lines = dataText.trim().split("\n");

    const skillNames = [
        "Overall", "Attack", "Defence", "Strength", "Constitution", "Ranged", "Prayer", "Magic",
        "Cooking", "Woodcutting", "Fletching", "Fishing", "Firemaking", "Crafting", "Smithing",
        "Mining", "Herblore", "Agility", "Thieving", "Slayer", "Farming", "Runecrafting",
        "Hunter", "Construction", "Summoning", "Dungeoneering", "Divination", "Invention",
        "Archaeology", "Necromancy"
    ];

    const skills = [];

    for (let i = 1; i < skillNames.length; i++) {
        const parts = lines[i]?.split(",") || ["-1", "-1", "-1"];

        const rank = Number(parts[0]);
        const level = Number(parts[1]);
        const xp = Number(parts[2]);
        const displayLevel = getDisplayLevel(skillNames[i], xp, level);

        skills.push({
            name: skillNames[i],
            rank,
            level,
            xp,
            displayLevel
        });
    }

    const overallParts = lines[0]?.split(",") || ["-1", "-1", "-1"];

    const overall = {
        rank: Number(overallParts[0]),
        level: Number(overallParts[1]),
        xp: Number(overallParts[2])
    };

    const combatLevel = calculateCombatLevel(skills);

    return {
        username,
        skills,
        overall,
        combatLevel
    };
}

async function searchComparePlayers() {
    const statsDiv = document.getElementById("compare-stats");
    const firstInput = document.getElementById("compare-username-1");
    const secondInput = document.getElementById("compare-username-2");

    const firstUsername = firstInput.value.trim();
    const secondUsernameValue = secondInput.value.trim();

    if (!firstUsername || !secondUsernameValue) {
        statsDiv.innerHTML = "<p>Please enter both usernames.</p>";
        return;
    }

    statsDiv.innerHTML = `
        <p>Loading stats for <strong>${firstUsername}</strong> and <strong>${secondUsernameValue}</strong>...</p>
    `;

    try {
        const [playerOne, playerTwo] = await Promise.all([
            fetchPlayerData(firstUsername),
            fetchPlayerData(secondUsernameValue)
        ]);

        currentUsername = playerOne.username;
        currentSkills = playerOne.skills;
        currentOverall = playerOne.overall;
        currentCombatLevel = playerOne.combatLevel;

        secondUsername = playerTwo.username;
        secondPlayerData = playerTwo.skills;
        secondOverall = playerTwo.overall;
        secondCombatLevel = playerTwo.combatLevel;

        saveRecentSearch(firstUsername);
        saveRecentSearch(secondUsernameValue);
        refreshAllRecentSearches();
        renderCompareStats();

    } catch (error) {
        console.error("Error fetching compare stats:", error);

        statsDiv.innerHTML = `
            <p>Could not load compare stats.</p>
            <p>Please check both usernames and try again.</p>
        `;
    }
}

async function searchPlayer() { 
    const usernameInput = document.getElementById("username");
    const statsDiv = document.getElementById("stats");
    const username = usernameInput.value.trim();

    if (!username) {
        statsDiv.innerHTML = "<p>Please enter a username.</p>";
        return;
    }

    statsDiv.innerHTML = `<p>Loading stats for <strong>${username}</strong>...</p>`;

    try {
        const playerOne = await fetchPlayerData(username);

        selectedUsername = playerOne.username;

        localStorage.setItem("selectedUsername", playerOne.username);

        currentUsername = playerOne.username;
        currentSkills = playerOne.skills;
        currentOverall = playerOne.overall;
        currentCombatLevel = playerOne.combatLevel;

        secondPlayerData = null;
        secondOverall = null;
        secondCombatLevel = 0;
        secondUsername = "";

        saveRecentSearch(username);
        refreshAllRecentSearches();
        renderStats();
    } catch (error) {
        console.error("Error fetching RS3 stats:", error);

        statsDiv.innerHTML = `
            <p>Could not load stats.</p>
            <p>Please check the username and try again.</p>
        `;
    }
}

async function searchTrainingPlayer() {
    const input = document.getElementById("training-username");
    const statsDiv = document.getElementById("training-stats");
    const username = input.value.trim();

    if (!username) {
        statsDiv.innerHTML = "<p>Please enter a username.</p>";
        return;
    }

    statsDiv.innerHTML = `<p>Loading training plan for <strong>${username}</strong>...</p>`;

    try {
        const playerData = await fetchPlayerData(username);
        
        selectedUsername = playerData.username;

        localStorage.setItem("selectedUsername", playerData.username);

        trainingUsername = playerData.username;
        trainingSkills = [...playerData.skills];
        expandedTrainingSkill = null;

        saveRecentSearch(username);
        refreshAllRecentSearches();
        renderTrainingStats();
    } catch (error) {
        console.error("Error loading training player:", error);

        statsDiv.innerHTML = `
            <p>Could not load training plan.</p>
            <p>Please check the username and try again.</p>
        `;
    }
}

// Listeners for input fields
const usernameInput = document.getElementById("username");
const compareInput1 = document.getElementById("compare-username-1");
const compareInput2 = document.getElementById("compare-username-2");

// Player Summary Input
if (usernameInput) {
    usernameInput.addEventListener("focus", function () {
        this.select();
    });

    usernameInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            searchPlayer();
        }
    });
}

// Compare Input 1
if (compareInput1) {
    compareInput1.addEventListener("focus", function () {
        activeCompareInput = "compare-username-1";
        this.select();
    });

    compareInput1.addEventListener("click", function () {
        activeCompareInput = "compare-username-1";
    });

    compareInput1.addEventListener("keydown", function (event) {
        activeCompareInput = "compare-username-1";

        if (event.key === "Enter") {
            if (!compareInput2.value.trim()) {
                compareInput2.focus();
                activeCompareInput = "compare-username-2";
                return;
            }

            searchComparePlayers();
        }
    });
}

// Compare Input 2
if (compareInput2) {
    compareInput2.addEventListener("focus", function () {
        activeCompareInput = "compare-username-2";
        this.select();
    });

    compareInput2.addEventListener("click", function () {
        activeCompareInput = "compare-username-2";
    });

    compareInput2.addEventListener("keydown", function (event) {
        activeCompareInput = "compare-username-2";

        if (event.key === "Enter") {
            searchComparePlayers();
        }
    });
}

function fillTrainingRecent(username) {
    const input = document.getElementById("training-username");

    if (input) {
        input.value = username;
        input.focus();
    }

    searchTrainingPlayer();
}

document.addEventListener("DOMContentLoaded", () => {
    const savedView = localStorage.getItem("currentView") || "player";
    showView(savedView);

    refreshAllRecentSearches();
});

const trainingInput = document.getElementById("training-username");

if (trainingInput) {
    trainingInput.addEventListener("focus", function () {
        this.select();
    });

    trainingInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            searchTrainingPlayer();
        }
    });
}

const rankingsCategorySelect = document.getElementById("rankings-category");

if (rankingsCategorySelect) {
    rankingsCategorySelect.addEventListener("change", function () {
        currentRankingsPage = 1;
        loadRankings(1);
        this.blur();
    });
}

const activityInput = document.getElementById("activity-username");

if (activityInput) {
    activityInput.addEventListener("focus", function () {
        this.select();
    });

    activityInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            searchPlayerActivity();
        }
    });
}

const rankingsSearchInput = document.getElementById("rankings-player-search");

if (rankingsSearchInput) {
    rankingsSearchInput.addEventListener("focus", function () {
        this.select();
    });

    rankingsSearchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            searchRankingsPlayer();
        }
    });
}

setTrainingMode(trainingMode);

window.showView = showView;
window.searchPlayer = searchPlayer;
window.searchComparePlayers = searchComparePlayers;
window.searchTrainingPlayer = searchTrainingPlayer;
window.setSortMode = setSortMode;
window.toggleSortDirection = toggleSortDirection;
window.setTrainingMode = setTrainingMode;
window.toggleTrainingSkill = toggleTrainingSkill;
window.loadRankings = loadRankings;
window.loadPreviousRankingsPage = loadPreviousRankingsPage;
window.loadNextRankingsPage = loadNextRankingsPage;
window.searchPlayerActivity = searchPlayerActivity;
window.setSortModeFromSelect = setSortModeFromSelect;
window.searchRankingsPlayer = searchRankingsPlayer;
window.exportPlayerSummary = exportPlayerSummary;
window.openTrainingFromSkill = openTrainingFromSkill;
window.openPlayerFromRankings = openPlayerFromRankings;
window.loadFirstRankingsPage = loadFirstRankingsPage;