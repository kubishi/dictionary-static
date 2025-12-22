<template>
  <div id="app">
    <header class="header">
      <div class="container header-content">
        <router-link to="/" class="logo">
          <h1>Kubishi Dictionary</h1>
        </router-link>
        
        <!-- Desktop Navigation -->
        <nav class="nav desktop-nav">
          <router-link to="/">Search</router-link>
          <router-link to="/browse">Browse</router-link>
          <router-link to="/pronunciation">Pronunciation</router-link>
          <router-link to="/about">About</router-link>
          <div class="icon-buttons">
            <button @click="getRandomWord" class="btn-icon" title="Random Word">
              <Shuffle :size="18" />
            </button>
            <button @click="toggleDarkMode" class="btn-icon" title="Toggle Dark Mode">
              <Sun v-if="isDarkMode" :size="18" />
              <Moon v-else :size="18" />
            </button>
          </div>
        </nav>

        <!-- Mobile Menu Toggle -->
        <button @click="toggleMobileMenu" class="hamburger-btn mobile-only" :class="{ 'open': mobileMenuOpen }">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <!-- Mobile Navigation -->
      <transition name="slide">
        <nav v-if="mobileMenuOpen" class="mobile-nav">
          <router-link to="/" @click="closeMobileMenu">Search</router-link>
          <router-link to="/browse" @click="closeMobileMenu">Browse</router-link>
          <router-link to="/pronunciation" @click="closeMobileMenu">Pronunciation</router-link>
          <router-link to="/about" @click="closeMobileMenu">About</router-link>
          <div class="mobile-buttons">
            <button @click="getRandomWord(); closeMobileMenu()" class="btn-icon" title="Random Word">
              <Shuffle :size="18" /> Random Word
            </button>
            <button @click="toggleDarkMode" class="btn-icon" title="Toggle Dark Mode">
              <Sun v-if="isDarkMode" :size="18" />
              <Moon v-else :size="18" />
              {{ isDarkMode ? 'Light' : 'Dark' }} Mode
            </button>
          </div>
        </nav>
      </transition>
    </header>

    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="footer">
      <div class="container">
        <p>&copy; 2025 Kubishi Dictionary.</p>
      </div>
    </footer>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Shuffle, Sun, Moon } from 'lucide-vue-next'
import { loadData, getWords, getWordUrl } from './services/data'

export default {
  name: 'App',
  components: {
    Shuffle,
    Sun,
    Moon
  },
  setup() {
    const router = useRouter()
    const isDarkMode = ref(false)
    const mobileMenuOpen = ref(false)

    onMounted(() => {
      // Check for saved dark mode preference
      const savedMode = localStorage.getItem('darkMode')
      if (savedMode === 'true') {
        isDarkMode.value = true
        document.body.classList.add('dark-mode')
      }

      // Load data in background
      loadData().catch(console.error)
    })

    const toggleDarkMode = () => {
      isDarkMode.value = !isDarkMode.value
      document.body.classList.toggle('dark-mode')
      localStorage.setItem('darkMode', isDarkMode.value)
    }

    const toggleMobileMenu = () => {
      mobileMenuOpen.value = !mobileMenuOpen.value
    }

    const closeMobileMenu = () => {
      mobileMenuOpen.value = false
    }

    const getRandomWord = async () => {
      try {
        await loadData()
        const words = getWords()
        if (words.length > 0) {
          const randomWord = words[Math.floor(Math.random() * words.length)]
          router.push(`/word/${randomWord.id}`)
        }
      } catch (error) {
        console.error('Error getting random word:', error)
      }
    }

    return {
      isDarkMode,
      mobileMenuOpen,
      toggleDarkMode,
      toggleMobileMenu,
      closeMobileMenu,
      getRandomWord,
      Shuffle,
      Sun,
      Moon
    }
  }
}
</script>

<style scoped>
.header {
  background: var(--bg-paper);
  border-bottom: 1px solid var(--border-primary);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.logo {
  text-decoration: none;
  color: var(--text-primary);
}

.logo h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.nav {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.nav a {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.nav a:hover,
.nav a.router-link-active {
  color: var(--accent-primary);
}

.icon-buttons {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  padding: 0.25rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-secondary);
}

.btn-icon {
  background: none;
  border: none;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.95rem;
  border-radius: 0.25rem;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--text-secondary);
}

.btn-icon svg {
  flex-shrink: 0;
}

.btn-icon:hover {
  background: var(--bg-tertiary);
}

.main {
  flex: 1;
  padding: 2rem 0;
}

.footer {
  background: var(--bg-secondary);
  padding: 2rem 0;
  text-align: center;
  border-top: 1px solid var(--border-primary);
  margin-top: 4rem;
}

.footer p {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile-specific styles */
.mobile-only {
  display: none;
}

.hamburger-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: none;
  flex-direction: column;
  gap: 0.25rem;
  width: 2.5rem;
  height: 2.5rem;
  justify-content: center;
  align-items: center;
  z-index: 101;
}

.hamburger-btn span {
  display: block;
  width: 1.5rem;
  height: 2px;
  background: var(--text-primary);
  transition: all 0.3s ease;
}

.hamburger-btn.open span:nth-child(1) {
  transform: rotate(45deg) translate(4px, 4px);
}

.hamburger-btn.open span:nth-child(2) {
  opacity: 0;
}

.hamburger-btn.open span:nth-child(3) {
  transform: rotate(-45deg) translate(4px, -4px);
}

.mobile-nav {
  display: none;
  flex-direction: column;
  gap: 0;
  background: var(--bg-paper);
  border-top: 1px solid var(--border-primary);
  padding: 0;
}

.mobile-nav a {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-primary);
  transition: background 0.2s;
}

.mobile-nav a:hover,
.mobile-nav a.router-link-active {
  background: var(--bg-secondary);
  color: var(--accent-primary);
}

.mobile-buttons {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.5rem 0;
}

.mobile-buttons .btn-icon {
  width: 100%;
  text-align: left;
  padding: 1rem 1.5rem;
  border: none;
  border-bottom: 1px solid var(--border-primary);
  border-radius: 0;
  justify-content: flex-start;
  color: var(--text-secondary);
  background: none;
}

.mobile-buttons .btn-icon:hover {
  background: var(--bg-secondary);
  color: var(--accent-primary);
}

/* Slide transition for mobile menu */
.slide-enter-active,
.slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 500px;
  opacity: 1;
}

@media (max-width: 768px) {
  .desktop-nav {
    display: none !important;
  }

  .hamburger-btn {
    display: flex;
  }

  .mobile-nav {
    display: flex;
  }

  .header-content {
    flex-direction: row;
    gap: 1rem;
  }

  .logo h1 {
    font-size: 1.25rem;
  }
}
</style>
