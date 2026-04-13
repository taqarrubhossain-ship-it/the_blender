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
        .eq('college', selectedCollege) // Filter by College
        .eq('major_name', selectedMajor); // Filter by Major

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
        completedCourses = []; 
        this.innerText = "Loading...";
        
        const courses = await fetchMajorData(college, major);
        renderLockedDashboard(`${college} - ${major}`, courses);
        
        this.innerText = "View Requirements";
    } else {
        alert("Please select both a College and a Major.");
    }
});

// Handle Transcript Upload (Simulation)
document.getElementById('transcriptUpload').addEventListener('change', async function(e) {
    const inputArea = document.getElementById('input-area');
    inputArea.innerHTML = `<div class="card" style="grid-column: span 2;"><h3>Detecting College & Major...</h3><div class='loader'></div></div>`;
    
    // Simulate detecting a Hunter College CS student
    completedCourses = ["CSCI 127", "MATH 150"]; 
    const detectedCollege = "Hunter";
    const detectedMajor = "Computer Science";
    
    const courses = await fetchMajorData(detectedCollege, detectedMajor);
    
    setTimeout(() => {
        renderLockedDashboard(`${detectedCollege} - ${detectedMajor}`, courses);
    }, 1200);
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
        recList.innerHTML = `<p>No course data found in Supabase for this selection.</p>`;
        return;
    }

    courses.forEach(course => {
        const isMet = !course.prerequisite || completedCourses.includes(course.prerequisite);
        
        const cardHTML = `
            <div class="course-card ${!isMet ? 'is-locked' : ''}">
                <div>
                    <strong>${course.course_code}</strong> - ${course.course_name}
                    ${!isMet ? `<span class="prereq-hint">Requires: ${course.prerequisite}</span>` : '<span style="color:var(--success-green); font-size:0.7rem;">✓ Eligible</span>'}
                </div>
                <div>${isMet ? '<button class="add-btn">+</button>' : '<span class="lock-icon">🔒</span>'}</div>
            </div>
        `;

        if (!course.is_epermit) {
            recList.innerHTML += cardHTML;
        } else {
            permitList.innerHTML += cardHTML;
        }
    });
    
    renderGenericTimeline();
}

function renderGenericTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = `
        <div class="semester-box"><h4>Next Semester</h4><p>Focus on prerequisites.</p></div>
        <div class="semester-box"><h4>Year 3</h4><p>Core Requirements.</p></div>
    `;
}
