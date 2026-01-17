<template>
  <div class="home">
    <div class="container">
      <div class="home-layout">
        <!-- Sidebar for desktop -->
        <aside class="sidebar" v-if="wordOfDay">
          <div class="word-of-day card">
            <h3>Word of the Day</h3>
            <div class="wod-content" @click="$router.push(getWordUrl(wordOfDay))">
              <h2>{{ getPrimaryForm(wordOfDay) }}</h2>
              <p class="definition">{{ getFirstDefinition(wordOfDay) }}</p>
              <span v-if="wordOfDay.senses?.[0]?.partOfSpeech" class="pos">
                {{ wordOfDay.senses[0].partOfSpeech }}
              </span>
            </div>
          </div>


          <div class="stats" v-if="index">
            <div class="stat-item">
              <div class="stat-number">{{ index.totalWords }}</div>
              <div class="stat-label">Words</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ index.totalSentences }}</div>
              <div class="stat-label">Example Sentences</div>
            </div>
          </div>
        </aside>

        <!-- Main content area -->
        <main class="main-content">
          <div class="search-section">
            <form class="search-box" @submit.prevent="handleSearch">
              <div class="search-input-wrapper">
                <input
                  type="search"
                  v-model="searchQuery"
                  placeholder="Search in English or Paiute..."
                  class="search-input"
                  @keyup.enter="handleSearch"
                />
                <button type="submit" class="search-button" :disabled="loading || !searchQuery.trim()">
                  Search
                </button>
              </div>
            </form>
          </div>

          <div v-if="loading" class="loading">
            <div class="spinner"></div>
          </div>

          <div v-else-if="hasSearched && results.length === 0" class="no-results">
            <p>No results found for "{{ lastQuery }}"</p>
          </div>

          <div v-else-if="results.length > 0" class="results">
            <h3>{{ results.length }} result{{ results.length !== 1 ? 's' : '' }}</h3>
            <div class="list-group card">
              <div
                v-for="word in results"
                :key="word.id"
                class="list-item"
                @click="$router.push(getWordUrl(word))"
              >
                <div class="word-header">
                  <h4>{{ getPrimaryForm(word) }}</h4>
                  <span v-if="word.senses?.[0]?.partOfSpeech" class="pos">
                    {{ word.senses[0].partOfSpeech }}
                  </span>
                </div>
                <p class="definition">{{ getFirstDefinition(word) }}</p>
              </div>
            </div>
          </div>

          <!-- Sidebar content (shown here on mobile, after results) -->
          <aside class="sidebar-mobile" v-if="wordOfDay">
            <div class="word-of-day card">
              <h3>Word of the Day</h3>
              <div class="wod-content" @click="$router.push(getWordUrl(wordOfDay))">
                <h2>{{ getPrimaryForm(wordOfDay) }}</h2>
                <p class="definition">{{ getFirstDefinition(wordOfDay) }}</p>
                <span v-if="wordOfDay.senses?.[0]?.partOfSpeech" class="pos">
                  {{ wordOfDay.senses[0].partOfSpeech }}
                </span>
              </div>
            </div>


            <div class="stats" v-if="index">
              <div class="stat-item">
                <div class="stat-number">{{ index.totalWords }}</div>
                <div class="stat-label">Words</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">{{ index.totalSentences }}</div>
                <div class="stat-label">Example Sentences</div>
              </div>
            </div>
          </aside>

          <div v-if="results.length === 0 && !hasSearched" class="acknowledgement card">
            <h3 class="text-center">Acknowledgements</h3>
            <p>
              All words and sentences in this dictionary are from Glenn Nelson Jr.'s
              <em>Owens Valley Paiute Dictionary</em>. This website is made possible through
              his work and the contributions of the native speakers and elders he collaborated with.
            </p>
            <p>
              Special thanks to Norma Nelson, elder and fluent speaker/teacher of the Bishop Paiute Tribe,
              as well as to the following Paiute speakers from across Payahuunadü:
              Albert Meredith, Ethie Meredith, Andy Garrison, Maude Shaw, Ruth Brown, and Margie Jones.
            </p>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { loadData, getWords, getIndex, getWordOfTheDay, getWordUrl } from '../services/data'
import { smartSearch } from '../services/smart-search'
import { hybridSearch, isSemanticSearchReady } from '../services/semantic-search'

export default {
  name: 'Home',
  setup() {
    const wordOfDay = ref(null)
    const searchQuery = ref('')
    const lastQuery = ref('')
    const results = ref([])
    const loading = ref(false)
    const hasSearched = ref(false)
    const index = ref(null)

    onMounted(async () => {
      loading.value = true
      console.log('📖 Loading dictionary data...')

      try {
        await loadData()
        index.value = getIndex()
        wordOfDay.value = getWordOfTheDay()
        console.log(`✅ Loaded ${index.value.totalWords} words and ${index.value.totalSentences} sentences`)
      } catch (error) {
        console.error('❌ Error loading data:', error)
      } finally {
        loading.value = false
      }
    })

    // Normalize text for Paiute fuzzy matching - treats similar characters as equivalent
    const normalizeForMatching = (text) => {
      return text
        .toLowerCase()
        .replace(/[kg]/g, 'k')  // k/g are equivalent
        .replace(/[td]/g, 't')  // t/d are equivalent
        .replace(/[sz]/g, 's')  // s/z are equivalent
        .replace(/[üu]/g, 'u')  // ü/u are equivalent
        .replace(/w̃/g, 'w')     // w̃/w are equivalent
        .replace(/[mw]/g, 'm')  // m/w are equivalent
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
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            )
          }
        }
      }
      return matrix[str2.length][str1.length]
    }

    // Calculate Paiute word match score (higher is better)
    const calculatePaiuteScore = (word, filter) => {
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

      return 0
    }

    const handleSearch = async () => {
      const query = searchQuery.value.trim()
      if (!query) {
        return
      }

      loading.value = true
      hasSearched.value = true
      lastQuery.value = query

      try {
        const words = getWords()
        const normalizedQuery = normalizeForMatching(query)

        // 1. Search Paiute words (by word form)
        const paiuteResults = words
          .map(word => ({
            word,
            score: calculatePaiuteScore(word, normalizedQuery),
            source: 'paiute'
          }))
          .filter(item => item.score > 0)

        console.log(`🔤 Found ${paiuteResults.length} Paiute matches`)

        // 2. Search English meanings (semantic/TF-IDF)
        const tfidfResults = smartSearch(query, 40)
        let englishResults

        if (isSemanticSearchReady()) {
          console.log(`🔍 Hybrid search for "${query}"...`)
          englishResults = await hybridSearch(query, tfidfResults, { limit: 30 })
        } else {
          console.log(`🔍 TF-IDF search for "${query}"...`)
          englishResults = tfidfResults.slice(0, 30)
        }

        // Normalize English scores to 0-1000 range for comparison
        const maxEnglishScore = Math.max(...englishResults.map(r => r.score), 0.001)
        const englishScored = englishResults
          .filter(r => r.type === 'word')
          .map(r => ({
            word: words.find(w => w.id === r.id),
            score: (r.score / maxEnglishScore) * 600, // Max 600 to prioritize exact Paiute matches
            source: 'english'
          }))
          .filter(item => item.word)

        console.log(`📖 Found ${englishScored.length} English matches`)

        // 3. Merge results, keeping highest score for each word
        const scoreMap = new Map()

        for (const item of paiuteResults) {
          const existing = scoreMap.get(item.word.id)
          if (!existing || item.score > existing.score) {
            scoreMap.set(item.word.id, item)
          }
        }

        for (const item of englishScored) {
          const existing = scoreMap.get(item.word.id)
          if (!existing || item.score > existing.score) {
            scoreMap.set(item.word.id, item)
          }
        }

        // 4. Sort by score and take top results
        const merged = Array.from(scoreMap.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 20)
          .map(item => item.word)

        results.value = merged
        console.log(`Found ${results.value.length} total results`)
      } catch (error) {
        console.error('❌ Search error:', error)
      } finally {
        loading.value = false
      }
    }

    const getPrimaryForm = (word) => {
      return word.forms ? Object.values(word.forms)[0] : word.word || 'Unknown'
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
      searchQuery,
      lastQuery,
      results,
      loading,
      hasSearched,
      index,
      wordOfDay,
      handleSearch,
      getWordUrl,
      getPrimaryForm,
      getFirstDefinition
    }
  }
}
</script>

<style scoped>
.home-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  align-items: start;
}

.sidebar {
  position: sticky;
  top: 1rem;
}

.sidebar-mobile {
  display: none;
}

.main-content {
  min-width: 0;
}

@media (max-width: 968px) {
  .home-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .sidebar-mobile {
    display: block;
    margin-bottom: 2rem;
  }

  .main-content {
    order: 1;
  }
}

.search-section {
  margin-bottom: 2rem;
}

.search-section h2 {
  margin-bottom: 1rem;
  font-size: 1.75rem;
  color: var(--text-primary);
}

.search-box {
  max-width: 600px;
  margin: 0 auto;
}

.search-input-wrapper {
  display: flex;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
  font-size: 1.1rem;
  padding: 1rem;
}

.search-button {
  padding: 0 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.search-button:hover:not(:disabled) {
  background: var(--accent-secondary, var(--accent-primary));
  opacity: 0.9;
}

.search-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.results {
  margin-top: 2rem;
}

.results h3 {
  margin-bottom: 1rem;
  color: var(--text-muted);
  font-size: 1.1rem;
  font-weight: 500;
}

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
  font-size: 1rem;
}

.definition {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.4;
  font-size: 0.9rem;
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

.welcome {
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
}

.word-of-day {
  text-align: center;
}

.word-of-day h3 {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.wod-content {
  cursor: pointer;
  transition: transform 0.2s;
}

.wod-content:hover {
  transform: scale(1.02);
}

.wod-content h2 {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  color: var(--accent-primary);
  font-weight: 600;
  word-break: break-word;
}

.wod-content .definition {
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

@media (max-width: 968px) {
  .sidebar {
    margin-bottom: 1.5rem;
  }

  .word-of-day h3 {
    font-size: 1rem;
  }

  .wod-content h2 {
    font-size: 2rem;
  }

  .wod-content .definition {
    font-size: 1.1rem;
  }

  .search-input-wrapper {
    flex-direction: column;
  }

  .search-button {
    padding: 0.75rem 1.5rem;
  }
}

.welcome h2 {
  margin-bottom: 1rem;
  font-size: 2rem;
  color: var(--text-primary);
}

.intro {
  font-size: 1.1rem;
  margin-bottom: 2rem;
  color: var(--text-secondary);
}

.intro a {
  color: var(--accent-primary);
  text-decoration: underline;
}

.stats {
  margin: 2rem 0;
  display: flex;
  gap: 2rem;
  justify-content: center;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--accent-primary);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.acknowledgement {
  margin-top: 1rem;
  text-align: left;
}

.acknowledgement h3 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.acknowledgement p {
  margin-bottom: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.8;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}
</style>
