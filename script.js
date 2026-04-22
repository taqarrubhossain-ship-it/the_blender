/* ==========================================
   1. CONNECTION CONFIG
   ========================================== */
const SUPABASE_URL = 'https://mwwanyhnrbyrndnzqygp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gKsUflWwvYveDY3CtY6Sww_Q9WMOJAg';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let completedCourses = [];

/* ==========================================
   2. DATABASE FUNCTIONS
   ========================================== */
async function fetchMajorData(selectedCollege, selectedMajor) {
    const { data, error } = await db
        .from('student_roadmap') 
        .select('*')
        .eq('college_name', selectedCollege)
        .eq('major_name', selectedMajor);

    if (error) {
        console.error('Error fetching from Roadmap View:', error);
        return null;
    }
    return data;
}

/* ==========================================
   3. SMART SYNC & TRIGGER LOGIC
   ========================================== */
document.getElementById('syncBtn').addEventListener('click', async function() {
    const rawText = document.getElementById('dwPaste').value;
    const dashboard = document.getElementById('dashboard');
    const inputArea = document.getElementById('input-area');
    
    if (!rawText.trim()) {
        alert("The text area is empty! Please paste your DegreeWorks audit.");
        return;
    }

    // A. Detect College
    let detectedCol = "CCNY"; 
    if (rawText.includes("Hunter")) detectedCol = "Hunter";
    else if (rawText.includes("Baruch")) detectedCol = "Baruch";

    // B. Priority Major Detection
    let detectedMaj = "";
    const lowerText = rawText.toLowerCase();
    if (lowerText.includes("biology")) detectedMaj = "Biology";
    else if (lowerText.includes("computer science")) detectedMaj = "Computer Science";
    else if (lowerText.includes("psychology")) detectedMaj = "Psychology";
    else detectedMaj = "Biology";

    // C. UNIVERSAL PARSING (Captures subjects like CSCI, PSY, BIO)
    const lines = rawText.split('\n');
    const tempCompleted = [];
    const universalRegex = /([A-Z]{2,4})\s?(\d{3,5})/i;

    lines.forEach(line => {
        const match = line.match(universalRegex);
        if (match) {
            const subject = match[1].toUpperCase();
            const number = match[2];
            const normalizedCode = `${subject} ${number}`;
            const isInProgress = /In-Progress|IP|\(IP\)|Registered|REG/i.test(line);
            
            if (!isInProgress) {
                tempCompleted.push(normalizedCode);
            }
        }
    });

    completedCourses = [...new Set(tempCompleted)];

    // D. Extract GPA
    const gpaMatch = rawText.match(/Cumulative GPA\s+([\d.]+)/);
    const gpa = gpaMatch ? gpaMatch[1] : "N/A";

    // E. Visual Update
    inputArea.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('user-profile').innerText = `Syncing ${detectedMaj}...`;
    document.getElementById('collegeSelect').value = detectedCol;
    document.getElementById('majorSelect').value = detectedMaj;

    // F. Fetch & Render
    const courses = await fetchMajorData(detectedCol, detectedMaj);
    
    if (courses && courses.length > 0) {
        renderLockedDashboard(`${detectedCol} - ${detectedMaj}`, courses);
        document.getElementById('openChatBtn').style.display = "block";
        document.getElementById('chatHistory').innerHTML = `<p class="bot-msg">Audit Analyzed! Found <b>${completedCourses.length}</b> completed requirements. GPA: <b>${gpa}</b>.</p>`;
    } else {
        document.getElementById('recommendation-list').innerHTML = `<div class="card" style="border: 2px dashed #ff4d4d; padding: 20px;"><h4>Major Data Not Found</h4><p>Make sure the SQL expansion script was run in Supabase.</p></div>`;
    }
});

/* ==========================================
   4. UI & MANUAL EXPLORE CONTROLS
   ========================================== */
const drawer = document.getElementById('advisorDrawer');
document.getElementById('openChatBtn').addEventListener('click', () => drawer.classList.add('open'));
document.getElementById('closeChat').addEventListener('click', () => drawer.classList.remove('open'));

document.getElementById('viewMajorBtn').addEventListener('click', async function() {
    const col = document.getElementById('collegeSelect').value;
    const maj = document.getElementById('majorSelect').value;
    
    if (col && maj) {
        completedCourses = []; 
        const courses = await fetchMajorData(col, maj);
        
        if (courses && courses.length > 0) {
            renderLockedDashboard(`${col} - ${maj}`, courses);
            document.getElementById('openChatBtn').style.display = "block";
        }
    }
});

function openGlobalSearch(courseCode) {
    const courseNum = courseCode.replace(/\D/g, "");
    navigator.clipboard.writeText(courseNum).then(() => {
        alert(`Course number ${courseNum} copied!\nOpening CUNY Global Search.`);
        window.open('https://globalsearch.cuny.edu/CFGlobalSearchTool/search.jsp', '_blank');
    });
}

/* ==========================================
   5. RENDERING LOGIC (SYNCED WITH CATALOG SCHEMA)
   ========================================== */
function renderLockedDashboard(title, courses) {
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    document.getElementById('user-profile').innerText = `${title} Explorer`;
    document.getElementById('detected-major').innerText = `Path: ${title}`;

    const recList = document.getElementById('recommendation-list');
    recList.innerHTML = ""; 

    courses.forEach(course => {
        // Standardize display (e.g., 'BIO 10100')
        const displayCode = course.course_id.split('-').slice(1).join(' ');
        const alreadyDone = completedCourses.includes(displayCode);
        
        // Data Mapping: Uses prereq_logic (Coursicle) first
        const ruleText = course.prereq_logic || course.prerequisites || "None";
        const semesterLabel = course.active_semester_code || "Fall 2026";

        // Advanced Prerequisite Matching (handles varied spacing)
        const checkMet = (reqStr) => {
            if (!reqStr || reqStr === "None") return true;
            const reqCodes = reqStr.match(/[A-Z]{2,4}\s?\d{3,5}/g) || [];
            if (reqCodes.length === 0) return true;
            return reqCodes.every(code => {
                const normalized = code.replace(/\s/g, ' '); 
                return completedCourses.includes(normalized);
            });
        };

        const isPreMet = checkMet(ruleText);
        const isCoMet = checkMet(course.corequisites);
        const isFullyUnlocked = isPreMet && isCoMet;

        const cardHTML = `
            <div class="course-card ${alreadyDone ? 'is-done' : (!isFullyUnlocked ? 'is-locked' : (course.is_offered_current ? 'is-available' : 'is-wait'))}">
                <div style="flex: 1;">
                    <span class="category-tag">${course.requirement_type || "Major Core"}</span><br>
                    <strong>${displayCode}</strong> - ${course.course_name}
                    
                    <div class="req-details" style="font-size: 0.75rem; margin: 8px 0; color: #555; background: #f4f4f4; padding: 5px; border-radius: 4px;">
                        <b>Prerequisites:</b> ${ruleText}
                    </div>

                    ${alreadyDone ? 
                        '<span class="status-text" style="color:#2ecc71">✅ Completed</span>' : 
                        (!isFullyUnlocked ? 
                            `<span class="prereq-hint" style="color:#e74c3c">🔒 Locked: Missing Prereqs</span>` : 
                            (course.is_offered_current ? 
                                `<span class="status-text" style="color:#2196F3">● Available (${semesterLabel})</span>` : 
                                `<span class="status-text" style="color:#f39c12">⏳ Not in ${semesterLabel} Schedule</span>`
                            )
                        )
                    }
                </div>
                ${!alreadyDone && isFullyUnlocked && course.is_offered_current ? `
                    <button class="search-btn" onclick="openGlobalSearch('${displayCode}')">
                        🔍 Find
                    </button>
                ` : ''}
            </div>
        `;

        recList.innerHTML += cardHTML;
    });
}
