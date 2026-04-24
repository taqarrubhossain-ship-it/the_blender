/* ==========================================
   1. CONNECTION & SESSION CONFIG
   ========================================== */
const SUPABASE_URL = 'https://mwwanyhnrbyrndnzqygp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gKsUflWwvYveDY3CtY6Sww_Q9WMOJAg';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let completedCourses = [];
// Fix: Retrieve demo user from local storage
let currentUser = localStorage.getItem('pathfinder_user') || null;

/* ==========================================
   2. ROUTING LOGIC (Back Button Fix)
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

/* ==========================================
   3. DATABASE FUNCTIONS
   ========================================== */
async function fetchMajorData(selectedCollege, selectedMajor, degreeType = 'B.S.') {
    try {
        console.log(`Attempting Fetch: ${selectedCollege} | ${selectedMajor} | ${degreeType}`);
        
        let { data, error } = await db
            .from('student_roadmap') 
            .select('*')
            .eq('college_name', selectedCollege)
            .eq('major_name', selectedMajor)
            .eq('degree_type', degreeType);

        if (error) throw error;

        if (!data || data.length === 0) {
            const { data: fallbackData, error: fallbackError } = await db
                .from('student_roadmap')
                .select('*')
                .eq('college_name', selectedCollege)
                .eq('major_name', selectedMajor);
            
            if (fallbackError) throw fallbackError;
            return fallbackData;
        }
        return data;
    } catch (err) {
        console.error('Database Connection Failed:', err.message);
        return null;
    }
}

/* ==========================================
   4. SMART SYNC & TRIGGER LOGIC
   ========================================== */
const syncBtn = document.getElementById('syncBtn');
if (syncBtn) {
    syncBtn.addEventListener('click', async function() {
        const rawText = document.getElementById('dwPaste').value;
        const dashboard = document.getElementById('dashboard');
        const inputArea = document.getElementById('input-area');
        const statusHeader = document.getElementById('user-profile');
        
        if (!rawText.trim()) {
            alert("The text area is empty! Please paste your DegreeWorks audit.");
            return;
        }

        let detectedCol = "CCNY"; 
        if (rawText.includes("Hunter")) detectedCol = "Hunter";
        else if (rawText.includes("Baruch")) detectedCol = "Baruch";

        let detectedMaj = "Biology";
        const lowerText = rawText.toLowerCase();
        if (lowerText.includes("computer science")) detectedMaj = "Computer Science";
        else if (lowerText.includes("psychology")) detectedMaj = "Psychology";

        let detectedDeg = rawText.includes("Bachelor of Arts") ? "B.A." : "B.S.";

        updateURL(detectedCol, detectedMaj);

        const lines = rawText.split('\n');
        const tempCompleted = [];
        const universalRegex = /([A-Z]{2,4})\s?(\d{3,5})/i;

        lines.forEach(line => {
            const match = line.match(universalRegex);
            if (match) {
                const normalizedCode = `${match[1].toUpperCase()} ${match[2]}`;
                if (!/In-Progress|IP|\(IP\)|Registered|REG/i.test(line)) {
                    tempCompleted.push(normalizedCode);
                }
            }
        });

        completedCourses = [...new Set(tempCompleted)];
        const gpaMatch = rawText.match(/Cumulative GPA\s+([\d.]+)/);
        const gpa = gpaMatch ? gpaMatch[1] : "N/A";

        inputArea.classList.add('hidden');
        dashboard.classList.remove('hidden');
        if(statusHeader) statusHeader.innerText = `Analyzing ${detectedMaj}...`;
        
        document.getElementById('collegeSelect').value = detectedCol;
        document.getElementById('majorSelect').value = detectedMaj;

        const courses = await fetchMajorData(detectedCol, detectedMaj, detectedDeg);
        
        if (courses && courses.length > 0) {
            renderLockedDashboard(`${detectedCol} - ${detectedMaj} (${detectedDeg})`, courses);
            document.getElementById('openChatBtn').style.display = "block";
            document.getElementById('chatHistory').innerHTML = `<p class="bot-msg">Audit Analyzed! Found <b>${completedCourses.length}</b> requirements. GPA: <b>${gpa}</b>.</p>`;
        } else {
            if(statusHeader) statusHeader.innerText = "Data Missing";
            document.getElementById('recommendation-list').innerHTML = `<div class="card" style="border: 2px dashed #ff4d4d; padding: 20px;"><h4>Catalog Data Not Found</h4></div>`;
        }
    });
}

/* ==========================================
   5. UI & MANUAL CONTROLS
   ========================================== */
const drawer = document.getElementById('advisorDrawer');
const openChatBtn = document.getElementById('openChatBtn');
const closeChatBtn = document.getElementById('closeChat');

if(openChatBtn) openChatBtn.addEventListener('click', () => drawer.classList.add('open'));
if(closeChatBtn) closeChatBtn.addEventListener('click', () => drawer.classList.remove('open'));

const viewMajorBtn = document.getElementById('viewMajorBtn');
if(viewMajorBtn) {
    viewMajorBtn.addEventListener('click', async function() {
        const col = document.getElementById('collegeSelect').value;
        const maj = document.getElementById('majorSelect').value;
        const statusHeader = document.getElementById('user-profile');
        
        if (col && maj) {
            updateURL(col, maj);
            if(statusHeader) statusHeader.innerText = "Loading Roadmap...";
            completedCourses = []; 
            const courses = await fetchMajorData(col, maj, 'B.S.');
            
            if (courses && courses.length > 0) {
                renderLockedDashboard(`${col} - ${maj}`, courses);
                document.getElementById('openChatBtn').style.display = "block";
            } else {
                if(statusHeader) statusHeader.innerText = "No Data Found";
                alert("This major hasn't been imported yet.");
            }
        }
    });
}

function openGlobalSearch(courseCode) {
    const courseNum = courseCode.replace(/\D/g, "");
    navigator.clipboard.writeText(courseNum).then(() => {
        alert(`Course number ${courseNum} copied!\nOpening CUNY Global Search.`);
        window.open('https://globalsearch.cuny.edu/CFGlobalSearchTool/search.jsp', '_blank');
    });
}

/* ==========================================
   6. RENDERING LOGIC (Classes preserved)
   ========================================== */
function renderLockedDashboard(title, courses) {
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    const catalogUrl = courses[0]?.program_url || "#";
    const profileEl = document.getElementById('user-profile');
    if(profileEl) {
        profileEl.innerHTML = `
            ${title} Explorer <br>
            <a href="${catalogUrl}" target="_blank" style="font-size:0.7rem; color:#2196F3; text-decoration:none;">Official Catalog ↗</a>
        `;
    }
    document.getElementById('detected-major').innerText = `Path: ${title}`;

    const recList = document.getElementById('recommendation-list');
    recList.innerHTML = ""; 

    courses.forEach(course => {
        const displayCode = course.course_id.split('-').slice(1).join(' ');
        const alreadyDone = completedCourses.includes(displayCode);
        const ruleText = course.prereq_logic || course.prerequisites || "None";
        const semesterLabel = course.active_semester_code || "Fall 2026";

        const checkMet = (reqStr) => {
            if (!reqStr || reqStr === "None") return true;
            const reqCodes = reqStr.match(/[A-Z]{2,4}\s?\d{3,5}/g) || [];
            return reqCodes.every(code => completedCourses.includes(code.replace(/\s/g, ' ')));
        };

        const isFullyUnlocked = checkMet(ruleText);

        const cardHTML = `
            <div class="course-card ${alreadyDone ? 'is-done' : (!isFullyUnlocked ? 'is-locked' : (course.is_offered_current ? 'is-available' : 'is-wait'))}">
                <div style="flex: 1;">
                    <span class="category-tag">${course.requirement_type || "Major Core"}</span><br>
                    <strong>${displayCode}</strong> - ${course.course_name}
                    <div class="req-details" style="font-size: 0.75rem; margin: 8px 0; color: #555; background: #f4f4f4; padding: 5px; border-radius: 4px;">
                        <b>Prerequisites:</b> ${ruleText}
                    </div>
                    ${alreadyDone ? '<span class="status-text" style="color:#2ecc71">✅ Completed</span>' : 
                    (!isFullyUnlocked ? `<span class="prereq-hint" style="color:#e74c3c">🔒 Locked: Missing Prereqs</span>` : 
                    (course.is_offered_current ? `<span class="status-text" style="color:#2196F3">● Available (${semesterLabel})</span>` : 
                    `<span class="status-text" style="color:#f39c12">⏳ Not in ${semesterLabel} Schedule</span>`))}
                </div>
                ${!alreadyDone && isFullyUnlocked && course.is_offered_current ? `<button class="search-btn" onclick="openGlobalSearch('${displayCode}')">🔍 Find</button>` : ''}
            </div>`;
        recList.innerHTML += cardHTML;
    });
}

/* ==========================================
   7. AUTH UI & DEMO INITIALIZATION
   ========================================== */
function handleLogin() {
    if (!currentUser) {
        // Fix: Use simulated login to avoid 400 Google Provider error
        const username = prompt("Enter Name or ID for Demo Login:");
        if (username) {
            localStorage.setItem('pathfinder_user', username);
            location.reload(); 
        }
    } else {
        if (confirm("Logout of demo session?")) {
            localStorage.removeItem('pathfinder_user');
            location.reload();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI with demo user
    const profileHeader = document.getElementById('user-profile');
    const loginBtn = document.getElementById('login-btn');

    if (currentUser) {
        console.log("Logged in as Demo User:", currentUser);
        if(profileHeader) profileHeader.innerHTML = `Welcome, <strong>${currentUser}</strong>`;
        if(loginBtn) loginBtn.innerText = "Logout";
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }

    // 2. Safely run URL autoloader after everything is defined
    autoLoadFromURL();
});
