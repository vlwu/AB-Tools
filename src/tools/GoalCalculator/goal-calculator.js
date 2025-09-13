document.addEventListener("DOMContentLoaded", () => {
  // --- 1. GET DOM ELEMENTS ---
  const currentGradeEl = document.getElementById("currentGrade");
  const desiredGradeEl = document.getElementById("desiredGrade");
  const examWeightEl = document.getElementById("examWeight");
  const calculateButton = document.getElementById("calculateButton");
  const outputEl = document.getElementById("output");

  // --- 2. ATTACH EVENT LISTENERS ---
  calculateButton.addEventListener("click", handleCalculation);

  // Add real-time validation feedback to each input field
  const allInputs = [currentGradeEl, desiredGradeEl, examWeightEl];
  allInputs.forEach(input => {
    input.addEventListener('input', () => {
      // Use the browser's built-in validity checker
      if (input.checkValidity()) {
        input.classList.remove('invalid-input');
      } else {
        input.classList.add('invalid-input');
      }
    });
  });

  // --- 3. CORE LOGIC ---
  function handleCalculation() {
    // Clear previous results
    outputEl.innerHTML = '';
    outputEl.className = '';

    // Validate all inputs before proceeding
    if (!validateInputs()) return;

    // Convert values from strings to numbers
    const currentGrade = parseFloat(currentGradeEl.value);
    const desiredGrade = parseFloat(desiredGradeEl.value);
    const examWeight = parseFloat(examWeightEl.value);

    // Calculate the weight of the coursework (e.g., 100% - 30% = 70%)
    const courseworkWeight = 1 - (examWeight / 100);

    // Formula to find the required score on the exam
    // Required = (Goal - (Current * Coursework Weight)) / Exam Weight
    const requiredScore = (desiredGrade - (currentGrade * courseworkWeight)) / (examWeight / 100);

    displayResult(requiredScore);
  }

  // --- 4. HELPER FUNCTIONS ---
  function validateInputs() {
    const inputs = [
      { el: currentGradeEl, name: "Current Grade" },
      { el: desiredGradeEl, name: "Desired Grade" },
      { el: examWeightEl, name: "Exam Weight" }
    ];

    for (const input of inputs) {
      if (input.el.value === '') {
        displayError(`Please enter a value for ${input.name}.`);
        return false;
      }
      if (!input.el.checkValidity()) {
        displayError(`${input.name} must be a number between ${input.el.min} and ${input.el.max}.`);
        return false;
      }
    }
    return true;
  }

  function displayResult(score) {
    let message = '';
    let messageClass = '';

    if (score > 100) {
      message = `To reach your goal, a score of <strong>${score.toFixed(1)}%</strong> is needed. This is not achievable.`;
      messageClass = 'error';
    } else if (score <= 0) {
      message = `Congratulations! You only need a <strong>0%</strong> on the exam to achieve your desired grade.`;
      messageClass = 'success';
    } else {
      message = `To achieve your goal, you need to score at least <strong>${score.toFixed(1)}%</strong> on the final exam.`;
      messageClass = 'success';
    }

    outputEl.innerHTML = message;
    outputEl.classList.add(messageClass);
  }

  function displayError(errorMessage) {
    outputEl.innerHTML = `❌ ${errorMessage}`;
    outputEl.classList.add('error');
  }
});