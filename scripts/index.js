// Function to update hero content based on auth state
function updateHeroContent(user) {
  const heroText = document.querySelector('.hero-content p');
  const startButton = document.querySelector('.hero-content .shop-now');
  
  if (user) {
    // User is signed in
    heroText.textContent = "Explore";
    startButton.textContent = "Explore";
  } else {
    // User is signed out
    heroText.textContent = "Unlock your potential at Federal Polytechnic Nekede's premier Skill Acquisition Hub. Expert-led training in digital technology, entrepreneurship, vocational skills, and professional development. Your journey to success starts here.";
    startButton.textContent = "Start Learning Today";
  }
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function () {
  // Add Firebase auth state observer
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      updateHeroContent(user);
    });
  }
	const hamburgerBtn = document.getElementById('navHamburger');
	const navLinks = document.getElementById('navLinks');
	const dropdownParents = document.querySelectorAll('.nav-dropdown');

	// Mobile menu toggle functionality
	if (hamburgerBtn && navLinks) {
		hamburgerBtn.addEventListener('click', function () {
			if (!this.classList.contains('active')) {
				// Opening the menu
				navLinks.classList.remove('closing');
				navLinks.classList.add('active');
				this.classList.add('active');
				this.setAttribute('aria-label', 'Close menu');
			} else {
				// Closing the menu with animation
				navLinks.classList.add('closing');
				navLinks.classList.remove('active');
				this.classList.remove('active');
				this.setAttribute('aria-label', 'Open menu');
				
				// Remove the closing class after animation completes
				setTimeout(() => {
					if (!navLinks.classList.contains('active')) {
						navLinks.classList.remove('closing');
					}
				}, 2000); // Match this with the CSS transition duration
			}
		});
	}

	// Dropdowns expand/collapse on tap (mobile only)
	dropdownParents.forEach(function (parent) {
		const link = parent.querySelector('a');
		const dropdown = parent.querySelector('.dropdown');
		if (link && dropdown) {
			link.addEventListener('click', function (e) {
				// Only on mobile (width <= 768px)
				if (window.innerWidth <= 768) {
					e.preventDefault();
					// Collapse others
					dropdownParents.forEach(function (other) {
						if (other !== parent) {
							other.classList.remove('dropdown-open');
						}
					});
					parent.classList.toggle('dropdown-open');
				}
			});
		}
	});

	// Optional: Close menu when clicking outside (mobile)
	document.addEventListener('click', function (e) {
		if (window.innerWidth <= 768 && navLinks.classList.contains('open')) {
			if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
				navLinks.classList.remove('open');
				hamburger.classList.remove('open');
				dropdownParents.forEach(function (parent) {
					parent.classList.remove('dropdown-open');
				});
			}
		}
	});
});

// === Hero Section Slider ===
document.addEventListener('DOMContentLoaded', function () {
  const sliderTrack = document.querySelector('.slider-track');
  const slides = document.querySelectorAll('.slider-track .slide');
  let currentIndex = 0;
  const slideCount = slides.length;

  function updateSlideWidth() {
    // Responsive slide width
    return slides[0].offsetWidth;
  }

  function goToSlide(index) {
    const slideWidth = updateSlideWidth();
    sliderTrack.style.transform = `translateX(-${index * slideWidth}px)`;
  }

  // Ensure smooth transition
  sliderTrack.style.transition = 'transform 1s cubic-bezier(0.4,0,0.2,1)';

  function nextSlide() {
    currentIndex++;
    if (currentIndex >= slideCount) {
      currentIndex = 0;
    }
    goToSlide(currentIndex);
  }

  // Initial position
  goToSlide(currentIndex);

  // Auto-slide every 2.5 seconds
  setInterval(nextSlide, 2500);

  // Recalculate slide width on window resize for mobile responsiveness
  window.addEventListener('resize', function () {
    goToSlide(currentIndex);
  });
});
