import { state, findCourseById } from './planner-state.js';
import { checkGradRequirements, calculateCredits } from './planner-validation.js';
import { courseData } from '../../shared/data/course-data.js';

// DOM Elements
const gradeContainers = {
  '10-1': document.getElementById("grade-10-sem-1"),
  '10-2': document.getElementById("grade-10-sem-2"),
  '11-1': document.getElementById("grade-11-sem-1"),
  '11-2': document.getElementById("grade-11-sem-2"),
  '12-1': document.getElementById("grade-12-sem-1"),
  '12-2': document.getElementById("grade-12-sem-2"),
};

const summerContainers = {
  10: document.getElementById("summer-after-grade-10"),
  11: document.getElementById("summer-after-grade-11"),
};

const creditCountEl = document.getElementById("credit-count");
const progressBarEl = document.getElementById("progress-bar");
const requirementsEl = document.getElementById("requirements-checklist");
const gradeCreditEls = {
  10: document.getElementById("grade-10-credits"),
  11: document.getElementById("grade-11-credits"),
  12: document.getElementById("grade-12-credits"),
};

export function renderPlanner(callbacks) {
  // Clear all containers
  Object.values(gradeContainers).forEach(el => el.innerHTML = '');
  Object.values(summerContainers).forEach(el => el.innerHTML = '');

  const regularCourses = state.plannedCourses.filter(pc => pc.delivery !== 'summer');
  const summerCourses = state.plannedCourses.filter(pc => pc.delivery === 'summer');

  // Track slots used to determine placeholders (4 blocks per semester)
  const slotsPerSemester = {
      '10-1': 0, '10-2': 0, '11-1': 0, '11-2': 0, '12-1': 0, '12-2': 0
  };

  // Render Regular Courses
  regularCourses.forEach(pc => {
      const c = findCourseById(pc.id);
      const grade = pc.placedInGrade || c.grade;
      const semester = pc.semester || 1; 
      
      // 1. Render in the primary semester
      const containerKey = `${grade}-${semester}`;
      if (gradeContainers[containerKey]) {
          gradeContainers[containerKey].appendChild(createCourseCard(c, callbacks.onCourseClick));
          slotsPerSemester[containerKey]++;
      }

      // 2. If Full Year, render in the second semester as well (visual only)
      // We assume Full Year starts in Sem 1.
      if (c.isFullYear && semester === 1) {
          const mirrorKey = `${grade}-2`;
          if (gradeContainers[mirrorKey]) {
              const mirrorCard = createCourseCard(c, callbacks.onCourseClick);
              mirrorCard.classList.add('mirror-course'); // Visual style for duplicate
              mirrorCard.style.opacity = '0.8'; 
              gradeContainers[mirrorKey].appendChild(mirrorCard);
              slotsPerSemester[mirrorKey]++;
          }
      }
  });

  // Render Summer Courses
  const summer10 = summerCourses.filter(pc => (pc.placedInGrade || findCourseById(pc.id).grade) === 10);
  const summer11_12 = summerCourses.filter(pc => [11, 12].includes(pc.placedInGrade || findCourseById(pc.id).grade));

  summer10.forEach(pc => summerContainers[10].appendChild(createCourseCard(findCourseById(pc.id), callbacks.onCourseClick)));
  summer11_12.forEach(pc => summerContainers[11].appendChild(createCourseCard(findCourseById(pc.id), callbacks.onCourseClick)));

  // Add Placeholders
  [10, 11, 12].forEach(grade => {
      [1, 2].forEach(sem => {
          const container = gradeContainers[`${grade}-${sem}`];
          const slotsUsed = slotsPerSemester[`${grade}-${sem}`];
          // Standard load is 4 blocks.
          const emptySlots = Math.max(0, 4 - slotsUsed);
          
          for(let i=0; i<emptySlots; i++) {
              container.appendChild(createPlaceholderCard([grade], 'regular', sem, callbacks.onAddClick));
          }
      });
  });

  // Summer placeholders
  if (summer10.length === 0) summerContainers[10].appendChild(createPlaceholderCard([10], 'summer', null, callbacks.onAddClick));
  if (summer11_12.length === 0) summerContainers[11].appendChild(createPlaceholderCard([11, 12], 'summer', null, callbacks.onAddClick));
}

function createCourseCard(course, onClick) {
  const card = document.createElement("div");
  card.className = "course-card planned";
  card.dataset.id = course.id;

  if (course.credits >= 10 || course.isFullYear) {
    card.classList.add("full-year-course");
  }

  const plannedCourse = state.plannedCourses.find(pc => pc.id === course.id);
  let deliveryIcon = '';
  if (plannedCourse && plannedCourse.delivery === 'summer') deliveryIcon = '☀️';
  if (plannedCourse && plannedCourse.delivery === 'elearning') deliveryIcon = '💻';
  if (course.isFullYear) deliveryIcon += ' (FY)';

  card.innerHTML = `
    <span class="name">${course.name}</span>
    <span class="credits">${course.credits} Credits</span>
    <span class="delivery-icon">${deliveryIcon}</span>
  `;
  card.addEventListener("click", () => onClick(course));
  return card;
}

function createPlaceholderCard(gradesToShow, delivery, semester, onClick) {
    const placeholder = document.createElement("div");
    placeholder.className = "add-course-placeholder";
    placeholder.textContent = "+ Add";
    placeholder.addEventListener("click", () => onClick(gradesToShow, delivery, semester));
    return placeholder;
}

export function updateGradTrackerUI() {
  const totalCredits = calculateCredits();
  creditCountEl.textContent = `${totalCredits}`;
  progressBarEl.style.width = `${Math.min((totalCredits / 100) * 100, 100)}%`;
  
  // Visual Feedback: Red if incomplete, Green if complete (via CSS class)
  if (totalCredits < 100) {
      progressBarEl.classList.add('incomplete');
  } else {
      progressBarEl.classList.remove('incomplete');
  }

  const reqs = checkGradRequirements();
  requirementsEl.innerHTML = Object.entries(reqs)
    .map(([_, req]) => `<div class="req-item ${req.met ? 'completed' : ''}">${req.met ? '✅' : '❌'} ${req.label}</div>`)
    .join('');
}

export function updateGradeCreditsUI() {
  [10, 11, 12].forEach(grade => {
    // 1. Calculate Credits
    const credits = state.plannedCourses
      .filter(pc => pc.delivery !== 'summer')
      .filter(pc => (pc.placedInGrade || findCourseById(pc.id).grade) === grade)
      .map(pc => findCourseById(pc.id))
      .reduce((sum, c) => sum + c.credits, 0);
    gradeCreditEls[grade].textContent = credits;

    // 2. High Credit Warning
    const footer = gradeCreditEls[grade].parentElement;
    if (credits > 45) { 
      footer.classList.add('warning');
    } else {
      footer.classList.remove('warning');
    }

    // 3. Grade 10 Full Schedule Validation
    if (grade === 10) {
        const grade10Col = gradeContainers['10-1'].closest('.grade-column');
        
        // Calculate used blocks (Full Year = 2, Standard = 1)
        const usedBlocks = state.plannedCourses
            .filter(pc => pc.delivery !== 'summer' && (pc.placedInGrade || findCourseById(pc.id).grade) === 10)
            .reduce((sum, pc) => {
                const c = findCourseById(pc.id);
                return sum + (c.isFullYear ? 2 : 1);
            }, 0);

        // Expectation: 8 blocks filled
        if (usedBlocks < 8) {
            grade10Col.classList.add('grade-error');
        } else {
            grade10Col.classList.remove('grade-error');
        }
    }
  });
}

export function updateCourseCardStyles(uni, prog) {
  const presetActionsDiv = document.getElementById('preset-actions');
  
  if (uni && prog) {
      presetActionsDiv.classList.remove('preset-actions-disabled');
  } else {
      presetActionsDiv.classList.add('preset-actions-disabled');
  }

  document.querySelectorAll('.course-card').forEach(card => {
      card.classList.remove('required', 'recommended', 'unnecessary');
  });

  if (!uni || !prog || !state.universityData[uni]) return;

  const reqs = state.universityData[uni].programs[prog];
  if (!reqs) return;

  const requiredCourses = new Set(reqs.required_courses || []);
  const recommendedCourses = new Set();
  reqs.group_requirements?.forEach(group => {
      group.courses.forEach(courseId => recommendedCourses.add(courseId));
  });
  if (reqs.notes) {
      courseData.forEach(course => {
          if (reqs.notes.includes(course.id)) {
              recommendedCourses.add(course.id);
          }
      });
  }

  document.querySelectorAll('.course-card.planned').forEach(card => {
      const courseId = card.dataset.id;
      if (requiredCourses.has(courseId)) {
          card.classList.add('required');
      } else if (recommendedCourses.has(courseId)) {
          card.classList.add('recommended');
      } else {
          card.classList.add('unnecessary');
      }
  });
}

export function exportPlanPDF() {
  if (typeof window.jspdf === 'undefined') {
      alert("PDF library not loaded.");
      return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("EMHS Course Plan", 10, 20);
  let y = 30;
  
  [10, 11, 12].forEach(grade => {
    doc.setFontSize(16);
    doc.text(`Grade ${grade}`, 10, y);
    y += 8;
    
    [1, 2].forEach(sem => {
        doc.setFontSize(12);
        doc.text(`Semester ${sem}`, 10, y);
        y += 6;
        doc.setFontSize(10);
        
        const courses = state.plannedCourses.filter(pc => 
            pc.delivery !== 'summer' && 
            (pc.placedInGrade || findCourseById(pc.id).grade) === grade &&
            (pc.semester || 1) === sem
        );
        
        // Handle full year courses appearing in Sem 2 visually for PDF
        // Logic: if current sem is 2, check for full year courses in sem 1
        const fullYearCoursesFromSem1 = sem === 2 ? state.plannedCourses.filter(pc => 
             pc.delivery !== 'summer' && 
             (pc.placedInGrade || findCourseById(pc.id).grade) === grade &&
             (pc.semester || 1) === 1 &&
             findCourseById(pc.id).isFullYear
        ) : [];

        const allCoursesForSem = [...courses, ...fullYearCoursesFromSem1];
        
        if(allCoursesForSem.length === 0) {
            doc.text("- No courses", 15, y);
            y += 6;
        } else {
            allCoursesForSem.forEach(pc => {
                const c = findCourseById(pc.id);
                let name = c.name;
                if (c.isFullYear && sem === 2) name += " (Cont.)";
                doc.text(`- ${name}`, 15, y);
                y += 6;
            });
        }
        y += 2;
    });
    
    const summer = state.plannedCourses.filter(pc => pc.delivery === 'summer' && (pc.placedInGrade || findCourseById(pc.id).grade) === grade);
    if(summer.length > 0) {
        doc.setFontSize(12);
        doc.text("Summer", 10, y);
        y += 6;
        doc.setFontSize(10);
        summer.forEach(pc => {
            const c = findCourseById(pc.id);
            doc.text(`- ${c.name}`, 15, y);
            y += 6;
        });
    }
    y += 5;
  });
  doc.save("emhs-course-plan.pdf");
}