import { courseData } from '../../shared/data/course-data.js';

document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURATION ---
  // Store the scholarship rules in a constant for easy updates
  const RUTHERFORD_RULES = {
    GRADE_10: {
      tier1: { minAvg: 75, maxAvg: 79.9, amount: 300 },
      tier2: { minAvg: 80, maxAvg: 100, amount: 400 },
      coreCategories: ['ELA', 'Social', 'Math', 'Science'],
      numOptions: 1
    },
    GRADE_11: {
      tier1: { minAvg: 75, maxAvg: 79.9, amount: 500 },
      tier2: { minAvg: 80, maxAvg: 100, amount: 800 },
      coreCategories: ['ELA', 'Social', 'Math', 'Science'], // Note: These are base categories
      numOptions: 1
    },
    GRADE_12: {
      tier1: { minAvg: 75, maxAvg: 79.9, amount: 700 },
      tier2: { minAvg: 80, maxAvg: 100, amount: 1300 },
      coreCategories: ['ELA-30', 'Social-30'],
      numOptions: 3
    }
  };

  // --- DOM ELEMENTS ---
  const grade10Container = document.getElementById("grade-10-inputs");
  const grade11Container = document.getElementById("grade-11-inputs");
  const grade12Container = document.getElementById("grade-12-inputs");
  const calculateBtn = document.getElementById("calculate-rutherford-btn");
  const summaryEl = document.getElementById("results-summary");
  const detailsEl = document.getElementById("results-details");

  // --- INITIALIZATION ---
  function init() {
    // Create the input fields for each grade level
    createInputRows(grade10Container, 10, 8); // 8 potential courses in a year
    createInputRows(grade11Container, 11, 8);
    createInputRows(grade12Container, 12, 8);

    // Populate the dropdowns with courses from course-data.js
    populateCourseSelects();

    calculateBtn.addEventListener("click", handleCalculation);
  }

  // --- UI SETUP FUNCTIONS ---
  function createInputRows(container, grade, numRows) {
    for (let i = 1; i <= numRows; i++) {
      const row = document.createElement("div");
      row.className = "input-row";
      row.innerHTML = `
        <select class="course-select" data-grade="${grade}"></select>
        <input type="number" class="grade-input" placeholder="Grade %" min="0" max="100" inputmode="decimal">
      `;
      container.appendChild(row);
    }
  }

  function populateCourseSelects() {
    const selects = document.querySelectorAll(".course-select");
    selects.forEach(select => {
      const grade = parseInt(select.dataset.grade, 10);
      select.innerHTML = '<option value="">-- Select a Course --</option>';

      // Filter courses that match the grade for this section
      const relevantCourses = courseData.filter(c => c.grade === grade);

      relevantCourses.sort((a,b) => a.name.localeCompare(b.name)).forEach(course => {
        const option = document.createElement("option");
        option.value = course.id;
        option.textContent = course.name;
        select.appendChild(option);
      });
    });
  }

  // --- CORE CALCULATION LOGIC ---
  function handleCalculation() {
    const studentData = getStudentData();
    const results = {
      grade10: calculateEligibility(studentData.grade10, RUTHERFORD_RULES.GRADE_10),
      grade11: calculateEligibility(studentData.grade11, RUTHERFORD_RULES.GRADE_11),
      grade12: calculateEligibility(studentData.grade12, RUTHERFORD_RULES.GRADE_12),
    };
    results.total = results.grade10.amount + results.grade11.amount + results.grade12.amount;
    displayResults(results);
  }

  function getStudentData() {
    const data = { grade10: [], grade11: [], grade12: [] };
    const rows = document.querySelectorAll(".input-row");

    rows.forEach(row => {
      const courseId = row.querySelector(".course-select").value;
      const grade = parseFloat(row.querySelector(".grade-input").value);
      const gradeLevel = parseInt(row.querySelector(".course-select").dataset.grade, 10);

      if (courseId && !isNaN(grade)) {
        const courseInfo = courseData.find(c => c.id === courseId);
        if (courseInfo) {
          const entry = { ...courseInfo, finalGrade: grade };
          if (gradeLevel === 10) data.grade10.push(entry);
          else if (gradeLevel === 11) data.grade11.push(entry);
          else if (gradeLevel === 12) data.grade12.push(entry);
        }
      }
    });
    return data;
  }

  function calculateEligibility(courses, rules) {
    const result = { amount: 0, average: 0, coursesUsed: [], message: "" };
    const coursesUsedIds = [];
    
    // 1. Find the best core courses
    rules.coreCategories.forEach(category => {
      const matchingCourses = courses.filter(c => c.category === category);
      if (matchingCourses.length > 0) {
        const bestCourse = matchingCourses.sort((a, b) => b.finalGrade - a.finalGrade)[0];
        result.coursesUsed.push(bestCourse);
        coursesUsedIds.push(bestCourse.id);
      }
    });

    // 2. Find the best option(s) from the remaining courses
    const remainingCourses = courses.filter(c => !coursesUsedIds.includes(c.id));
    const bestOptions = remainingCourses.sort((a, b) => b.finalGrade - a.finalGrade).slice(0, rules.numOptions);
    result.coursesUsed.push(...bestOptions);

    // 3. Check if we have the required number of courses (5)
    if (result.coursesUsed.length < rules.coreCategories.length + rules.numOptions) {
      result.message = "Not enough courses entered to calculate eligibility.";
      return result;
    }

    // 4. Calculate the average
    const totalGradePoints = result.coursesUsed.reduce((sum, c) => sum + c.finalGrade, 0);
    result.average = totalGradePoints / result.coursesUsed.length;

    // 5. Determine the scholarship amount based on the average
    if (result.average >= rules.tier2.minAvg) {
      result.amount = rules.tier2.amount;
    } else if (result.average >= rules.tier1.minAvg) {
      result.amount = rules.tier1.minAvg;
    }

    return result;
  }

  // --- DISPLAY RESULTS ---
  function displayResults(results) {
    // Display summary at the top
    summaryEl.innerHTML = `
      <div class="results-summary-card">
        <h3>Total Potential Scholarship</h3>
        <p class="total-amount">$${results.total.toLocaleString()}</p>
      </div>
    `;

    // Display detailed breakdown
    detailsEl.innerHTML = `
      ${createGradeResultCard("Grade 10", results.grade10)}
      ${createGradeResultCard("Grade 11", results.grade11)}
      ${createGradeResultCard("Grade 12", results.grade12)}
    `;
  }

  function createGradeResultCard(title, result) {
    let content = '';
    const cardClass = result.amount > 0 ? 'eligible' : 'ineligible';
    
    if (result.message) {
      content = `<p>${result.message}</p>`;
    } else {
      const courseList = result.coursesUsed.map(c => `<li>${c.name}: <strong>${c.finalGrade}%</strong></li>`).join('');
      content = `
        <div class="result-stats">
          <p>Calculated Average: <strong>${result.average.toFixed(2)}%</strong></p>
          <p>Amount Earned: <strong>$${result.amount}</strong></p>
        </div>
        <h4>Courses Used in Calculation:</h4>
        <ul>${courseList}</ul>
      `;
    }

    return `
      <div class="grade-result-card ${cardClass}">
        <h3>${title}</h3>
        ${content}
      </div>
    `;
  }

  // --- START THE APP ---
  init();
});