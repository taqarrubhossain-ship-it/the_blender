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
        console.error('Error fetching data:', error);
        return null;
    }
    return data;
}

/* ==========================================
   3. EVENT LISTENERS
   ========================================== */

// Handle Manual Selection
document.getElementById('viewMajorBtn').addEventListener('click', async function() {
    const college = document.getElementById('collegeSelect').value;
    const major = document.getElementById('majorSelect').value;

    if (college && major) {
        completedCourses = []; // Reset for manual check
        this.innerText = "Loading...";
        const courses = await fetchMajorData(college, major);
        renderLockedDashboard(`${college} - ${major}`, courses);
        this.innerText = "View Requirements";
    } else {
        alert("Please select both a College and a Major.");
    }
});

// Handle DegreeWorks Smart Sync
document.getElementById('syncBtn').addEventListener('click', async function() {
    const rawText = document.getElementById('dwPaste').value;
    
    if (!rawText) {
        alert("Please paste your DegreeWorks text first!");
        return;
    }

    // 1. Detect College automatically based on keywords in text
    let detectedCol = "";
    if (rawText.includes("Hunter College")) detectedCol = "Hunter";
    else if (rawText.includes("City College")) detectedCol = "CCNY";
    else if (rawText.includes("Baruch")) detectedCol = "Baruch";

    // 2. Find all Course Codes using Regex (e.g., CSCI 12700, PSY 1001)
    const courseRegex = /([A-Z]{3,4}\s?\d{3,5})/g;
    const matches = rawText.match(courseRegex);

    if (detectedCol && matches) {
        completedCourses = [...new Set(matches)]; // Clean duplicates
        alert(`Successfully Synced! Detected ${detectedCol} and ${completedCourses.length} courses.`);
        
        // Auto-update UI
        document.getElementById('collegeSelect').value = detectedCol;
        const major = document.getElementById('majorSelect').value || "Computer Science"; // Default to CS if not picked
        
        const courses = await fetchMajorData(detectedCol, major);
        renderLockedDashboard(`${detectedCol} - ${major}`, courses);
    } else {
        alert("Sync failed. Make sure you copied the full DegreeWorks audit text.");
    }
});

/* ==========================================
   4. RENDERING LOGIC 
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

    if (!courses || courses.length === 0) {
        recList.innerHTML = `<p>No course data found. Did you upload the Master CSV to Supabase?</p>`;
        return;
    }

    courses.forEach(course => {
        // A course is "Available" if it has no prereq OR the prereq is in our completed list
        const isMet = !course.prerequisite || completedCourses.includes(course.prerequisite);
        // A course is "Already Done" if it's in our completed list
        const alreadyDone = completedCourses.includes(course.course_code);
        
        const cardHTML = `
            <div class="course-card ${alreadyDone ? 'is-done' : (!isMet ? 'is-locked' : 'is-available')}">
                <div>
                    <span class="category-tag">${course.category || 'Core'}</span>
                    <strong>${course.course_code}</strong> - ${course.course_name}
                    <br>
                    ${alreadyDone ? '<span class="status-text">✅ Completed</span>' : 
                      (!isMet ? `<span class="prereq-hint">🔒 Requires: ${course.prerequisite}</span>` : 
                      '<span class="status-text">🟢 Available to Take</span>')}
                </div>
            </div>
        `;

        if (!course.is_epermit) {
            recList.innerHTML += cardHTML;
        } else {
            permitList.innerHTML += cardHTML;
        }
    });
}
