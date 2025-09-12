function createCalculator(containerId, outcomes, examWeight = 0) {
  const container = document.getElementById(containerId);
  container.innerHTML = ''; // Clear any existing content

  outcomes.forEach(({ id, label, weight }) => {
    container.innerHTML += `
      <label for="${id}" class="calculator-label">${label} [${weight}%]</label>
      <input type="number" min="0" max="100" id="${id}" data-weight="${weight}">
    `;
  });

  if (examWeight > 0) {
    container.innerHTML += `
      <label for="finalExam" class="calculator-label">Final Exam (${examWeight}%)</label>
      <input type="number" min="0" max="100" id="finalExam">
    `;
  }

  container.innerHTML += `
    <button id="calculateButton">Calculate</button>
    <p id="output"></p>
  `;

  // NEW: Add real-time validation listener to each input
  const inputs = container.querySelectorAll("input[type='number']");
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const value = parseFloat(input.value);
      // If value is not empty and outside the 0-100 range, add the invalid class
      if (input.value !== '' && (value < 0 || value > 100)) {
        input.classList.add('invalid-input');
      } else {
        input.classList.remove('invalid-input');
      }
    });
  });

  document.getElementById("calculateButton").addEventListener("click", () => {
    calculateGrade(examWeight);
  });
}

function calculateGrade(examWeight) {
  const inputs = document.querySelectorAll("input[type='number']");
  let totalWeighted = 0;
  let totalWeight = 0;
  let hasError = false;

  const output = document.getElementById("output");
  output.innerText = "";
  output.className = ''; // Reset classes to ensure visibility is re-evaluated

  inputs.forEach(input => {
    if (input.id === "finalExam" || hasError) return; // Stop processing if an error has been found
    const value = parseFloat(input.value);
    const weight = parseFloat(input.dataset.weight);

    if (!isNaN(value)) {
      if (value < 0 || value > 100) {
        output.innerText = `❌ "${input.previousElementSibling.innerText}" must be between 0 and 100.`;
        output.classList.add('error');
        hasError = true;
        return;
      }

      totalWeighted += value * weight;
      totalWeight += weight;
    }
  });

  if (hasError) return;

  if (totalWeight === 0) {
    output.innerText = `Please enter at least one outcome grade.`;
    output.classList.add('error');
    return;
  }

  const courseAverage = totalWeighted / totalWeight;

  const finalExamInput = document.getElementById("finalExam");
  if (examWeight > 0 && finalExamInput && finalExamInput.value !== "") {
    const finalExamScore = parseFloat(finalExamInput.value);

    if (isNaN(finalExamScore) || finalExamScore < 0 || finalExamScore > 100) {
      output.innerText = "❌ Final Exam must be between 0 and 100.";
      output.classList.add('error');
      return;
    }

    const finalGrade = (
      courseAverage * ((100 - examWeight) / 100) +
      finalExamScore * (examWeight / 100)
    ).toFixed(1);

    output.innerText = `✅ Course Grade (with Final Exam): ${finalGrade}%`;
    output.classList.add('success');
    return;
  }

  output.innerText = `✅ Course Grade (without Final Exam): ${courseAverage.toFixed(1)}%`;
  output.classList.add('success');
}