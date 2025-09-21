import { courseData } from '../../shared/data/course-data.js';

document.addEventListener("DOMContentLoaded", () => {
    // --- DATA CACHE ---
    let careerData = {};

    // --- DOM ELEMENTS ---
    const interestSelect = document.getElementById('interest-select');
    const careerGridContainer = document.getElementById('career-grid-container');
    const careerDetailsContainer = document.getElementById('career-details-container');
    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalMessage = document.getElementById('info-modal-message');
    const infoModalClose = document.getElementById('info-modal-close');

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
     * Recursively finds all prerequisites for a given course that are not already planned.
     * @param {string} courseId - The ID of the course to check.
     * @param {Set<string>} plannedIdsSet - A set of course IDs already in the user's plan.
     * @param {Set<string>} chain - A set to accumulate the IDs of courses to add.
     */
    function getPrerequisiteChain(courseId, plannedIdsSet, chain) {
        // Stop if the course is already planned or already in our list to be added
        if (plannedIdsSet.has(courseId) || chain.has(courseId)) {
            return;
        }

        const course = courseData.find(c => c.id === courseId);
        if (!course) return;

        // First, handle the prerequisites of the current course
        if (course.prerequisites && course.prerequisites.length > 0) {
            course.prerequisites.forEach(prereqCondition => {
                // For 'OR' conditions like 'MATH10C|MATH10-FY', we default to the first option
                const prereqId = prereqCondition.split('|')[0];
                getPrerequisiteChain(prereqId, plannedIdsSet, chain);
            });
        }
        
        // After ensuring all prerequisites are in the chain, add the current course
        chain.add(courseId);
    }

    /**
     * Adds the required courses and their prerequisites for a given career to the user's plan.
     * @param {string} careerId - The ID of the career.
     */
    function addCoursesToPlan(careerId) {
        const career = careerData.careers.find(c => c.id === careerId);
        if (!career || career.generalRequirements.length === 0) return;

        const requiredCourseIds = career.generalRequirements;
        const savedPlanRaw = localStorage.getItem("emhsCoursePlan");
        let plannedCourses = savedPlanRaw ? JSON.parse(savedPlanRaw) : [];
        const plannedCourseIds = new Set(plannedCourses.map(pc => pc.id));
        
        const coursesToAddSet = new Set();

        // For each required course, get its full prerequisite chain
        requiredCourseIds.forEach(reqId => {
            getPrerequisiteChain(reqId, plannedCourseIds, coursesToAddSet);
        });

        if (coursesToAddSet.size === 0) {
            showInfoModal('Plan Already Complete', 'All required courses and their prerequisites for this career are already in your plan.');
            return;
        }

        const coursesAddedNames = [];
        
        // Add the new courses to the plan
        coursesToAddSet.forEach(newCourseId => {
            const course = courseData.find(c => c.id === newCourseId);
            if (course) {
                plannedCourses.push({
                    id: course.id,
                    delivery: 'regular', // Default delivery method
                    placedInGrade: course.grade
                });
                coursesAddedNames.push(course.name);
            }
        });
        
        // Sort courses by grade level for a more logical message
        coursesAddedNames.sort((a, b) => {
            const gradeA = parseInt(a.match(/\d+/)?.[0] || '0');
            const gradeB = parseInt(b.match(/\d+/)?.[0] || '0');
            return gradeA - gradeB;
        });

        localStorage.setItem("emhsCoursePlan", JSON.stringify(plannedCourses));
        showInfoModal(
            'Courses Added to Plan',
            'You can view and arrange them in the Interactive Course Planner. The following courses and their prerequisites have been added:',
            coursesAddedNames
        );
    }

    /**
     * Displays a custom modal with a title and message.
     * @param {string} title - The title to display in the modal.
     * @param {string} message - The main text message.
     * @param {string[]} [courses=[]] - An optional list of courses to display as a bulleted list.
     */
    function showInfoModal(title, message, courses = []) {
        infoModalTitle.textContent = title;
        let messageHtml = `<p>${message}</p>`;
        if (courses.length > 0) {
            messageHtml += '<ul>';
            courses.forEach(courseName => {
                messageHtml += `<li>${courseName}</li>`;
            });
            messageHtml += '</ul>';
        }
        infoModalMessage.innerHTML = messageHtml;
        infoModal.style.display = 'flex';
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
        
        // Add event listeners to close the info modal
        infoModalClose.addEventListener('click', () => {
            infoModal.style.display = 'none';
        });

        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) { // Click on the dark overlay
                infoModal.style.display = 'none';
            }
        });
    }

    // --- START THE APP ---
    init();
});