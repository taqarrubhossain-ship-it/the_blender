/* ==========================================
   1. CONNECTION & SESSION CONFIG
   ========================================== */
const SUPABASE_URL = 'https://mwwanyhnrbyrndnzqygp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gKsUflWwvYveDY3CtY6Sww_Q9WMOJAg';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Load progress and user from local storage
let completedCourses = JSON.parse(localStorage.getItem('pathfinder_completed')) || [];
let currentUser = localStorage.getItem('pathfinder_user') || null;

/* ==========================================
   2. SIMULATED AUTH LOGIC (Replaces Google Auth)
   ========================================== */
function handleAuthAction() {
    if (!currentUser) {
        // LOGIN FLOW
        const username = prompt("Enter Username or Student ID:");
        if (username) {
            currentUser = username;
            localStorage.setItem('pathfinder_user', username);
            updateAuthUI();
        }
    } else {
        // LOGOUT FLOW
        if (confirm("Logout and clear this demo session?")) {
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
        console.log("Session Active:", currentUser);
    } else {
        if (loginBtn) loginBtn.innerText = "Login";
    }
}

/* ==========================================
   3. ROUTING LOGIC (Back Button Fix)
   ========================================== */
function updateURL(college, major) {
    const newUrl = `${window.location.pathname}?college=${encodeURIComponent(college)}&major=${encodeURIComponent(major)}`;
    window.history.pushState({ college, major }, '', newUrl);
}

async function autoLoadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const col = params.get('college');
    const maj = params.get('major');
    
    if (col && maj) {
        const courses = await fetchMajorData(col, maj);
        if (courses && courses.length > 0) {
            renderLockedDashboard(`${col} - ${maj}`, courses);
        }
    }
}

window.onpopstate = function(event) {
    if (event.state) {
        autoLoadFromURL();
    } else {
        location.reload();
    }
};

autoLoadFromURL();

/* ==========================================
   4. DATABASE FUNCTIONS
   ========================================== */
async function fetchMajorData(selectedCollege, selectedMajor, degreeType = 'B.S.') {
    try {
        let { data, error } = await db
            .from('student_roadmap') 
            .select('*')
            .eq('college_name', selectedCollege)
            .eq('major_name', selectedMajor)
            .eq('degree_type', degreeType);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Database Connection Failed:', err.message);
        return null;
    }
}

/* ==========================================
   5. SMART SYNC & PERSISTENCE
   ========================================== */
const syncBtn = document.getElementById('syncBtn');
if (syncBtn) {
    syncBtn.addEventListener('click', async function() {
        const rawText = document.getElementById('dwPaste').value;
        if (!rawText.trim()) return;

        let detectedCol = rawText.includes("Hunter") ? "Hunter" : (rawText.includes("Baruch") ? "Baruch" : "CCNY");
        let detectedMaj = rawText.toLowerCase().includes("computer science") ? "Computer Science" : 
                         (rawText.toLowerCase().includes("psychology") ? "Psychology" : "Biology");
        let detectedDeg = rawText.includes("Bachelor of Arts") ? "B.A." : "B.S.";

        updateURL(detectedCol, detectedMaj);

        const lines = rawText.split('\n');
        const tempCompleted = [];
        const universalRegex = /([A-Z]{2,4})\s?(\d{3,5})/i;

        lines.forEach(line => {
            const match = line.match(universalRegex);
            if (match && !/In-Progress|IP|\(IP\)|Registered|REG/i.test(line)) {
                tempCompleted.push(`${match[1].toUpperCase()} ${match[2]}`);
            }
        });

        completedCourses = [...new Set(tempCompleted)];
        localStorage.setItem('pathfinder_completed', JSON.stringify(completedCourses));

        const courses = await fetchMajorData(detectedCol, detectedMaj, detectedDeg);
        if (courses && courses.length > 0) {
            renderLockedDashboard(`${detectedCol} - ${detectedMaj} (${detectedDeg})`, courses);
        }
    });
}

/* ==========================================
   6. RENDERING LOGIC
   ========================================== */
function renderLockedDashboard(title, courses) {
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('detected-major').innerText = `Path: ${title}`;

    const recList = document.getElementById('recommendation-list');
    recList.innerHTML = ""; 

    courses.forEach(course => {
        const displayCode = course.course_id.split('-').slice(1).join(' ');
        const alreadyDone = completedCourses.includes(displayCode);
        const ruleText = course.prereq_logic || course.prerequisites || "None";

        const checkMet = (reqStr) => {
            if (!reqStr || reqStr === "None") return true;
            const reqCodes = reqStr.match(/[A-Z]{2,4}\s?\d{3,5}/g) || [];
            return reqCodes.every(code => completedCourses.includes(code.replace(/\s/g, ' ')));
        };

        const isFullyUnlocked = checkMet(ruleText);

        recList.innerHTML += `
            <div class="course-card ${alreadyDone ? 'is-done' : (!isFullyUnlocked ? 'is-locked' : 'is-available')}">
                <div style="flex: 1;">
                    <strong>${displayCode}</strong> - ${course.course_name}
                    <div class="req-details" style="font-size: 0.7rem; color: #666;">
                        Prereqs: ${ruleText}
                    </div>
                    ${alreadyDone ? '✅ Done' : (!isFullyUnlocked ? '🔒 Locked' : '● Available')}
                </div>
            </div>`;
    });
}

/* ==========================================
   7. INITIALIZATION
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleAuthAction);
    }
});
