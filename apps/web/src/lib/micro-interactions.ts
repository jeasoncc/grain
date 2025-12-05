/**
 * 微交互工具函数
 */

/**
 * 创建磁吸效果（鼠标跟随效果）
 */
export function createMagneticEffect(
  element: HTMLElement,
  strength: number = 0.3
): (() => void) {
  let isHovered = false;

  const handleMouseMove = (e: MouseEvent) => {
    if (!isHovered) return;

    const rect = element.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);

    const moveX = x * strength;
    const moveY = y * strength;

    element.style.transform = `translate(${moveX}px, ${moveY}px)`;
  };

  const handleMouseEnter = () => {
    isHovered = true;
    element.style.transition = "transform 0.3s ease-out";
  };

  const handleMouseLeave = () => {
    isHovered = false;
    element.style.transform = "translate(0, 0)";
    element.style.transition = "transform 0.5s ease-out";
  };

  element.addEventListener("mousemove", handleMouseMove);
  element.addEventListener("mouseenter", handleMouseEnter);
  element.addEventListener("mouseleave", handleMouseLeave);

  return () => {
    element.removeEventListener("mousemove", handleMouseMove);
    element.removeEventListener("mouseenter", handleMouseEnter);
    element.removeEventListener("mouseleave", handleMouseLeave);
    element.style.transform = "";
    element.style.transition = "";
  };
}

/**
 * 创建视差滚动效果
 */
export function createParallaxEffect(
  element: HTMLElement,
  speed: number = 0.5
): (() => void) {
  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrolled = window.pageYOffset;
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + scrolled;

        const yPos = -(scrolled - elementTop) * speed;
        element.style.transform = `translate3d(0, ${yPos}px, 0)`;

        ticking = false;
      });

      ticking = true;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });

  return () => {
    window.removeEventListener("scroll", handleScroll);
    element.style.transform = "";
  };
}

/**
 * 创建打字机效果
 */
export function typewriterEffect(
  element: HTMLElement,
  text: string,
  speed: number = 50
): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    element.textContent = "";

    const type = () => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        resolve();
      }
    };

    type();
  });
}

/**
 * 创建数字计数动画
 */
export function countUpAnimation(
  element: HTMLElement,
  target: number,
  duration: number = 2000
): Promise<void> {
  return new Promise((resolve) => {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const animate = () => {
      current += increment;
      if (current < target) {
        element.textContent = Math.floor(current).toLocaleString();
        requestAnimationFrame(animate);
      } else {
        element.textContent = target.toLocaleString();
        resolve();
      }
    };

    animate();
  });
}








