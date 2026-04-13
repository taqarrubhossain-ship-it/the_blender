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
        .from('major_requirements') 
        .select('*')
        .eq('college', selectedCollege)
        .eq('major_name', selectedMajor);

    if (error) {
        console.error('Error:', error);
        return null;
    }
    return data;
}

/* ==========================================
   3. SMART SYNC & PARSING
   ========================================== */
document.getElementById('syncBtn').addEventListener('click', async function() {
    const rawText = document.getElementById('dwPaste').value;
    
    if (!rawText.trim()) {
        alert("The text area is empty!");
        return;
    }

    // A. Detect College (CCNY detection optimized for your paste)
    let detectedCol = "";
    if (rawText.includes("ccny.cuny.edu") || rawText.includes("CCNY")) detectedCol = "CCNY";
    else if (rawText.includes("Hunter")) detectedCol = "Hunter";
    else if (rawText.includes("Baruch")) detectedCol = "Baruch";

    // B. Course Detection (Regex for 3-5 digit CUNY codes)
    const courseRegex = /([A-Z]{2,4}\s\d{3,5})/g;
    const matches = rawText.match(courseRegex);

    if (matches) {
        completedCourses = [...new Set(matches.map(c => c.trim()))];
        
        // C. Detect GPA & Credits
        const gpaMatch = rawText.match(/Cumulative GPA\s+([\d.]+)/);
        const gpa = gpaMatch ? gpaMatch[1] : "N/A";

        // D. Auto-update UI
        document.getElementById('collegeSelect').value = detectedCol || "CCNY";
        document.getElementById('majorSelect').value = "Biology"; // Focused on your Biology major
        
        alert(`Sync Successful!\nCollege: ${detectedCol}\nGPA: ${gpa}\nCourses Found: ${completedCourses.length}`);
        
        const courses = await fetchMajorData(detectedCol || "CCNY", "Biology");
        renderLockedDashboard(`${detectedCol || "CCNY"} - Biology`, courses);
        
        // Show the Chat Button
        document.getElementById('openChatBtn').style.display = "block";
        document.getElementById('chatHistory').innerHTML = `<p class="bot-msg">I see your <b>${gpa} GPA</b> at CCNY. You've completed ${completedCourses.length} course entries. What would you like to know about your Biology requirements?</p>`;
    } else {
        alert("Sync failed. No course codes found. Try copying the entire DegreeWorks page.");
    }
});

/* ==========================================
   4. UI & CHAT CONTROLS
   ========================================== */
const drawer = document.getElementById('advisorDrawer');
document.getElementById('openChatBtn').addEventListener('click', () => drawer.classList.add('open'));
document.getElementById('closeChat').addEventListener('click', () => drawer.classList.remove('open'));

document.getElementById('viewMajorBtn').addEventListener('click', async function() {
    const col = document.getElementById('collegeSelect').value;
    const maj = document.getElementById('majorSelect').value;
    if (col && maj) {
        const courses = await fetchMajorData(col, maj);
        renderLockedDashboard(`${col} - ${maj}`, courses);
    }
});

function renderLockedDashboard(title, courses) {
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-profile').innerText = `${title} Explorer`;
    document.getElementById('detected-major').innerText = `Path: ${title}`;

    const recList = document.getElementById('recommendation-list');
    const permitList = document.getElementById('epermit-list');
    recList.innerHTML = ""; permitList.innerHTML = "";

    courses.forEach(course => {
        const isMet = !course.prerequisite || completedCourses.includes(course.prerequisite);
        const alreadyDone = completedCourses.includes(course.course_code);
        
        const cardHTML = `
            <div class="course-card ${alreadyDone ? 'is-done' : (!isMet ? 'is-locked' : 'is-available')}">
                <div>
                    <span class="category-tag">${course.category || 'Core'}</span><br>
                    <strong>${course.course_code}</strong> - ${course.course_name}
                    <br>
                    ${alreadyDone ? '<span class="status-text" style="color:var(--success-green)">✅ Completed</span>' : 
                      (!isMet ? `<span class="prereq-hint">🔒 Needs: ${course.prerequisite}</span>` : 
                      '<span class="status-text" style="color:var(--available-blue)">🟢 Ready to Take</span>')}
                </div>
            </div>
        `;
        if (course.is_epermit) permitList.innerHTML += cardHTML;
        else recList.innerHTML += cardHTML;
    });
}
