document.addEventListener("DOMContentLoaded", () => {
    initChecker();
});

let universityData = {};

/**
 * Initializes the checker by fetching data and setting up event listeners.
 */
async function initChecker() {
    try {
        const response = await fetch('../data/university_requirements.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        universityData = await response.json();
        populateUniversities();
    } catch (error) {
        console.error("Failed to load university requirements:", error);
        document.getElementById('university-select').innerHTML = '<option value="">-- Error Loading Data --</option>';
    }

    document.getElementById('university-select').addEventListener('change', (e) => {
        populatePrograms(e.target.value);
    });

    document.getElementById('check-plan-button').addEventListener('click', checkPrerequisites);
}

/**
 * Populates the university dropdown menu.
 */
function populateUniversities() {
    const uniSelect = document.getElementById('university-select');
    uniSelect.innerHTML = '<option value="">-- Select a University --</option>'; // Reset
    Object.keys(universityData).forEach(uni => {
        const option = document.createElement('option');
        option.value = uni;
        option.textContent = uni;
        uniSelect.appendChild(option);
    });
}

/**
 * Populates the program dropdown based on the selected university.
 * @param {string} universityName - The name of the selected university.
 */
function populatePrograms(universityName) {
    const progSelect = document.getElementById('program-select');
    const checkButton = document.getElementById('check-plan-button');
    progSelect.innerHTML = '<option value="">-- Select a Program --</option>'; // Reset

    if (universityName && universityData[universityName]) {
        Object.keys(universityData[universityName].programs).forEach(prog => {
            const option = document.createElement('option');
            option.value = prog;
            option.textContent = prog;
            progSelect.appendChild(option);
        });
        progSelect.disabled = false;
        checkButton.disabled = false;
    } else {
        progSelect.disabled = true;
        checkButton.disabled = true;
    }
}

/**
 * The main function to compare planned courses against program requirements.
 */
function checkPrerequisites() {
    const universityName = document.getElementById('university-select').value;
    const programName = document.getElementById('program-select').value;
    const resultsDiv = document.getElementById('checker-results'); // Get results div

    if (!universityName || !programName) {
        alert("Please select a university and a program.");
        return;
    }

    const savedPlan = localStorage.getItem("emhsCoursePlan");
    
    // --- MODIFIED SECTION ---
    if (!savedPlan) {
        // Instead of an alert, display a rich error message in the results area
        resultsDiv.innerHTML = `
            <div class="checker-error">
                <h3>No Saved Plan Found</h3>
                <p>We couldn't find a saved course plan in your browser. Please create one using the Interactive Course Planner, save it, and then return to this page.</p>
                <a href="planner.html" class="button-link">Go to Course Planner</a>
            </div>
        `;
        return;
    }
    // --- END OF MODIFICATION ---

    const plannedCourses = JSON.parse(savedPlan);
    const plannedCourseIds = plannedCourses.map(pc => pc.id);
    const programReqs = universityData[universityName].programs[programName];
    const findCourseNameById = (id) => courseData.find(c => c.id === id)?.name || id;

    let results = { met: [], missing: [], notes: programReqs.notes || "None", avg: programReqs.min_avg_range || "N/A", url: programReqs.url };

    // 1. Check for simple, individually required courses
    programReqs.required_courses?.forEach(reqId => {
        if (plannedCourseIds.includes(reqId)) {
            results.met.push({ type: 'course', details: `<strong>${findCourseNameById(reqId)}</strong>` });
        } else {
            results.missing.push({ type: 'course', details: `<strong>${findCourseNameById(reqId)}</strong>` });
        }
    });

    // 2. Check for complex group requirements (e.g., "choose 2 from this list")
    programReqs.group_requirements?.forEach(group => {
        const metInGroup = group.courses.filter(id => plannedCourseIds.includes(id));
        if (metInGroup.length >= group.how_many) {
            const courseNames = metInGroup.map(findCourseNameById).join(', ');
            results.met.push({ type: 'group', details: `<strong>${group.description}</strong> (Met with: ${courseNames})` });
        } else {
            const needed = group.how_many - metInGroup.length;
            const options = group.courses.map(findCourseNameById).join(', ');
            results.missing.push({ type: 'group', details: `Need <strong>${needed} more</strong> course(s) for: <em>${group.description}</em><br><small>Options: ${options}</small>` });
        }
    });

    displayResults(results);
}

/**
 * Renders the comparison results to the page.
 * @param {object} results - The results object from checkPrerequisites.
 */
function displayResults(results) {
    const resultsDiv = document.getElementById('checker-results');
    let html = '';

    if (results.met.length > 0) {
        html += '<h3 class="met">✅ Met Requirements</h3><ul>';
        results.met.forEach(item => html += `<li class="course-met">${item.details}</li>`);
        html += '</ul>';
    }

    if (results.missing.length > 0) {
        html += '<h3 class="missing">❌ Missing Requirements</h3><ul>';
        results.missing.forEach(item => html += `<li class="course-missing">${item.details}</li>`);
        html += '</ul>';
    } else {
        html += '<h3>🎉 Congratulations!</h3><p>You appear to meet all of the high school course requirements for this program based on your saved plan.</p>';
    }

    html += `<h3 class="notes">⚠️ Notes & Averages</h3>
             <div class="notes-section">
               <p><strong>Competitive Average Range:</strong> ${results.avg}</p>
               <p><strong>Official Notes:</strong> ${results.notes}</p>
               <a href="${results.url}" target="_blank" class="program-link">View Official Program Page →</a>
               <p><small>Disclaimer: This tool is for planning purposes only. Always confirm admission requirements on the official university website, as they can change.</small></p>
             </div>`;

    resultsDiv.innerHTML = html;
}