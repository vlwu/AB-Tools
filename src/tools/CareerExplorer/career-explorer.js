import { courseData } from '../../shared/data/course-data.js';

document.addEventListener("DOMContentLoaded", () => {
    // --- DATA CACHE ---
    let careerData = {};
    let universityData = {};

    // --- DOM ELEMENTS ---
    const interestSelect = document.getElementById('interest-select');
    const careerGridContainer = document.getElementById('career-grid-container');
    const careerDetailsContainer = document.getElementById('career-details-container');

    /**
     * Main initialization function
     */
    async function init() {
        try {
            // Fetch all required data in parallel
            [careerData, universityData] = await Promise.all([
                fetch('../../shared/data/career-data.json').then(res => res.json()),
                fetch('../../shared/data/university_requirements.json').then(res => res.json())
            ]);
            
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

        let requirementsHtml = career.relatedPrograms.map(program => {
            let universityHtml = program.universities.map(uniName => {
                const programReqs = universityData[uniName]?.programs[program.programName];
                if (!programReqs) return '';

                let coursesList = (programReqs.required_courses || [])
                    .map(courseId => `<li>${findCourseName(courseId)}</li>`).join('');

                if (programReqs.group_requirements) {
                    programReqs.group_requirements.forEach(group => {
                        coursesList += `<li><em>${group.description}</em></li>`;
                    });
                }
                
                return `
                    <div class="university-reqs">
                        <strong>${uniName}</strong>
                        <ul>${coursesList}</ul>
                    </div>
                `;
            }).join('');

            return `
                <h4>Pathway: ${program.programName}</h4>
                <div class="university-reqs-grid">${universityHtml}</div>
            `;
        }).join('');

        careerDetailsContainer.innerHTML = `
            <h3>${career.title}</h3>
            <div class="career-stats">
                <span><strong>Avg. Salary (AB):</strong> ${career.avgSalaryAB}</span>
                <span><strong>Job Outlook (AB):</strong> ${career.outlookAB}</span>
            </div>
            <p class="career-description">${career.description}</p>
            <div class="requirements-section">
                <h4>Example University Pathways & Required Courses</h4>
                ${requirementsHtml}
            </div>
        `;
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
    }

    // --- START THE APP ---
    init();
});