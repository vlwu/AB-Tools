import { outcomeData } from '../../shared/data/outcome-data.js';
import { createCalculator } from '../../shared/js/outcome-calculator.js';

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('course'); // e.g., "chem30"

  const titleEl = document.getElementById('calculator-title');
  const containerId = 'calculator';

  if (courseId && outcomeData[courseId]) {
    const course = outcomeData[courseId];
    titleEl.textContent = `${course.name} Grade Calculator`;
    document.title = `${course.name} Calculator`; // Update the page tab title
    createCalculator(containerId, course.outcomes, course.examWeight);
  } else {
    titleEl.textContent = 'Error';
    document.getElementById(containerId).innerHTML = `
      <p class="error" style="display:block; text-align:center;">
        <strong>Error:</strong> Could not find data for the specified course. 
        Please check the link and try again.
      </p>`;
  }
});