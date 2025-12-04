document.addEventListener('DOMContentLoaded', async () => {
    /**
     * Initializes the pet form with validation, autocomplete, and error handling.
     * Features include:
     * - Bootstrap tooltip initialization
     * - Server-side error display and preservation
     * - Breed autocomplete with external API integration
     * - Real-time client-side validation with visual feedback
     * - Dynamic species selection with "Other" option
     */

    // Initialize Bootstrap tooltips
    [...document.querySelectorAll('[data-bs-toggle="tooltip"]')].forEach(el =>
        new bootstrap.Tooltip(el)
    );

    // DOM element references
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

    // Display server-side validation errors from previous submission
    const fieldErrors = JSON.parse(document.getElementById('fieldErrors').value || '{}');
    
    if (Object.keys(fieldErrors).length > 0) {
        Object.keys(fieldErrors).forEach(fieldName => {
            const input = document.getElementById(fieldName);
            const errorElement = document.getElementById(`${fieldName}Error`);
            if (input && errorElement) {
                input.classList.add('is-invalid');
                errorElement.textContent = fieldErrors[fieldName];
            }
        });
        
        // Focus on first invalid field for better UX
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) {
            firstInvalid.focus();
        }
    }

    /**
     * Handles species selection changes.
     * Shows/hides "Other" species input field based on selection.
     */
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

    /**
     * Fetches dog breeds from server for autocomplete functionality.
     * Uses cached data from server-side API endpoint.
     */
    try {
        const res = await fetch('/api/dog-breeds');
        if (res.ok) {
            const data = await res.json();
            allBreeds = data.map(b => b.name);
        }
    } catch (err) {
        // console.warn('Dog API not available:', err);
    }

    /**
     * Provides breed autocomplete suggestions based on user input.
     * Shows up to 5 matching breeds from the fetched list.
     */
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

    /**
     * Hides autocomplete suggestions when clicking outside the breed input.
     */
    document.addEventListener('click', (e) => {
        if (!breedInput.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });

    /**
     * Validates that age is a positive number ≤ 50.
     * @param {string|number} age - Age value to validate
     * @returns {boolean} True if age is valid
     */
    function validateAge(age) {
        const ageNum = parseFloat(age);
        return !isNaN(ageNum) && ageNum > 0 && ageNum <= 50;
    }

    /**
     * Validates that weight is a positive number ≤ 200.
     * @param {string|number} weight - Weight value to validate
     * @returns {boolean} True if weight is valid
     */
    function validateWeight(weight) {
        const weightNum = parseFloat(weight);
        return !isNaN(weightNum) && weightNum > 0 && weightNum <= 200;
    }

    /**
     * Validates pet name format and length.
     * @param {string} name - Pet name to validate
     * @returns {boolean} True if name is valid (2-50 chars, letters, spaces, apostrophes, hyphens)
     */
    function validateName(name) {
        return /^[A-Za-z\s'-]+$/.test(name.trim()) && name.trim().length >= 2 && name.trim().length <= 50;
    }

    /**
     * Validates breed length.
     * @param {string} breed - Breed name to validate
     * @returns {boolean} True if breed is valid (2-50 chars)
     */
    function validateBreed(breed) {
        return breed.trim().length >= 2 && breed.trim().length <= 50;
    }

    /**
     * Validates species selection.
     * @param {string} species - Selected species value
     * @returns {boolean} True if species is selected
     */
    function validateSpecies(species) {
        return species && species !== '';
    }

    /**
     * Validates gender selection.
     * @param {string} gender - Selected gender value
     * @returns {boolean} True if gender is selected
     */
    function validateGender(gender) {
        return gender && gender !== '';
    }

    /**
     * Real-time validation feedback with visual indicators.
     * Adds/removes Bootstrap validation classes based on input validity.
     */
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

    /**
     * Removes invalid styling when user corrects input.
     */
    [nameInput, ageInput, weightInput, genderSelect, breedInput, speciesSelect, otherSpeciesInput].forEach(input => {
        input.addEventListener('input', () => {
            if (input.checkValidity()) {
                input.classList.remove('is-invalid');
            }
        });
    });

    /**
     * Comprehensive form validation on submission.
     * Prevents submission if validation fails and displays error messages.
     * @param {Event} e - Form submit event
     */
    form.addEventListener('submit', e => {
        let isValid = true;
        const errors = {};

        // Clear previous error styling
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
            
            // Update error messages in DOM
            Object.keys(errors).forEach(fieldName => {
                const errorElement = document.getElementById(`${fieldName}Error`);
                if (errorElement) {
                    errorElement.textContent = errors[fieldName];
                }
            });
            
            // Focus on first invalid field for better UX
            const firstInvalid = form.querySelector('.is-invalid');
            if (firstInvalid) {
                firstInvalid.focus();
            }
        }

        form.classList.add('was-validated');
    });

    /**
     * Handles form data before submission.
     * Replaces "other" species value with custom input value.
     * @param {Event} e - FormData event
     */
    form.addEventListener('formdata', (e) => {
        const formData = e.formData;
        
        if (speciesSelect.value === 'other' && otherSpeciesInput.value.trim()) {
            formData.set('species', otherSpeciesInput.value.trim());
        }
    });
});