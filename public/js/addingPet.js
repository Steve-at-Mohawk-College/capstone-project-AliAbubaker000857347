document.addEventListener('DOMContentLoaded', async () => {
  // Enable tooltips
  [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].forEach(el =>
    new bootstrap.Tooltip(el)
  );

  const form = document.getElementById('petForm');
  const nameInput = document.getElementById('name');
  const ageInput = document.getElementById('age');
  const weightInput = document.getElementById('weight');
  const genderSelect = document.getElementById('gender');
  const breedInput = document.getElementById('breed');
  const speciesSelect = document.getElementById('species');
  const otherSpeciesContainer = document.getElementById('otherSpeciesContainer');
  const otherSpeciesInput = document.getElementById('otherSpecies');
  const suggestions = document.getElementById('breedSuggestions');

  let allBreeds = [];

  // Check for server-side errors and preserved data
  const fieldErrors = JSON.parse(document.getElementById('fieldErrors').value || '{}');
  
  // Apply server-side validation errors
  if (Object.keys(fieldErrors).length > 0) {
    Object.keys(fieldErrors).forEach(fieldName => {
      const input = document.getElementById(fieldName);
      const errorElement = document.getElementById(`${fieldName}Error`);
      if (input && errorElement) {
        input.classList.add('is-invalid');
        errorElement.textContent = fieldErrors[fieldName];
      }
    });
    
    // Focus on first invalid field
    const firstInvalid = form.querySelector('.is-invalid');
    if (firstInvalid) {
      firstInvalid.focus();
    }
  }

  // Species change handler
  speciesSelect.addEventListener('change', function() {
    if (this.value === 'other') {
      otherSpeciesContainer.style.display = 'block';
      otherSpeciesInput.setAttribute('required', 'required');
    } else {
      otherSpeciesContainer.style.display = 'none';
      otherSpeciesInput.removeAttribute('required');
      otherSpeciesInput.value = '';
    }
  });

  // Fetch dog breeds from server (cached)
  try {
    const res = await fetch('/api/dog-breeds');
    if (res.ok) {
      const data = await res.json();
      allBreeds = data.map(b => b.name);
    } else {
      console.warn('Dog API returned an error.');
    }
  } catch (err) {
    console.warn('Dog API not available:', err);
  }

  // Breed autocomplete
  breedInput.addEventListener('input', () => {
    const query = breedInput.value.trim().toLowerCase();
    
    if (!query) {
      suggestions.style.display = 'none';
      return;
    }

    const matches = allBreeds.filter(b => 
      b.toLowerCase().includes(query)
    ).slice(0, 5);

    suggestions.innerHTML = '';
    
    if (matches.length > 0) {
      matches.forEach(match => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action small';
        item.textContent = match;
        item.onclick = () => {
          breedInput.value = match;
          suggestions.style.display = 'none';
          breedInput.classList.remove('is-invalid');
          validateBreed(breedInput.value);
        };
        suggestions.appendChild(item);
      });
      suggestions.style.display = 'block';
    } else {
      suggestions.style.display = 'none';
    }
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!breedInput.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.style.display = 'none';
    }
  });

  // Validation functions
  function validateAge(age) {
    const ageNum = parseFloat(age);
    return !isNaN(ageNum) && ageNum > 0 && ageNum <= 50;
  }

  function validateWeight(weight) {
    const weightNum = parseFloat(weight);
    return !isNaN(weightNum) && weightNum > 0 && weightNum <= 200;
  }

  function validateName(name) {
    return /^[A-Za-z\s'-]+$/.test(name.trim()) && name.trim().length >= 2 && name.trim().length <= 50;
  }

  function validateBreed(breed) {
    return breed.trim().length >= 2 && breed.trim().length <= 50;
  }

  function validateSpecies(species) {
    return species && species !== '';
  }

  function validateGender(gender) {
    return gender && gender !== '';
  }

  // Real-time validation feedback
  nameInput.addEventListener('input', () => {
    if (validateName(nameInput.value)) {
      nameInput.classList.remove('is-invalid');
      nameInput.classList.add('is-valid');
    } else {
      nameInput.classList.remove('is-valid');
    }
  });

  ageInput.addEventListener('input', () => {
    if (validateAge(ageInput.value)) {
      ageInput.classList.remove('is-invalid');
      ageInput.classList.add('is-valid');
    } else {
      ageInput.classList.remove('is-valid');
    }
  });

  weightInput.addEventListener('input', () => {
    if (validateWeight(weightInput.value)) {
      weightInput.classList.remove('is-invalid');
      weightInput.classList.add('is-valid');
    } else {
      weightInput.classList.remove('is-valid');
    }
  });

  breedInput.addEventListener('input', () => {
    if (validateBreed(breedInput.value)) {
      breedInput.classList.remove('is-invalid');
      breedInput.classList.add('is-valid');
    } else {
      breedInput.classList.remove('is-valid');
    }
  });

  speciesSelect.addEventListener('change', () => {
    if (validateSpecies(speciesSelect.value)) {
      speciesSelect.classList.remove('is-invalid');
      speciesSelect.classList.add('is-valid');
    } else {
      speciesSelect.classList.remove('is-valid');
    }
  });

  genderSelect.addEventListener('change', () => {
    if (validateGender(genderSelect.value)) {
      genderSelect.classList.remove('is-invalid');
      genderSelect.classList.add('is-valid');
    } else {
      genderSelect.classList.remove('is-valid');
    }
  });

  // Remove invalid class in real time when corrected
  [nameInput, ageInput, weightInput, genderSelect, breedInput, speciesSelect, otherSpeciesInput].forEach(input => {
    input.addEventListener('input', () => {
      if (input.checkValidity()) {
        input.classList.remove('is-invalid');
      }
    });
  });

  // Form validation
  form.addEventListener('submit', e => {
    let isValid = true;
    const errors = {};

    // Clear previous errors
    [nameInput, ageInput, weightInput, genderSelect, breedInput, speciesSelect, otherSpeciesInput].forEach(input => {
      input.classList.remove('is-invalid');
    });

    // Name validation
    if (!validateName(nameInput.value)) {
      nameInput.classList.add('is-invalid');
      errors.name = 'Enter a valid pet name (2-50 letters, spaces, apostrophes, hyphens only)';
      isValid = false;
    }

    // Age validation
    if (!validateAge(ageInput.value)) {
      ageInput.classList.add('is-invalid');
      errors.age = 'Age must be greater than 0 and less than or equal to 50';
      isValid = false;
    }

    // Weight validation
    if (!validateWeight(weightInput.value)) {
      weightInput.classList.add('is-invalid');
      errors.weight = 'Weight must be greater than 0 and less than or equal to 200';
      isValid = false;
    }

    // Gender validation
    if (!validateGender(genderSelect.value)) {
      genderSelect.classList.add('is-invalid');
      errors.gender = 'Please select a gender';
      isValid = false;
    }

    // Species validation
    if (!validateSpecies(speciesSelect.value)) {
      speciesSelect.classList.add('is-invalid');
      errors.species = 'Please select a species';
      isValid = false;
    }

    // Other species validation
    if (speciesSelect.value === 'other' && !otherSpeciesInput.value.trim()) {
      otherSpeciesInput.classList.add('is-invalid');
      errors.otherSpecies = 'Please enter a valid species name';
      isValid = false;
    }

    // Breed validation
    if (!validateBreed(breedInput.value)) {
      breedInput.classList.add('is-invalid');
      errors.breed = 'Breed must be 2-50 characters long';
      isValid = false;
    }

    if (!isValid) {
      e.preventDefault();
      e.stopPropagation();
      
      // Update error messages
      Object.keys(errors).forEach(fieldName => {
        const errorElement = document.getElementById(`${fieldName}Error`);
        if (errorElement) {
          errorElement.textContent = errors[fieldName];
        }
      });
      
      // Focus on first invalid field
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) {
        firstInvalid.focus();
      }
    }

    form.classList.add('was-validated');
  });

  // Handle form data before submission
  form.addEventListener('formdata', (e) => {
    const formData = e.formData;
    
    // If "Other" species is selected, use the custom input value
    if (speciesSelect.value === 'other' && otherSpeciesInput.value.trim()) {
      formData.set('species', otherSpeciesInput.value.trim());
    }
  });
});