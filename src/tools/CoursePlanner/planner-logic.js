import { courseData } from '../../shared/data/course-data.js';
import { state, findCourseById, addCourseToState, removeCourseFromState, savePlanToStorage, loadPlanFromStorage, resetPlanState, fetchUniversityData } from './planner-state.js';
import { arePrerequisitesMet } from './planner-validation.js';
import { renderPlanner, updateGradTrackerUI, updateGradeCreditsUI, updateCourseCardStyles, exportPlanPDF } from './planner-view.js';
import { executePresetGeneration } from './planner-presets.js';

document.addEventListener("DOMContentLoaded", () => {
  // Temporary State for Adding
  let targetGradeForAdding = null;
  let targetSemesterForAdding = null;
  let directDeliveryMethod = null;
  
  // Preset Settings
  let presetSettings = {
    allowSummer: true,
    fillSpares: false
  };

  // DOM Cache
  const universitySelect = document.getElementById('university-select');
  const programSelect = document.getElementById('program-select');
  
  // Modals
  const detailsModal = document.getElementById("details-modal");
  const courseSelectionModal = document.getElementById("course-selection-modal");
  const modalCourseList = document.getElementById("modal-course-list");
  const courseSearchInput = document.getElementById("course-search-input");
  const prereqModal = document.getElementById('prereq-visualizer-modal');
  const confirmModal = document.getElementById('confirm-modal');
  const infoModal = document.getElementById('info-modal');
  const presetSettingsModal = document.getElementById('preset-settings-modal');

  async function init() {
    await fetchUniversityData();
    populateUniversities();
    loadPlanFromStorage(); 
    refreshUI();
    attachEventListeners();
  }

  function refreshUI() {
    renderPlanner({
      onCourseClick: (course) => showDetailsModal(course),
      onAddClick: (grades, delivery, semester) => showCourseSelectionModal(grades, delivery, semester)
    });
    updateGradTrackerUI();
    updateGradeCreditsUI();
    updateCourseCardStyles(universitySelect.value, programSelect.value);
  }

  function attachEventListeners() {
    // Actions
    document.getElementById("save-plan").addEventListener("click", () => {
        if(savePlanToStorage()) showInfoModal("Success", "Plan saved successfully!");
        else showInfoModal("Error", "Plan is empty.");
    });
    
    document.getElementById("load-plan").addEventListener("click", () => {
         const saved = localStorage.getItem("emhsCoursePlan");
         if(saved) {
             showConfirmModal("Load Plan", "Overwrite current plan?", () => {
                 loadPlanFromStorage();
                 refreshUI();
             });
         } else showInfoModal("No Plan", "No saved plan found.");
    });

    document.getElementById("reset-plan").addEventListener("click", () => {
        showConfirmModal("Reset Plan", "Are you sure?", () => {
            resetPlanState();
            refreshUI();
        });
    });

    document.getElementById("export-pdf").addEventListener("click", exportPlanPDF);

    // University Selectors
    universitySelect.addEventListener('change', () => populatePrograms(universitySelect.value));
    programSelect.addEventListener('change', () => updateCourseCardStyles(universitySelect.value, programSelect.value));

    // Preset Buttons
    document.getElementById('load-preset-btn').addEventListener('click', generatePreset);
    document.getElementById('preset-settings-btn').addEventListener('click', () => {
        document.getElementById('setting-allow-summer').checked = presetSettings.allowSummer;
        document.getElementById('setting-fill-spares').checked = presetSettings.fillSpares;
        presetSettingsModal.style.display = 'flex';
    });
    document.getElementById('preset-settings-save').addEventListener('click', () => {
        presetSettings.allowSummer = document.getElementById('setting-allow-summer').checked;
        presetSettings.fillSpares = document.getElementById('setting-fill-spares').checked;
        presetSettingsModal.style.display = 'none';
        showInfoModal("Settings Saved", "Preferences updated.");
    });
    document.getElementById('preset-settings-cancel').addEventListener('click', () => presetSettingsModal.style.display = 'none');

    setupModalListeners();
  }
  
  // --- UNIVERSITY LOGIC ---
  function populateUniversities() {
    universitySelect.innerHTML = '<option value="">-- Select a University --</option>';
    Object.keys(state.universityData).sort().forEach(uni => {
      const option = document.createElement('option');
      option.value = uni;
      option.textContent = uni;
      universitySelect.appendChild(option);
    });
  }

  function populatePrograms(universityName) {
    programSelect.innerHTML = '<option value="">-- Select a Program --</option>';
    if (universityName && state.universityData[universityName]) {
      Object.keys(state.universityData[universityName].programs).sort().forEach(prog => {
        const option = document.createElement('option');
        option.value = prog;
        option.textContent = prog;
        programSelect.appendChild(option);
      });
      programSelect.disabled = false;
    } else {
      programSelect.disabled = true;
    }
    updateCourseCardStyles(universitySelect.value, programSelect.value);
  }

  // --- PRESET GENERATION ---
  function generatePreset() {
      const uni = universitySelect.value;
      const prog = programSelect.value;
      if (!uni || !prog) return showInfoModal("Error", "Select University and Program first.");

      showConfirmModal("Load Preset?", "Replace plan with optimized route?", () => {
          const newPlan = executePresetGeneration(uni, prog, presetSettings);
          state.plannedCourses = newPlan;
          state.hasUnsavedChanges = true;
          refreshUI();
          showInfoModal("Preset Loaded", "Loaded best route.");
      });
  }

  // --- EXCLUSION LOGIC ---
  function getExclusionGroup(courseId) {
    // Returns a group key. Courses in the same group are mutually exclusive.
    const course = findCourseById(courseId);
    if (!course) return null;

    // Mutually exclusive: Same Subject + Same Grade Level
    // E.g. MATH20-1 and MATH20-2.
    // ELA10-1 and ELA10-2.
    // Exceptions: Science (Bio/Chem/Phy are distinct).
    
    // Check main categories
    if (['ELA', 'Social', 'Math'].includes(course.category)) {
        return `${course.category}-${course.grade}`;
    }
    if (['ELA-30', 'Social-30'].includes(course.category)) {
        // Strip the -30 suffix for cleaner grouping key
        return `${course.category.split('-')[0]}-30`; 
    }
    
    // For Science 10/20/30/14/24 (General Science)
    if (course.category.startsWith('Science')) {
        // If it's specifically "Science 20", "Science 30", "Science 10" (not Bio/Chem/Phy)
        // The ID usually starts with SCI.
        if (course.id.startsWith('SCI')) {
            return `GeneralScience-${course.grade}`;
        }
    }
    
    return null; // No exclusion group (can take multiple Arts, CTS, etc.)
  }

  function checkExclusions(candidateCourse, plannedList) {
      const candidateGroup = getExclusionGroup(candidateCourse.id);
      if (!candidateGroup) return null;

      const conflict = plannedList.find(pc => {
          const plannedGroup = getExclusionGroup(pc.id);
          return plannedGroup === candidateGroup && pc.id !== candidateCourse.id;
      });

      return conflict ? findCourseById(conflict.id) : null;
  }

  // --- MODAL: COURSE SELECTION ---
  function showCourseSelectionModal(grades, delivery = null, semester = null) {
    targetGradeForAdding = grades;
    targetSemesterForAdding = semester;
    directDeliveryMethod = delivery;
    courseSearchInput.value = '';
    populateCourseSelectionModal();
    courseSelectionModal.style.display = "flex";
  }

  function populateCourseSelectionModal() {
    modalCourseList.innerHTML = '';
    const plannedIds = state.plannedCourses.map(pc => pc.id);
    const searchTerm = courseSearchInput.value.toLowerCase();
    const tGrade = targetGradeForAdding[0]; 
    const tSem = targetSemesterForAdding || 1;
    const tDelivery = directDeliveryMethod || 'regular';

    const availableCourses = courseData.filter(course => {
      const gradeMatch = targetGradeForAdding.includes(course.grade);
      const searchMatch = (course.name.toLowerCase().includes(searchTerm) || course.id.toLowerCase().includes(searchTerm));
      const isAlreadyPlanned = plannedIds.includes(course.id);

      if (isAlreadyPlanned || !gradeMatch || !searchMatch) return false;
      if (tDelivery === 'summer') {
          const isAP = course.id.includes('AP');
          const core = ['ELA', 'Social', 'Math', 'Science', 'ELA-30', 'Social-30', 'Science-30', 'CALM'];
          return !isAP && core.includes(course.category);
      }
      return true;
    });

    if (availableCourses.length === 0) {
        modalCourseList.innerHTML = '<p style="text-align:center;">No matching courses found.</p>';
        return;
    }

    const grouped = groupBy(availableCourses, 'category');
    renderModalGroups(grouped, tGrade, tSem, tDelivery);
  }

  function renderModalGroups(groupedCourses, tGrade, tSem, tDelivery) {
     for (const category in groupedCourses) {
        const container = document.createElement('div');
        container.className = 'modal-category';
        
        const header = document.createElement('button');
        header.className = 'modal-category-toggle';
        header.textContent = `${category} (${groupedCourses[category].length})`;
        
        const content = document.createElement('div');
        content.className = 'modal-category-content';

        header.addEventListener('click', () => {
            const active = header.classList.contains('active');
            document.querySelectorAll('.modal-category-toggle').forEach(h => { h.classList.remove('active'); h.nextElementSibling.style.display = 'none'; });
            if(!active) { header.classList.add('active'); content.style.display = 'block'; }
        });

        groupedCourses[category].forEach(course => {
            const item = document.createElement('div');
            item.className = 'modal-course-item';
            
            // Check Prerequisites
            const isPrereqMet = arePrerequisitesMet(course, tGrade, tSem, tDelivery);
            
            // Check Exclusions (Mutually Exclusive)
            const exclusionConflict = checkExclusions(course, state.plannedCourses);
            
            const info = document.createElement('div');
            let infoText = `<span class="name">${course.name}</span>`;
            
            if (exclusionConflict) {
                item.classList.add('locked');
                infoText += `<span class="prereqs" style="color: #f0ad4e;">Excludes: ${exclusionConflict.name} (Planned)</span>`;
            } else if (!isPrereqMet) {
                item.classList.add('locked');
                infoText += `<span class="prereqs">Prerequisites missing</span>`;
            } else {
                infoText += `<span class="prereqs">${course.prerequisites.length ? 'Prereqs met' : 'No prereqs'}</span>`;
            }
            
            info.innerHTML = infoText;
            item.appendChild(info);

            if (isPrereqMet && !exclusionConflict) {
                item.addEventListener('click', (e) => {
                    if (e.target.matches('.visualize-prereq-btn')) return;
                    courseSelectionModal.style.display = 'none';
                    addCourseToState(course, tDelivery, tGrade, tSem);
                    refreshUI();
                });
            }

            if (course.prerequisites.length > 0) {
                const btn = document.createElement('button');
                btn.className = 'visualize-prereq-btn';
                btn.textContent = 'Visualize';
                btn.dataset.courseId = course.id;
                item.appendChild(btn);
            }
            content.appendChild(item);
        });

        container.appendChild(header);
        container.appendChild(content);
        modalCourseList.appendChild(container);
     }
  }

  // --- MODAL: DETAILS ---
  function showDetailsModal(course) {
    const plannedCourse = state.plannedCourses.find(pc => pc.id === course.id);
    detailsModal.dataset.courseId = course.id;
    detailsModal.querySelector('#details-modal-course-name').textContent = course.name;
    detailsModal.querySelector('#details-modal-credits').textContent = course.credits;
    let deliveryText = plannedCourse.delivery;
    if (plannedCourse.delivery !== 'summer') deliveryText += ` (Sem ${plannedCourse.semester || 1})`;
    detailsModal.querySelector('#details-modal-status').textContent = `Planned: ${deliveryText}`;
    detailsModal.style.display = 'flex';
  }

  // --- MODAL: PREREQ VISUALIZER ---
  function showPrerequisiteVisualizer(courseId) {
    const course = findCourseById(courseId);
    if (!course) return;
    document.getElementById('prereq-modal-title').textContent = `Path for ${course.name}`;
    document.getElementById('prereq-tree-container').innerHTML = buildPrereqTree(course, state.plannedCourses.map(pc => pc.id), true);
    prereqModal.style.display = 'flex';
  }

  function buildPrereqTree(course, plannedIds, isTarget = false) {
    if (!course) return '';
    const statusClass = isTarget ? 'target' : plannedIds.includes(course.id) ? 'met' : 'missing';
    let childrenHtml = '';
    if (course.prerequisites && course.prerequisites.length > 0) {
      childrenHtml = `<div class="prereq-children">${course.prerequisites.map(p => {
        if (p.includes('|')) {
           const opts = p.split('|').map(id => buildPrereqTree(findCourseById(id), plannedIds)).join('');
           return `<div class="prereq-node or-group"><div class="or-group-label">OR</div><div class="prereq-children">${opts}</div></div>`;
        }
        return buildPrereqTree(findCourseById(p), plannedIds);
      }).join('')}</div>`;
    }
    return `<div class="prereq-node"><div class="prereq-course ${statusClass}">${course.name}</div>${childrenHtml}</div>`;
  }

  // --- UTIL ---
  function setupModalListeners() {
      courseSearchInput.addEventListener('input', populateCourseSelectionModal);
      document.getElementById('modal-cancel-selection').addEventListener('click', () => courseSelectionModal.style.display = 'none');
      modalCourseList.addEventListener('click', (e) => {
          if (e.target.matches('.visualize-prereq-btn')) showPrerequisiteVisualizer(e.target.dataset.courseId);
      });
      document.getElementById('details-modal-remove').addEventListener('click', () => {
          removeCourseFromState(detailsModal.dataset.courseId);
          detailsModal.style.display = 'none';
          refreshUI();
      });
      document.getElementById('details-modal-visualize').addEventListener('click', () => showPrerequisiteVisualizer(detailsModal.dataset.courseId));
      document.getElementById('details-modal-close').addEventListener('click', () => detailsModal.style.display = 'none');
      document.getElementById('prereq-modal-close').addEventListener('click', () => prereqModal.style.display = 'none');
      document.getElementById('confirm-modal-cancel').addEventListener('click', () => confirmModal.style.display = 'none');
      document.getElementById('info-modal-close').addEventListener('click', () => infoModal.style.display = 'none');
  }

  function showInfoModal(title, message) {
    document.getElementById('info-modal-title').textContent = title;
    document.getElementById('info-modal-message').textContent = message;
    infoModal.style.display = 'flex';
  }

  function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    confirmModal.style.display = 'flex';
    const btn = document.getElementById('confirm-modal-button');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => { onConfirm(); confirmModal.style.display = 'none'; });
  }

  function groupBy(arr, key) {
      return arr.reduce((acc, obj) => { (acc[obj[key]] = acc[obj[key]] || []).push(obj); return acc; }, {});
  }

  init();
});