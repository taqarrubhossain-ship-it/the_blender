/* ==========================================
   1. CONNECTION & SESSION CONFIG
   ========================================== */
const SUPABASE_URL = 'https://mwwanyhnrbyrndnzqygp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gKsUflWwvYveDY3CtY6Sww_Q9WMOJAg';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let completedCourses = JSON.parse(localStorage.getItem('pathfinder_completed')) || [];
let currentUser = localStorage.getItem('pathfinder_user') || null;

/* ==========================================
   2. SIMULATED AUTH LOGIC
   ========================================== */
function handleAuthAction() {
    if (!currentUser) {
        const username = prompt("Enter Name or Student ID for Demo Login:");
        if (username) {
            currentUser = username;
            localStorage.setItem('pathfinder_user', username);
            updateAuthUI();
        }
    } else {
        if (confirm("Logout and clear demo session?")) {
            localStorage.removeItem('pathfinder_user');
            localStorage.removeItem('pathfinder_completed');
            location.reload();
        }
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const profileHeader = document.getElementById('user-profile');
    if (loginBtn) loginBtn.innerText = currentUser ? "Logout" : "Login";
    if (profileHeader && currentUser) {
        profileHeader.innerHTML = `Welcome, <strong>${currentUser}</strong>`;
    }
}

/* ==========================================
   3. DATABASE & LOADING LOGIC
   ========================================== */
async function loadRoadmap(col, maj) {
    console.log(`Loading Roadmap for: ${col} | ${maj}`);
    try {
        const { data, error } = await db
            .from('student_roadmap')
            .select('*')
            .eq('college_name', col)
            .eq('major_name', maj);

        if (error) throw error;

        if (data && data.length > 0) {
            // Update URL for routing
            const newUrl = `${window.location.pathname}?college=${encodeURIComponent(col)}&major=${encodeURIComponent(maj)}`;
            window.history.pushState({ col, maj }, '', newUrl);
            
            renderLockedDashboard(`${col} - ${maj}`, data);
        } else {
            alert("No data found for this selection in Supabase.");
        }
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

/* ==========================================
   4. RENDERING LOGIC
   ========================================== */
function renderLockedDashboard(title, courses) {
    const inputArea = document.getElementById('input-area');
    const dashboard = document.getElementById('dashboard');
    const recList = document.getElementById('recommendation-list');
    const openChatBtn = document.getElementById('openChatBtn');

    if (inputArea) inputArea.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');
    if (openChatBtn) openChatBtn.style.display = "block";

    document.getElementById('detected-major').innerText = `Path: ${title}`;
    recList.innerHTML = "";

    courses.forEach(course => {
        const displayCode = course.course_id.split('-').slice(1).join(' ');
        const alreadyDone = completedCourses.includes(displayCode);
        const ruleText = course.prereq_logic || "None";

        const checkMet = (reqStr) => {
            if (!reqStr || reqStr === "None") return true;
            const reqCodes = reqStr.match(/[A-Z]{2,4}\s?\d{3,5}/g) || [];
            return reqCodes.every(code => completedCourses.includes(code.replace(/\s/g, ' ')));
        };

        const isUnlocked = checkMet(ruleText);

        recList.innerHTML += `
            <div class="course-card ${alreadyDone ? 'is-done' : (!isUnlocked ? 'is-locked' : 'is-available')}">
                <div style="flex: 1;">
                    <strong>${displayCode}</strong> - ${course.course_name}
                    <div style="font-size: 0.7rem; color: #666;">Prereqs: ${ruleText}</div>
                    ${alreadyDone ? '✅ Completed' : (!isUnlocked ? '🔒 Locked' : '● Available')}
                </div>
            </div>`;
    });
}

/* ==========================================
   5. INITIALIZATION & EVENT LISTENERS
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();

    // 1. Manual Explore Trigger
    const viewMajorBtn = document.getElementById('viewMajorBtn');
    if (viewMajorBtn) {
        viewMajorBtn.addEventListener('click', () => {
            const col = document.getElementById('collegeSelect').value;
            const maj = document.getElementById('majorSelect').value;
            loadRoadmap(col, maj);
        });
    }

    // 2. Smart Sync Trigger
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            const rawText = document.getElementById('dwPaste').value;
            if (!rawText.trim()) return alert("Please paste your audit.");

            const detCol = rawText.includes("Hunter") ? "Hunter" : (rawText.includes("Baruch") ? "Baruch" : "CCNY");
            const detMaj = rawText.toLowerCase().includes("computer science") ? "Computer Science" : "Biology";

            const matches = rawText.match(/([A-Z]{2,4})\s?(\d{3,5})/gi) || [];
            completedCourses = [...new Set(matches.map(m => m.toUpperCase()))];
            localStorage.setItem('pathfinder_completed', JSON.stringify(completedCourses));

            loadRoadmap(detCol, detMaj);
        });
    }

    // 3. UI/Auth Listeners
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', handleAuthAction);

    const openChatBtn = document.getElementById('openChatBtn');
    const closeChatBtn = document.getElementById('closeChat');
    const drawer = document.getElementById('advisorDrawer');
    if (openChatBtn) openChatBtn.addEventListener('click', () => drawer.classList.add('open'));
    if (closeChatBtn) closeChatBtn.addEventListener('click', () => drawer.classList.remove('open'));
});
