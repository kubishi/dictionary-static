<template>
  <div class="container">
    <div class="browse">
      <h2>Browse Dictionary</h2>

      <div class="filters">
        <input 
          type="text" 
          v-model="filterText"
          placeholder="Filter by letter or word..."
          class="filter-input"
        />
      </div>

      <!-- Letter Navigation -->
      <div v-if="!loading" class="letter-nav">
        <button 
          v-for="letter in alphabet" 
          :key="letter"
          @click="scrollToLetter(letter)"
          :class="['letter-btn', { 'active': selectedLetter === letter }]"
          :disabled="!lettersWithWords.has(letter)"
        >
          {{ letter }}
        </button>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else class="word-list">
        <template v-for="letter in alphabet" :key="letter">
          <div v-if="wordsByLetter[letter] && wordsByLetter[letter].length > 0" :id="`letter-${letter}`" class="letter-section">
            <h3 class="letter-heading">{{ letter }}</h3>
            <div class="letter-words">
              <div 
                v-for="word in wordsByLetter[letter]" 
                :key="word.id"
                class="word-item card"
                @click="$router.push(getWordUrl(word))"
              >
                <div class="word-header">
                  <h4>{{ getPrimaryForm(word) }}</h4>
                  <span v-if="getPartOfSpeech(word)" class="pos">
                    {{ getPartOfSpeech(word) }}
                  </span>
                </div>
                <p class="definition">{{ getFirstDefinition(word) }}</p>
              </div>
            </div>
          </div>
        </template>

        <div v-if="filteredWords.length === 0" class="no-results">
          <p>No words found matching "{{ filterText }}"</p>
        </div>
      </div>

      <div v-if="!loading && words.length > 0" class="browse-footer">
        <p>Showing {{ filteredWords.length }} of {{ words.length }} words</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { loadData, getWords, getWordUrl } from '../services/data'

export default {
  name: 'Browse',
  setup() {
    const words = ref([])
    const loading = ref(true)
    const filterText = ref('')
    const selectedLetter = ref('')
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

    onMounted(async () => {
      try {
        await loadData()
        words.value = getWords().sort((a, b) => {
          const aForm = getFirstLetter(getPrimaryForm(a))
          const bForm = getFirstLetter(getPrimaryForm(b))
          const aPrimary = getPrimaryForm(a).toLowerCase()
          const bPrimary = getPrimaryForm(b).toLowerCase()
          
          // First sort by letter, then by full word
          if (aForm !== bForm) {
            return aForm.localeCompare(bForm)
          }
          return aPrimary.localeCompare(bPrimary)
        })
      } catch (error) {
        console.error('Error loading words:', error)
      } finally {
        loading.value = false
      }
    })

    // Get first alphabetic letter, ignoring ', -, and other non-alpha characters
    const getFirstLetter = (word) => {
      for (let char of word.toUpperCase()) {
        if (/[A-Z]/.test(char)) {
          return char
        }
      }
      return '#' // For words with no alphabetic characters
    }

    // Normalize text for fuzzy matching - treats similar characters as equivalent
    const normalizeForMatching = (text) => {
      return text
        .toLowerCase()
        .replace(/[kg]/g, 'k')  // k/g are equivalent
        .replace(/[td]/g, 't')  // t/d are equivalent
        .replace(/[sz]/g, 's')  // s/z are equivalent
        .replace(/[üu]/g, 'u')  // ü/u are equivalent
        .replace(/w̃/g, 'w')     // w̃/w are equivalent
        .replace(/[mw]/g, 'm')  // m/w are equivalent (also catches w̃ via previous rule)
        .replace(/[pb]/g, 'p')  // p/b are equivalent
    }

    // Calculate Levenshtein distance for fuzzy matching
    const levenshteinDistance = (str1, str2) => {
      const matrix = []

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i]
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1]
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1, // substitution
              matrix[i][j - 1] + 1,     // insertion
              matrix[i - 1][j] + 1      // deletion
            )
          }
        }
      }

      return matrix[str2.length][str1.length]
    }

    const filteredWords = computed(() => {
      if (!filterText.value) return words.value

      const filter = normalizeForMatching(filterText.value)
      const maxDistance = Math.max(1, Math.floor(filter.length / 4)) // Allow ~25% error rate

      return words.value.filter(word => {
        const primaryForm = getPrimaryForm(word)
        const normalizedForm = normalizeForMatching(primaryForm)
        
        // Exact match after normalization (handles character equivalences)
        if (normalizedForm.includes(filter)) {
          return true
        }
        
        // Fuzzy match at start of word
        if (filter.length >= 3) {
          const wordStart = normalizedForm.substring(0, filter.length)
          const distance = levenshteinDistance(filter, wordStart)
          if (distance <= maxDistance) {
            return true
          }
        }
        
        // Fuzzy match for whole word if filter is long enough
        if (filter.length >= 4) {
          const distance = levenshteinDistance(filter, normalizedForm)
          if (distance <= maxDistance) {
            return true
          }
        }
        
        return false
      })
    })

    // Group words by first letter
    const wordsByLetter = computed(() => {
      const grouped = {}
      const wordsToGroup = filterText.value ? filteredWords.value : words.value
      
      wordsToGroup.forEach(word => {
        const letter = getFirstLetter(getPrimaryForm(word))
        if (!grouped[letter]) {
          grouped[letter] = []
        }
        grouped[letter].push(word)
      })
      
      return grouped
    })

    // Get set of letters that have words
    const lettersWithWords = computed(() => {
      return new Set(Object.keys(wordsByLetter.value))
    })

    const scrollToLetter = (letter) => {
      selectedLetter.value = letter
      const element = document.getElementById(`letter-${letter}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    const getPrimaryForm = (word) => {
      return word.forms ? Object.values(word.forms)[0] : word.word || 'Unknown'
    }

    const getPartOfSpeech = (word) => {
      if (!word.senses || word.senses.length === 0) return ''
      return word.senses[0].partOfSpeech || ''
    }

    const getFirstDefinition = (word) => {
      if (!word.senses || word.senses.length === 0) return ''
      
      const sense = word.senses[0]
      if (sense.definitions && Object.keys(sense.definitions).length > 0) {
        return Object.values(sense.definitions)[0]
      }
      if (sense.glosses && Object.keys(sense.glosses).length > 0) {
        return Object.values(sense.glosses)[0]
      }
      return ''
    }

    return {
      words,
      loading,
      filterText,
      filteredWords,
      wordsByLetter,
      alphabet,
      lettersWithWords,
      selectedLetter,
      scrollToLetter,
      getWordUrl,
      getPrimaryForm,
      getPartOfSpeech,
      getFirstDefinition
    }
  }
}
</script>

<style scoped>
.browse h2 {
  margin-bottom: 1.5rem;
  font-size: 2rem;
  color: var(--text-primary);
}

.filters {
  margin-bottom: 1rem;
}

.filter-input {
  max-width: 400px;
}

.letter-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  justify-content: center;
}

.letter-btn {
  min-width: 2rem;
  height: 2rem;
  padding: 0.25rem 0.5rem;
  background: var(--bg-paper);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.letter-btn:hover:not(:disabled) {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.letter-btn.active {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

.letter-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.letter-section {
  margin-bottom: 3rem;
}

.letter-heading {
  font-size: 2rem;
  font-weight: 600;
  color: var(--accent-primary);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--accent-primary);
  scroll-margin-top: 6rem;
}

.letter-words {
  display: grid;
  gap: 1rem;
}

.word-list {
  display: grid;
  gap: 1rem;
}

.word-item {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.word-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow);
}

.word-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.word-header h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.25rem;
}

.pos {
  padding: 0.25rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.definition {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.browse-footer {
  margin-top: 2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .browse h2 {
    font-size: 1.5rem;
  }

  .word-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
