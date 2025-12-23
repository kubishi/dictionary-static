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

      <!-- Letter Navigation (only show when not filtering) -->
      <div v-if="!loading && !filterText" class="letter-nav">
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
        <!-- Filtered results (flat list sorted by relevance) -->
        <template v-if="filterText">
          <div class="list-group card">
            <div 
              v-for="word in filteredWords" 
              :key="word.id"
              class="list-item"
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
          
          <div v-if="filteredWords.length === 0" class="no-results">
            <p>No words found matching "{{ filterText }}"</p>
          </div>
        </template>

        <!-- Letter-grouped view (when no filter) -->
        <template v-else>
          <template v-for="letter in alphabet" :key="letter">
            <div v-if="wordsByLetter[letter] && wordsByLetter[letter].length > 0" :id="`letter-${letter}`" class="letter-section">
              <h3 class="letter-heading">{{ letter }}</h3>
              <div class="list-group card">
                <div 
                  v-for="word in wordsByLetter[letter]" 
                  :key="word.id"
                  class="list-item"
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
        </template>
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

    // Calculate relevance score for a word (higher is better)
    const calculateRelevanceScore = (word, filter) => {
      const primaryForm = getPrimaryForm(word)
      const normalizedForm = normalizeForMatching(primaryForm)
      const maxDistance = Math.max(1, Math.floor(filter.length / 4))
      
      // Exact match gets highest score
      if (normalizedForm === filter) {
        return 1000
      }
      
      // Starts with exact match
      if (normalizedForm.startsWith(filter)) {
        return 900 - (normalizedForm.length - filter.length)
      }
      
      // Contains exact match
      if (normalizedForm.includes(filter)) {
        const position = normalizedForm.indexOf(filter)
        return 700 - position * 2
      }
      
      // Fuzzy match at start
      if (filter.length >= 3) {
        const wordStart = normalizedForm.substring(0, filter.length)
        const distance = levenshteinDistance(filter, wordStart)
        if (distance <= maxDistance) {
          return 500 - distance * 50
        }
      }
      
      // Fuzzy match for whole word
      if (filter.length >= 4) {
        const distance = levenshteinDistance(filter, normalizedForm)
        if (distance <= maxDistance) {
          return 300 - distance * 30 - Math.abs(normalizedForm.length - filter.length)
        }
      }
      
      return 0 // No match
    }

    const filteredWords = computed(() => {
      if (!filterText.value) return words.value

      const filter = normalizeForMatching(filterText.value)
      
      // Calculate scores and filter out non-matches
      const scoredWords = words.value
        .map(word => ({
          word,
          score: calculateRelevanceScore(word, filter)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score) // Sort by score (highest first)
        .map(item => item.word)

      return scoredWords
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

.word-list {
  display: grid;
  gap: 1rem;
}

/* List group styling */
.list-group {
  padding: 0;
  overflow: hidden;
}

.list-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--border-secondary);
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background-color: var(--bg-secondary);
}

.word-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.word-header h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

/* Smaller heading in filtered view */
.list-item .word-header h4 {
  font-size: 1rem;
}

.pos {
  padding: 0.2rem 0.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.definition {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
  font-size: 0.95rem;
}

/* More compact definition in filtered view */
.list-item .definition {
  font-size: 0.9rem;
  line-height: 1.4;
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
