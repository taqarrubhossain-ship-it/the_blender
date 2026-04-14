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
        console.error('Error fetching from Supabase:', error);
        return null;
    }
    return data;
}

/* ==========================================
   3. SMART SYNC & TRIGGER LOGIC
   ========================================== */
document.getElementById('syncBtn').addEventListener('click', async function() {
    const rawText = document.getElementById('dwPaste').value;
    
    if (!rawText.trim()) {
        alert("The text area is empty! Please paste your DegreeWorks audit.");
        return;
    }

    // A. Detect College (Look for CUNY keywords)
    let detectedCol = "";
    if (rawText.includes("ccny.cuny.edu") || rawText.includes("CCNY") || rawText.includes("City College")) detectedCol = "CCNY";
    else if (rawText.includes("Hunter")) detectedCol = "Hunter";
    else if (rawText.includes("Baruch")) detectedCol = "Baruch";

    // B. Detect Major (Scan for keywords)
    let detectedMaj = "";
    const lowerText = rawText.toLowerCase();
    if (lowerText.includes("computer science")) detectedMaj = "Computer Science";
    else if (lowerText.includes("psychology")) detectedMaj = "Psychology";
    else if (lowerText.includes("biology")) detectedMaj = "Biology";

    // C. Course Detection (Optimized Regex for 3-5 digit codes)
    const courseRegex = /([A-Z]{2,4}\s\d{3,5})/g;
    const matches = rawText.match(courseRegex);

    if (matches) {
        completedCourses = [...new Set(matches.map(c => c.trim()))];
        
        // D. Detect GPA
        const gpaMatch = rawText.match(/Cumulative GPA\s+([\d.]+)/);
        const gpa = gpaMatch ? gpaMatch[1] : "N/A";

        // E. Sync Select Menus to match detected data
        if (detectedCol) document.getElementById('collegeSelect').value = detectedCol;
        if (detectedMaj) document.getElementById('majorSelect').value = detectedMaj;
        
        const finalCol = detectedCol || document.getElementById('collegeSelect').value;
        const finalMaj = detectedMaj || document.getElementById('majorSelect').value;

        // F. THE TRIGGER: Fetch and Render Dashboard immediately
        if (finalCol && finalMaj) {
            const courses = await fetchMajorData(finalCol, finalMaj);
            
            if (courses && courses.length > 0) {
                renderLockedDashboard(`${finalCol} - ${finalMaj}`, courses);
                
                // Success feedback
                alert(`Sync Successful!\nCollege: ${finalCol}\nMajor: ${finalMaj}\nGPA: ${gpa}`);
                
                // Show/Update Advisor Chat
                document.getElementById('openChatBtn').style.display = "block";
                document.getElementById('chatHistory').innerHTML = `
                    <p class="bot-msg">
                        I've analyzed your <b>${finalCol} ${finalMaj}</b> audit. 
                        With a <b>${gpa} GPA</b> and ${completedCourses.length} course entries found, 
                        I've updated your roadmap below.
                    </p>`;
            } else {
                alert(`Sync worked, but no rows found in Supabase for ${finalMaj} at ${finalCol}. Check your table data!`);
            }
        }
    } else {
        alert("Sync failed. No course codes found. Make sure you copied the Audit view.");
    }
});

/* ==========================================
   4. UI & CHAT CONTROLS
   ========================================== */
const drawer = document.getElementById('advisorDrawer');
document.getElementById('openChatBtn').addEventListener('click', () => drawer.classList.add('open'));
document.getElementById('closeChat').addEventListener('click', () => drawer.classList.remove('open'));

// Manual View Trigger
document.getElementById('viewMajorBtn').addEventListener('click', async function() {
    const col = document.getElementById('collegeSelect').value;
    const maj = document.getElementById('majorSelect').value;
    
    if (col && maj) {
        completedCourses = []; // Clear previous sync data for manual exploration
        const courses = await fetchMajorData(col, maj);
        renderLockedDashboard(`${col} - ${maj}`, courses);
    } else {
        alert("Please select both a college and a major.");
    }
});

/* ==========================================
   5. RENDERING LOGIC
   ========================================== */
function renderLockedDashboard(title, courses) {
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-profile').innerText = `${title} Explorer`;
    document.getElementById('detected-major').innerText = `Path: ${title}`;

    const recList = document.getElementById('recommendation-list');
    const permitList = document.getElementById('epermit-list');
    recList.innerHTML = ""; 
    permitList.innerHTML = "";

    courses.forEach(course => {
        // Logic: Available if no prereq OR the prereq exists in 'completedCourses'
        const isMet = !course.prerequisite || completedCourses.includes(course.prerequisite);
        const alreadyDone = completedCourses.includes(course.course_code);
        
        const cardHTML = `
            <div class="course-card ${alreadyDone ? 'is-done' : (!isMet ? 'is-locked' : 'is-available')}">
                <div>
                    <span class="category-tag">${course.category || 'Major Requirement'}</span><br>
                    <strong>${course.course_code}</strong> - ${course.course_name}
                    <br>
                    ${alreadyDone ? 
                        '<span class="status-text" style="color:var(--success-green)">✅ Completed</span>' : 
                        (!isMet ? 
                            `<span class="prereq-hint">🔒 Needs: ${course.prerequisite}</span>` : 
                            '<span class="status-text" style="color:var(--available-blue)">🟢 Ready to Take</span>'
                        )
                    }
                </div>
            </div>
        `;

        if (course.is_epermit) {
            permitList.innerHTML += cardHTML;
        } else {
            recList.innerHTML += cardHTML;
        }
    });
}
