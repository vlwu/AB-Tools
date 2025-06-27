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

  // This is called after everything is inserted
  document.getElementById("calculateButton").addEventListener("click", () => {
    calculateGrade(examWeight);
  });
}

function calculateGrade(examWeight) {
  const inputs = document.querySelectorAll("input[type='number']");
  let totalWeighted = 0;
  let totalWeight = 0;
  let hasError = false;

  // Reset output
  const output = document.getElementById("output");
  output.innerText = "";

  inputs.forEach(input => {
    input.style.borderColor = ""; // reset border

    if (input.id === "finalExam") return; // handled separately
    const value = parseFloat(input.value);
    const weight = parseFloat(input.dataset.weight);

    if (!isNaN(value)) {
      if (value < 0 || value > 100) {
        input.style.borderColor = "red";
        output.innerText = `❌ "${input.previousElementSibling.innerText}" must be between 0 and 100.`;
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
    return;
  }

  const courseAverage = totalWeighted / totalWeight;

  const finalExamInput = document.getElementById("finalExam");
  if (examWeight > 0 && finalExamInput && finalExamInput.value !== "") {
    const finalExamScore = parseFloat(finalExamInput.value);

    if (isNaN(finalExamScore) || finalExamScore < 0 || finalExamScore > 100) {
      finalExamInput.style.borderColor = "red";
      output.innerText = "❌ Final Exam must be between 0 and 100.";
      return;
    }

    const finalGrade = (
      courseAverage * ((100 - examWeight) / 100) +
      finalExamScore * (examWeight / 100)
    ).toFixed(1);

    output.innerText = `✅ Course Grade (with Final Exam): ${finalGrade}%`;
    return;
  }

  output.innerText = `✅ Course Grade (without Final Exam): ${courseAverage.toFixed(1)}%`;
}
