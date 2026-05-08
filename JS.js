
    document.addEventListener('DOMContentLoaded', () => {
      const slider = document.getElementById('slider');
      const slides = document.querySelectorAll('.slide');
      const dots = document.querySelectorAll('.dot');
      let currentIndex = 0;
      let autoSlideInterval;
      let startX = 0;
      let isDragging = true;

      const updateSlider = () => {
        slider.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach(dot => dot.classList.remove('active'));
        dots[currentIndex].classList.add('active');
      };

      const nextSlide = () => {
        currentIndex = (currentIndex + 1) % slides.length;
        updateSlider();
      };

      const goToSlide = (index) => {
        currentIndex = index;
        updateSlider();
        resetInterval();
      };

      const startInterval = () => {
        autoSlideInterval = setInterval(nextSlide, 3000);
      };

      const resetInterval = () => {
        clearInterval(autoSlideInterval);
        startInterval();
      };

      // Dot click
      dots.forEach(dot => {
        dot.addEventListener('click', () => {
          goToSlide(parseInt(dot.dataset.slide));
        });
      });

      // Touch swipe
      slider.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        clearInterval(autoSlideInterval);
      });

      slider.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diff = startX - currentX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) nextSlide();
          else currentIndex = currentIndex > 0? currentIndex - 1 : slides.length - 1;
          updateSlider();
          isDragging = false;
        }
      });

      slider.addEventListener('touchend', () => {
        isDragging = false;
        resetInterval();
      });

      // Init
      updateSlider();
      startInterval();
    });
