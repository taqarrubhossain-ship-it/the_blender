/* ==========================================
   1. CONNECTION & SESSION CONFIG
   ========================================== */
const SUPABASE_URL = 'https://mwwanyhnrbyrndnzqygp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gKsUflWwvYveDY3CtY6Sww_Q9WMOJAg';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Load progress and simulated user from Local Storage
let completedCourses = JSON.parse(localStorage.getItem('pathfinder_completed')) || [];
let currentUser = localStorage.getItem('pathfinder_user') || null;

/* ==========================================
   2. SIMULATED AUTH LOGIC (Replaces Google Auth)
   ========================================== */
function handleAuthAction() {
    if (!currentUser) {
        // SIMULATED LOGIN - Avoids the 400 Google Provider Error
        const username = prompt("Enter Name or Student ID for Demo Login:");
        if (username) {
            currentUser = username;
            localStorage.setItem('pathfinder_user', username);
            updateAuthUI();
        }
    } else {
        // LOGOUT/RESET
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
    
    if (currentUser) {
        if (loginBtn) loginBtn.innerText = "Logout";
        if (profileHeader) profileHeader.innerHTML = `Welcome, <strong>${currentUser}</strong>`;
    } else {
        if (loginBtn) loginBtn.innerText = "Login";
    }
}

/* ==========================================
   3. ROUTING & DATABASE FUNCTIONS
   ========================================= */
function updateURL(college, major) {
    const newUrl = `${window.location.pathname}?college=${encodeURIComponent(college)}&major=${encodeURIComponent(major)}`;
    window.history.pushState({ college, major }, '', newUrl);
}

async function fetchMajorData(selectedCollege, selectedMajor, degreeType = 'B.S.') {
    try {
        console.log(`Attempting Fetch: ${selectedCollege} | ${selectedMajor}`);
        
        let { data, error } = await db
            .from('student_roadmap') 
            .select('*')
            .eq('college_name', selectedCollege)
            .eq('major_name', selectedMajor);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Database Connection Failed:', err.message);
        return null;
    }
}

// Reusable function to trigger the dashboard view
async function loadRoadmap(col, maj) {
    const courses = await fetchMajorData(col, maj);
    if (courses && courses.length > 0) {
        updateURL(col, maj);
        renderLockedDashboard(`${col} - ${maj}`, courses);
        document.getElementById('openChatBtn').style.display = "block";
    } else {
        alert("Major data not found in database.");
    }
}

/* ==========================================
   4. SMART SYNC & MANUAL EXPLORE LISTENERS
   ========================================== */
function initTriggers() {
    // OPTION A: Smart Sync (DegreeWorks Paste)
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async function() {
            const rawText = document.getElementById('dwPaste').value;
            if (!rawText.trim()) {
                alert("Please paste your DegreeWorks audit.");
                return;
            }

            let detectedCol = rawText.includes("Hunter") ? "Hunter" : (rawText.includes("Baruch") ? "Baruch" : "CCNY");
            let detectedMaj = rawText.toLowerCase().includes("computer science") ? "Computer Science" : "Biology";

            const universalRegex = /([A-Z]{2,4})\s?(\d{3,5})/gi;
            const matches = rawText.match(universalRegex) || [];
            completedCourses = [...new Set(matches.map(m => m.toUpperCase()))];
            localStorage.setItem('pathfinder_completed', JSON.stringify(completedCourses));

            await loadRoadmap(detectedCol, detectedMaj);
        });
    }

    // OPTION B: Manual Explore (Dropdowns)
    const viewMajorBtn = document.getElementById('viewMajorBtn');
    if (viewMajorBtn) {
        viewMajorBtn.addEventListener('click', async function() {
            const col = document.getElementById('collegeSelect').value;
            const maj = document.getElementById('majorSelect').value;
            await loadRoadmap(col, maj);
        });
    }
}

/* ==========================================
   5. RENDERING LOGIC
   ========================================== */
function renderLockedDashboard(title, courses) {
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    const profileEl = document.getElementById('user-profile');
    if(profileEl && !currentUser) {
        profileEl.innerHTML = `<strong>${title} Explorer</strong>`;
    }
    
    document.getElementById('detected-major').innerText = `Path: ${title}`;
    const recList = document.getElementById('recommendation-list');
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
                    <div class="req-details" style="font-size: 0.7rem; color: #666;">
                        Prereqs: ${ruleText}
                    </div>
                    ${alreadyDone ? '✅ Completed' : (!isUnlocked ? '🔒 Locked' : '● Available')}
                </div>
            </div>`;
    });
}

/* ==========================================
   6. INITIALIZATION
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    initTriggers();

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', handleAuthAction);
    
    const openChatBtn = document.getElementById('openChatBtn');
    const closeChatBtn = document.getElementById('closeChat');
    const drawer = document.getElementById('advisorDrawer');
    if(openChatBtn) openChatBtn.addEventListener('click', () => drawer.classList.add('open'));
    if(closeChatBtn) closeChatBtn.addEventListener('click', () => drawer.classList.remove('open'));
});
