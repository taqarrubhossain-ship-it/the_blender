// Mock Data: Courses completed by the student (simulated from transcript)
const completedCourses = ["ENG 101", "MATH 150", "BIO 100"];

const majorRequirements = {
    "Biology": [
        { code: "BIOL 203", name: "Genetics", prereq: "BIO 100", type: "core" },
        { code: "CHEM 222", name: "Organic Chem", prereq: "CHEM 101", type: "core" },
        { code: "BIOL 300", name: "Cell Biology", prereq: "BIOL 203", type: "epermit", campus: "Baruch" }
    ],
    "Computer Science": [
        { code: "CSCI 135", name: "Software Design", prereq: "CSCI 127", type: "core" },
        { code: "MATH 155", name: "Calculus II", prereq: "MATH 150", type: "core" },
        { code: "CSCI 340", name: "Operating Systems", prereq: "CSCI 235", type: "epermit", campus: "Hunter" }
    ]
};

document.getElementById('transcriptUpload').addEventListener('change', function(e) {
    const campus = document.getElementById('campusSelect').value;
    const uploadArea = document.getElementById('upload-area');
    uploadArea.innerHTML = `<h3>Checking Prerequisites...</h3><div class='loader'></div>`;
    
    setTimeout(() => {
        // For testing, we'll cycle through Biology then Computer Science
        const major = (Math.random() > 0.5) ? "Biology" : "Computer Science";
        renderLockedDashboard(major, campus);
    }, 1200);
});

function renderLockedDashboard(major, campus) {
    document.getElementById('upload-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-profile').innerText = `${major} | ${campus.toUpperCase()}`;

    const recList = document.getElementById('recommendation-list');
    const permitList = document.getElementById('epermit-list');
    recList.innerHTML = ""; 
    permitList.innerHTML = "";

    majorRequirements[major].forEach(course => {
        const isMet = completedCourses.includes(course.prereq);
        const cardHTML = `
            <div class="course-card ${!isMet ? 'is-locked' : ''}">
                <div>
                    <strong>${course.code}</strong> - ${course.name}
                    ${!isMet ? `<span class="prereq-hint">Requires: ${course.prereq}</span>` : ''}
                </div>
                <div>${isMet ? '<button class="add-btn">+</button>' : '<span class="lock-icon">🔒</span>'}</div>
            </div>
        `;

        if (course.type === "core") {
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
        <div class="semester-box"><h4>Next Semester</h4><p>Focus on clearing missing prerequisites.</p></div>
        <div class="semester-box"><h4>Year 3</h4><p>Upper level major requirements.</p></div>
    `;
}
