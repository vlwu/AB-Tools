export function createCalculator(containerId, outcomes, examWeight = 0) {
  const container = document.getElementById(containerId);
  let content = '';

  outcomes.forEach(({ id, label, weight }) => {
    content += `
      <div class="calculator-row">
        <label for="${id}" class="calculator-label">${label} [${weight}%]</label>
        <input type="number" min="0" max="100" id="${id}" data-weight="${weight}" inputmode="decimal">
      </div>
    `;
  });

  if (examWeight > 0) {
    content += `
      <div class="calculator-row">
        <label for="finalExam" class="calculator-label">Final Exam (${examWeight}%)</label>
        <input type="number" min="0" max="100" id="finalExam" inputmode="decimal">
      </div>
    `;
  }

  content += `
    <button id="calculateButton">Calculate</button>
    <div id="output"></div>
  `;

  container.innerHTML = content;

  // Add real-time validation listener to each input
  const inputs = container.querySelectorAll("input[type='number']");
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const value = parseFloat(input.value);
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
  output.innerHTML = ""; // Use innerHTML to clear content
  output.className = ''; // Reset classes to ensure visibility is re-evaluated

  inputs.forEach(input => {
    if (input.id === "finalExam" || hasError) return; // Stop processing if an error has been found
    const value = parseFloat(input.value);
    const weight = parseFloat(input.dataset.weight);

    if (!isNaN(value)) {
      if (value < 0 || value > 100) {
        output.innerHTML = `❌ "${input.closest('.calculator-row').querySelector('label').innerText}" must be between 0 and 100.`;
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
    output.innerHTML = `Please enter at least one outcome grade.`;
    output.classList.add('error');
    return;
  }

  const courseAverage = totalWeighted / totalWeight;

  const finalExamInput = document.getElementById("finalExam");
  if (examWeight > 0 && finalExamInput && finalExamInput.value !== "") {
    const finalExamScore = parseFloat(finalExamInput.value);

    if (isNaN(finalExamScore) || finalExamScore < 0 || finalExamScore > 100) {
      output.innerHTML = "❌ Final Exam must be between 0 and 100.";
      output.classList.add('error');
      return;
    }

    const finalGrade = (
      courseAverage * ((100 - examWeight) / 100) +
      finalExamScore * (examWeight / 100)
    ).toFixed(1);

    output.innerHTML = `✅ Course Grade (with Final Exam): ${finalGrade}%`;
    output.classList.add('success');
    return;
  }

  output.innerHTML = `✅ Course Grade (without Final Exam): ${courseAverage.toFixed(1)}%`;
  output.classList.add('success');
}