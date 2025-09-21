import { courseData } from '../../shared/data/course-data.js';

document.addEventListener("DOMContentLoaded", () => {
    // --- DATA CACHE ---
    let careerData = {};

    // --- DOM ELEMENTS ---
    const interestSelect = document.getElementById('interest-select');
    const careerGridContainer = document.getElementById('career-grid-container');
    const careerDetailsContainer = document.getElementById('career-details-container');

    /**
     * Main initialization function
     */
    async function init() {
        try {
            // Fetch all required data
            careerData = await fetch('../../shared/data/career-data.json').then(res => res.json());
            
            populateInterestSelect();
            attachEventListeners();

        } catch (error) {
            console.error("Failed to load required data:", error);
            careerGridContainer.innerHTML = '<p class="error-message">Could not load career data. Please try again later.</p>';
        }
    }

    /**
     * Populates the interest area dropdown menu
     */
    function populateInterestSelect() {
        interestSelect.innerHTML = '<option value="">-- Select an Interest --</option>';
        careerData.interestCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            interestSelect.appendChild(option);
        });
    }

    /**
     * Renders the grid of career cards based on selected interest
     * @param {string} interestId - The ID of the selected interest category.
     */
    function renderCareerGrid(interestId) {
        const filteredCareers = careerData.careers.filter(c => c.interestIds.includes(interestId));

        if (filteredCareers.length === 0) {
            careerGridContainer.innerHTML = '<p class="placeholder-message">No careers found for this category.</p>';
            return;
        }

        careerGridContainer.innerHTML = filteredCareers.map(career => `
            <div class="career-card" data-career-id="${career.id}">
                <h3>${career.title}</h3>
            </div>
        `).join('');
    }

    /**
     * Renders the detailed view for a selected career
     * @param {string} careerId - The ID of the selected career.
     */
    function renderCareerDetails(careerId) {
        const career = careerData.careers.find(c => c.id === careerId);
        if (!career) return;
        
        const findCourseName = (id) => courseData.find(c => c.id === id)?.name || id;

        const requirementsHtml = career.generalRequirements.length > 0
            ? `<ul>${career.generalRequirements.map(id => `<li>${findCourseName(id)}</li>`).join('')}</ul>`
            : '<p>Varies by institution. A strong academic record is recommended.</p>';
        
        const outlookHtml = `
            <div class="career-outlook">
                <span><strong>Job Outlook:</strong> ${career.outlook}</span>
                <div class="outlook-legend">
                    <span><strong>Legend:</strong></span>
                    <span class="legend-item Strong">Strong: High demand</span>
                    <span class="legend-item Good">Good: Steady demand</span>
                    <span class="legend-item Average">Average: Moderate demand</span>
                    <span class="legend-item Limited">Limited: Low demand</span>
                </div>
            </div>
        `;
        
        const addToPlanButtonHtml = career.generalRequirements.length > 0
            ? `<button id="add-reqs-to-plan" data-career-id="${career.id}">Add Requirements to My Plan</button>`
            : '';

        careerDetailsContainer.innerHTML = `
            <h3>${career.title}</h3>
            <div class="career-stats">
                <span><strong>Avg. Salary (AB):</strong> ${career.avgSalaryAB}</span>
            </div>
            ${outlookHtml}
            <p class="career-description">${career.description}</p>
            <div class="requirements-section">
                <h4>General High School Course Requirements</h4>
                ${requirementsHtml}
                ${addToPlanButtonHtml}
            </div>
        `;
    }

    /**
     * Adds the required courses for a given career to the user's plan in localStorage.
     * @param {string} careerId - The ID of the career.
     */
    function addCoursesToPlan(careerId) {
        const career = careerData.careers.find(c => c.id === careerId);
        if (!career || career.generalRequirements.length === 0) return;

        const reqCourseIds = career.generalRequirements;
        const savedPlanRaw = localStorage.getItem("emhsCoursePlan");
        let plannedCourses = savedPlanRaw ? JSON.parse(savedPlanRaw) : [];
        const plannedCourseIds = new Set(plannedCourses.map(pc => pc.id));

        const coursesToAdd = [];
        reqCourseIds.forEach(reqId => {
            if (!plannedCourseIds.has(reqId)) {
                const course = courseData.find(c => c.id === reqId);
                if (course) {
                    plannedCourses.push({
                        id: course.id,
                        delivery: 'regular', // Default delivery method
                        placedInGrade: course.grade
                    });
                    coursesToAdd.push(course.name);
                }
            }
        });

        if (coursesToAdd.length > 0) {
            localStorage.setItem("emhsCoursePlan", JSON.stringify(plannedCourses));
            alert(`The following courses have been added to your plan:\n\n- ${coursesToAdd.join('\n- ')}\n\nYou can view them in the Interactive Course Planner.`);
        } else {
            alert("All required courses for this career are already in your plan.");
        }
    }

    /**
     * Attaches all necessary event listeners
     */
    function attachEventListeners() {
        interestSelect.addEventListener('change', (e) => {
            const selectedInterestId = e.target.value;
            if (selectedInterestId) {
                renderCareerGrid(selectedInterestId);
            } else {
                careerGridContainer.innerHTML = '<p class="placeholder-message">Please select an interest to see related careers.</p>';
            }
            careerDetailsContainer.innerHTML = '<p class="placeholder-message">Select a career on the left to view details.</p>';
        });

        careerGridContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.career-card');
            if (card) {
                // Handle active state for visual feedback
                document.querySelectorAll('.career-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                const careerId = card.dataset.careerId;
                renderCareerDetails(careerId);
            }
        });

        // Use event delegation for the dynamically added "Add to Plan" button
        careerDetailsContainer.addEventListener('click', (e) => {
            if (e.target.id === 'add-reqs-to-plan') {
                const careerId = e.target.dataset.careerId;
                addCoursesToPlan(careerId);
            }
        });
    }

    // --- START THE APP ---
    init();
});