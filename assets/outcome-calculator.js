function createCalculator(containerId, outcomes, examWeight = 0) {
  const container = document.getElementById(containerId);
  container.innerHTML = ''; // clear anything inside

  outcomes.forEach(({ id, label, weight }) => {
    container.innerHTML += `
      <label>${label} [${weight}%]</label>
      <input type="number" min="0" max="100" id="${id}">
    `;
  });

  if (examWeight > 0) {
    container.innerHTML += `
      <label>Final Exam (Optional – ${examWeight}%)</label>
      <input type="number" min="0" max="100" id="finalExam">
    `;
  }

  container.innerHTML += `
    <button onclick="calculateGrade(${examWeight})">Calculate</button>
    <p id="output"></p>
  `;
}

function calculateGrade(examWeight) {
  const inputs = document.querySelectorAll("input[type='number']");
  let totalWeighted = 0;
  let totalWeight = 0;

  inputs.forEach(input => {
    const id = input.id;
    const value = input.value;
    if (id !== "finalExam" && value !== "") {
      const weight = parseFloat(input.labels[0].innerText.match(/\[(\d+)%\]/)[1]);
      totalWeighted += parseFloat(value) * weight;
      totalWeight += weight;
    }
  });

  const examInput = document.getElementById("finalExam");
  if (examWeight > 0 && examInput && examInput.value !== "") {
    const courseMark = totalWeighted / totalWeight;
    const examMark = parseFloat(examInput.value);
    const finalGrade = (courseMark * (1 - examWeight / 100) + examMark * (examWeight / 100)).toFixed(1);
    document.getElementById("output").innerText = `Final Grade (with Exam): ${finalGrade}%`;
  } else {
    const courseMark = (totalWeighted / totalWeight).toFixed(1);
    document.getElementById("output").innerText = `Course Grade (without Exam): ${courseMark}%`;
  }
}
